import "server-only";

import { prisma } from "@/lib/db";
import { computeJobMatch } from "@/lib/ai";
import { clamp, hiringDifficultyFromPool, percentage, round } from "./scoring";
import { getMarketIntelligence } from "./market";
import { evaluateJobQuality } from "./jobQuality";
import type {
    CandidateFit,
    EmployerIntelligenceResult,
    EmployerJobIntelligence,
    RecurringSkillGap,
    SkillDemand,
} from "./types";

export const EMPLOYER_INTELLIGENCE_MODEL_VERSION = "employer-intelligence-v2";

/** A candidate at or above this match is treated as part of the usable pool. */
const POOL_THRESHOLD = 60;

/** A candidate at or above this match is treated as a strong fit. */
const STRONG_THRESHOLD = 80;


/**
 * Deliberately spelled out rather than intersected with `StudentForScoring`:
 * an intersection of array types hides the extra per-element fields behind the
 * first member, so `skillId` and `verificationStatus` would not be reachable.
 * The shape is still structurally assignable to `StudentForScoring`, which is
 * what `computeJobMatch` needs.
 */
type CandidateStudent = {
    id: string;
    targetCareer: string;
    user: { name: string };
    skills: Array<{ skillId: string; level: number; skill: { name: string; category: string } }>;
    certifications: Array<{ certificationId: string; verificationStatus: string; certification: { name: string } }>;
    experiences: Array<{ type: string; title: string; months: number; verificationStatus: string }>;
    projects: Array<{ title: string; verificationStatus: string }>;
};

/**
 * Candidate fit for one job.
 *
 * The headline score is `computeJobMatch`, the same function that produced the
 * score the student saw before applying and that the employer's candidate list
 * already displays. Everything else here is explanation, not a second opinion,
 * so no two Fursah surfaces can rank the same applicant differently.
 *
 * Only job-related evidence is used: skills, certifications, experience and
 * verification state. No demographic, institutional-prestige or other
 * protected characteristic participates in the ranking.
 */
export function computeCandidateFit(
    student: CandidateStudent,
    job: {
        minExperience: number;
        requiredSkills: Array<{ skillId: string; weight: number; requirementType: string; skill: { name: string } }>;
        requiredCerts: Array<{ certificationId: string; certification: { name: string } }>;
    }
): CandidateFit {
    const match = computeJobMatch(student, job);

    const essential = job.requiredSkills.filter((entry) => entry.requirementType !== "PREFERRED");
    const preferred = job.requiredSkills.filter((entry) => entry.requirementType === "PREFERRED");

    const levelBySkillId = new Map(student.skills.map((entry) => [entry.skillId, entry.level]));

    function groupCoverage(requirements: typeof job.requiredSkills) {
        if (requirements.length === 0) return 100;
        let earned = 0;
        let possible = 0;
        for (const requirement of requirements) {
            const level = levelBySkillId.get(requirement.skillId) ?? 0;
            earned += Math.min(level / 5, 1) * 100 * requirement.weight;
            possible += 100 * requirement.weight;
        }
        return percentage(earned, possible);
    }

    const experienceMonths = student.experiences.reduce((sum, entry) => sum + Math.max(0, entry.months), 0);

    const verifiedExperienceMonths = student.experiences
        .filter((entry) => entry.verificationStatus === "APPROVED")
        .reduce((sum, entry) => sum + Math.max(0, entry.months), 0);

    const verifiedCertificationCount = student.certifications.filter(
        (entry) => entry.verificationStatus === "APPROVED"
    ).length;

    const evidenceItems =
        student.certifications.length + student.experiences.length + student.projects.length;

    const verifiedEvidenceItems =
        verifiedCertificationCount +
        student.experiences.filter((entry) => entry.verificationStatus === "APPROVED").length +
        student.projects.filter((entry) => entry.verificationStatus === "APPROVED").length;

    return {
        studentId: student.id,
        studentName: student.user.name,
        score: match.score,
        essentialSkillScore: groupCoverage(essential),
        preferredSkillScore: groupCoverage(preferred),
        certificationScore:
            job.requiredCerts.length > 0
                ? percentage(match.matchedCerts.length, job.requiredCerts.length)
                : 100,
        experienceScore:
            job.minExperience > 0
                ? clamp(Math.round((experienceMonths / job.minExperience) * 100))
                : 100,
        matchedSkills: match.matchedSkills,
        missingEssentialSkills: essential
            .filter((requirement) => !levelBySkillId.get(requirement.skillId))
            .map((requirement) => requirement.skill.name),
        matchedCertifications: match.matchedCerts,
        missingCertifications: match.missingCerts,
        experienceMonths,
        verifiedExperienceMonths,
        experienceGapMonths: match.experienceGapMonths,
        verifiedCertificationCount,
        evidenceItems,
        verifiedEvidenceItems,
        explanation: match.explanation,
    };
}

export async function getEmployerIntelligence(
    employerId: string
): Promise<EmployerIntelligenceResult> {
    const [employer, students, market] = await Promise.all([
        prisma.employer.findUnique({
            where: { id: employerId },
            include: {
                jobs: {
                    where: { status: "open" },
                    include: {
                        requiredSkills: { include: { skill: true } },
                        requiredCerts: { include: { certification: true } },
                        applications: { select: { studentId: true, status: true } },
                    },
                },
            },
        }),

        prisma.student.findMany({
            include: {
                user: true,
                skills: { include: { skill: true } },
                certifications: { include: { certification: true } },
                experiences: true,
                projects: true,
            },
        }),

        getMarketIntelligence(),
    ]);

    if (!employer) {
        throw new Error("Employer not found");
    }

    const generatedAt = new Date();

    const jobs: EmployerJobIntelligence[] = employer.jobs.map((job) => {
        const candidateFits = students
            .map((student) => computeCandidateFit(student, job))
            .sort((a, b) => b.score - a.score);

        const applicantIds = new Set(job.applications.map((application) => application.studentId));
        const applicantFits = candidateFits.filter((candidate) => applicantIds.has(candidate.studentId));

        const candidatePool = candidateFits.filter((candidate) => candidate.score >= POOL_THRESHOLD);
        const strongCandidates = candidateFits.filter((candidate) => candidate.score >= STRONG_THRESHOLD);

        const jobSkillIds = new Set(job.requiredSkills.map((requirement) => requirement.skillId));

        const scarceSkills: SkillDemand[] = market.skills
            .filter((skill) => jobSkillIds.has(skill.id))
            .filter((skill) => {
                const studentsWithSkill = students.filter((student) =>
                    student.skills.some((item) => item.skillId === skill.id && item.level >= 3)
                ).length;
                return studentsWithSkill < Math.max(3, skill.openRoleCount);
            });

        // Which requirements applicants most often fail to evidence: the signal
        // a university or a training partner can actually act on.
        const gapCounts = new Map<string, number>();
        for (const candidate of applicantFits) {
            for (const skill of new Set(candidate.missingEssentialSkills)) {
                gapCounts.set(skill, (gapCounts.get(skill) ?? 0) + 1);
            }
        }

        const recurringGaps: RecurringSkillGap[] = [...gapCounts.entries()]
            .map(([skillName, applicantCount]) => ({
                skillName,
                applicantCount,
                sharePct: applicantFits.length > 0 ? round((applicantCount / applicantFits.length) * 100, 0) : 0,
            }))
            .sort((a, b) => b.applicantCount - a.applicantCount);

        const quality = evaluateJobQuality(job);

        const insights: string[] = [];

        if (strongCandidates.length === 0) {
            insights.push(
                "No current student profile scores 80% or above against this role's structured requirements."
            );
        } else {
            insights.push(
                `${strongCandidates.length} student profile(s) score at least 80% against the structured requirements.`
            );
        }

        if (applicantFits.length > 0 && recurringGaps.length > 0) {
            insights.push(
                `${recurringGaps[0].skillName} is unevidenced by ${recurringGaps[0].applicantCount} of ${applicantFits.length} applicant(s).`
            );
        }

        if (scarceSkills.length > 0) {
            insights.push(
                `${scarceSkills[0].name} is relatively scarce in the current Fursah student pool compared with how often roles request it.`
            );
        }

        return {
            jobId: job.id,
            jobTitle: job.title,
            quality,
            candidatePoolSize: candidatePool.length,
            strongCandidateCount: strongCandidates.length,
            applicantCount: applicantFits.length,
            hiringDifficulty: hiringDifficultyFromPool(strongCandidates.length),
            candidateFits,
            applicantFits,
            recurringGaps,
            scarceSkills,
            insights,
        };
    });

    const relevantSkillIds = new Set(
        employer.jobs.flatMap((job) => job.requiredSkills.map((requirement) => requirement.skillId))
    );

    const topDemandedSkills = market.skills
        .filter((skill) => relevantSkillIds.has(skill.id))
        .slice(0, 10);

    const totalCandidatePool = new Set(
        jobs.flatMap((job) =>
            job.candidateFits
                .filter((candidate) => candidate.score >= POOL_THRESHOLD)
                .map((candidate) => candidate.studentId)
        )
    ).size;

    // Recurring gaps rolled up across every open role of this employer.
    const employerGapCounts = new Map<string, number>();
    let totalApplicants = 0;

    for (const job of jobs) {
        totalApplicants += job.applicantCount;
        for (const gap of job.recurringGaps) {
            employerGapCounts.set(gap.skillName, (employerGapCounts.get(gap.skillName) ?? 0) + gap.applicantCount);
        }
    }

    const recurringGaps: RecurringSkillGap[] = [...employerGapCounts.entries()]
        .map(([skillName, applicantCount]) => ({
            skillName,
            applicantCount,
            sharePct: totalApplicants > 0 ? round((applicantCount / totalApplicants) * 100, 0) : 0,
        }))
        .sort((a, b) => b.applicantCount - a.applicantCount);

    return {
        employerId: employer.id,
        modelVersion: EMPLOYER_INTELLIGENCE_MODEL_VERSION,
        generatedAt,
        openJobCount: employer.jobs.length,
        totalCandidatePool,
        studentPoolSize: students.length,
        jobs,
        topDemandedSkills,
        recurringGaps,
    };
}

/** Talent availability for a role that has not been created yet. */
export async function getTalentAvailability(input: {
    careerTrackId?: string | null;
    skillNames?: string[];
}) {
    const [students, tracks] = await Promise.all([
        prisma.student.findMany({
            select: {
                id: true,
                targetCareer: true,
                skills: { select: { level: true, skill: { select: { name: true } } } },
            },
        }),
        input.careerTrackId
            ? prisma.careerTrack.findUnique({
                where: { id: input.careerTrackId },
                select: { id: true, label: true },
            })
            : Promise.resolve(null),
    ]);

    const wanted = (input.skillNames ?? []).map((name) => name.trim().toLowerCase()).filter(Boolean);

    const targetingTrack = input.careerTrackId
        ? students.filter((student) => student.targetCareer === input.careerTrackId).length
        : 0;

    const withEverySkill =
        wanted.length > 0
            ? students.filter((student) =>
                wanted.every((name) =>
                    student.skills.some((entry) => entry.skill.name.toLowerCase() === name && entry.level >= 3)
                )
            ).length
            : null;

    return {
        studentPoolSize: students.length,
        careerTrackId: tracks?.id ?? null,
        careerTrackLabel: tracks?.label ?? null,
        studentsTargetingTrack: targetingTrack,
        studentsWithEveryRequestedSkill: withEverySkill,
        requestedSkills: input.skillNames ?? [],
    };
}
