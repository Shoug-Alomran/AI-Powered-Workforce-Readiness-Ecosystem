import "server-only";

import { prisma } from "@/lib/db";
import { computeCohortReadiness, MIN_COHORT, type CohortReadiness } from "@/lib/cohort";
import { getAllCareerTracksAsync } from "@/lib/careerTracks.server";
import { getEcosystemIntelligence } from "./ecosystem";
import { normalizeSkillName, round } from "./scoring";
import { READINESS_MODEL_VERSION } from "./readiness";
import type {
    UniversityGap,
    UniversityIntelligenceResult,
    UniversityRecommendation,
    UniversitySkillCoverage,
} from "./types";

export const UNIVERSITY_INTELLIGENCE_MODEL_VERSION = `university-intelligence-v2+${READINESS_MODEL_VERSION}`;

/**
 * University-side intelligence.
 *
 * Three inputs are compared, in this order: what employers currently request,
 * what this institution's cohort has evidenced, and what the institution
 * teaches. A recommendation is only produced where the database supports the
 * claim, and every recommendation carries the counts it was derived from so a
 * curriculum committee can check the reasoning rather than trust a number.
 *
 * Cohort figures are aggregate-only and suppressed below `MIN_COHORT`, so no
 * individual student is identifiable from this surface.
 */
export async function getUniversityIntelligence(
    universityId: string
): Promise<UniversityIntelligenceResult> {
    const [university, ecosystem, tracks, cohortStudents] = await Promise.all([
        prisma.university.findUnique({
            where: { id: universityId },
            include: {
                offerings: {
                    include: { skills: { include: { skill: true } }, certification: true },
                },
                curriculumActions: true,
            },
        }),

        getEcosystemIntelligence(),

        getAllCareerTracksAsync(),

        prisma.student.findMany({
            select: {
                targetCareer: true,
                university: true,
                skills: { include: { skill: true } },
                certifications: { include: { certification: true } },
                experiences: true,
                projects: true,
            },
        }),
    ]);

    if (!university) {
        throw new Error("University not found");
    }

    const generatedAt = new Date();

    const cohort: CohortReadiness = computeCohortReadiness({
        students: cohortStudents,
        tracks,
        institution: university.institution,
    });

    const cohortGapByName = new Map(cohort.gaps.map((gap) => [normalizeSkillName(gap.name), gap]));

    /**
     * Reads one statistic off a cohort gap, preserving the difference between
     * "withheld" (null) and "none" (0). A gap group below MIN_COHORT is
     * suppressed inside computeCohortReadiness and carries null statistics.
     */
    function cohortMissingStat(
        reportable: boolean,
        gap: { students: number | null; sharePct: number | null; suppressed: boolean } | null,
        field: "students" | "sharePct",
    ): number | null {
        if (!reportable) return null;
        if (!gap) return 0;
        if (gap.suppressed) return null;
        return gap[field];
    }

    // ---- Coverage ----------------------------------------------------------

    const offeringsBySkillId = new Map<string, Array<{ id: string; title: string }>>();
    const offeringsBySkillName = new Map<string, Array<{ id: string; title: string }>>();

    for (const offering of university.offerings) {
        for (const relation of offering.skills) {
            const entry = { id: offering.id, title: offering.title };

            offeringsBySkillId.set(relation.skillId, [
                ...(offeringsBySkillId.get(relation.skillId) ?? []),
                entry,
            ]);

            const nameKey = normalizeSkillName(relation.skill.name);
            offeringsBySkillName.set(nameKey, [...(offeringsBySkillName.get(nameKey) ?? []), entry]);
        }
    }

    const coveredSkills: UniversitySkillCoverage[] = ecosystem.skills.map((demand) => {
        const offerings =
            offeringsBySkillId.get(demand.id) ?? offeringsBySkillName.get(normalizeSkillName(demand.name)) ?? [];

        const cohortGap = cohortGapByName.get(normalizeSkillName(demand.name)) ?? null;

        return {
            skillId: demand.id,
            skillName: demand.name,
            demandPoints: demand.demandPoints,
            openRoleCount: demand.openRoleCount,
            covered: offerings.length > 0,
            offeringIds: offerings.map((offering) => offering.id),
            offeringTitles: offerings.map((offering) => offering.title),
            studentsWithSkill: demand.studentsWithSkill,
            // Three distinct states, and collapsing any two of them would
            // misreport: null means withheld (either the whole cohort is below
            // the floor, or this particular gap group is), while 0 means the
            // figure is reportable and genuinely nobody has this gap. The old
            // `?? 0` turned a withheld group into a confident zero.
            cohortMissingCount: cohortMissingStat(cohort.reportable, cohortGap, "students"),
            cohortMissingSharePct: cohortMissingStat(cohort.reportable, cohortGap, "sharePct"),
        };
    });

    const coveredDemandPoints = coveredSkills
        .filter((skill) => skill.covered)
        .reduce((sum, skill) => sum + skill.demandPoints, 0);

    const weightedDemandCoverage =
        ecosystem.totalDemandPoints > 0
            ? round((coveredDemandPoints / ecosystem.totalDemandPoints) * 100, 1)
            : 0;

    // ---- Gaps --------------------------------------------------------------
    // Priority combines employer demand with how much of this institution's own
    // cohort is short of the skill, so a widely-missing skill outranks a rarely
    // requested one even when both are untaught.

    const gaps: UniversityGap[] = coveredSkills
        .filter((skill) => !skill.covered)
        .map((skill) => ({
            ...skill,
            priorityScore: round(
                skill.demandPoints * 10 + skill.openRoleCount * 5 + (skill.cohortMissingSharePct ?? 0) * 0.5,
                1
            ),
        }))
        .sort((a, b) => b.priorityScore - a.priorityScore);

    // A skill employers request, the cohort has not evidenced, and no offering
    // teaches: the strongest available case for curriculum change.
    const compoundedGaps = gaps.filter((gap) => (gap.cohortMissingCount ?? 0) > 0);

    // ---- Recommendations ---------------------------------------------------

    const existingActionSubjects = new Set(
        university.curriculumActions
            .map((action) => action.skill)
            .filter((value): value is string => Boolean(value))
            .flatMap((value) => value.split("·").map((part) => normalizeSkillName(part)))
    );

    const recommendations: UniversityRecommendation[] = [];

    for (const gap of gaps.slice(0, 8)) {
        const alreadyPlanned = existingActionSubjects.has(normalizeSkillName(gap.skillName));

        recommendations.push({
            type: "ADD_OFFERING",
            skillId: gap.skillId,
            skillName: gap.skillName,
            priorityScore: gap.priorityScore,
            relatedOpenRoles: gap.openRoleCount,
            cohortMissingSharePct: gap.cohortMissingSharePct,
            alreadyPlanned,
            reason:
                `${gap.skillName} appears in ${gap.openRoleCount} open role(s) and is not mapped to any offering in this catalogue` +
                (gap.cohortMissingSharePct !== null && gap.cohortMissingSharePct > 0
                    ? `, while ${gap.cohortMissingSharePct}% of this institution's reported cohort has not evidenced it.`
                    : gap.cohortMissingSharePct === 0
                        ? ", and no cohort member currently records it as a gap for their target career."
                        : `. The cohort figure is withheld: fewer than ${MIN_COHORT} students fall in that reporting group, so student-side impact cannot be reported without identifying them.`) +
                (alreadyPlanned ? " A curriculum initiative already references this skill." : ""),
        });
    }

    // Offerings teaching only skills no open role requests are worth a review,
    // but the platform never claims a course has no value: it reports the fact.
    for (const offering of university.offerings) {
        if (offering.skills.length === 0) continue;

        const requested = offering.skills.filter((relation) =>
            ecosystem.skills.some(
                (skill) =>
                    skill.id === relation.skillId ||
                    normalizeSkillName(skill.name) === normalizeSkillName(relation.skill.name)
            )
        );

        if (requested.length === 0) {
            recommendations.push({
                type: "REVIEW_CURRICULUM",
                skillId: offering.skills[0].skillId,
                skillName: offering.title,
                priorityScore: 10,
                relatedOpenRoles: 0,
                cohortMissingSharePct: null,
                alreadyPlanned: false,
                reason: `None of the ${offering.skills.length} skill(s) mapped to "${offering.title}" appear in any currently open role. This does not mean the offering lacks value, only that current employer demand does not evidence it.`,
            });
        }
    }

    // Certifications employers ask for that this institution does not grant.
    for (const certification of ecosystem.certifications.slice(0, 5)) {
        const grantedHere = university.offerings.some(
            (offering) => offering.certificationId === certification.certificationId
        );

        if (!grantedHere && certification.openRoleCount > 0) {
            recommendations.push({
                type: "EXPAND_OFFERING",
                skillId: certification.certificationId,
                skillName: certification.name,
                priorityScore: round(certification.openRoleCount * 8, 1),
                relatedOpenRoles: certification.openRoleCount,
                cohortMissingSharePct: null,
                alreadyPlanned: false,
                reason: `${certification.name} is required by ${certification.openRoleCount} open role(s); ${certification.verifiedHolders} student(s) platform-wide hold it with human-verified evidence, and no offering in this catalogue grants it.`,
            });
        }
    }

    recommendations.sort((a, b) => b.priorityScore - a.priorityScore);

    const largestGap = gaps[0] ?? null;

    const executiveSummary: string[] = [];

    if (ecosystem.openRoleCount === 0) {
        executiveSummary.push(
            "There are currently no open employer roles with which to calculate curriculum-demand alignment."
        );
    } else {
        executiveSummary.push(
            `Current offerings cover ${weightedDemandCoverage}% of weighted skill demand across ${ecosystem.openRoleCount} open role(s).`
        );
    }

    executiveSummary.push(cohort.reportable ? cohort.summary : cohort.summary || "Cohort readiness is not reportable yet.");

    if (compoundedGaps.length > 0) {
        const lead = compoundedGaps[0];
        executiveSummary.push(
            `${lead.skillName} is requested by ${lead.openRoleCount} open role(s), missing for ${lead.cohortMissingSharePct}% of the reported cohort, and untaught in this catalogue.`
        );
    } else if (largestGap) {
        executiveSummary.push(
            `${largestGap.skillName} is the highest-priority uncovered skill and appears in ${largestGap.openRoleCount} open role(s).`
        );
    } else if (ecosystem.skills.length > 0) {
        executiveSummary.push("Every currently requested market skill is mapped to at least one offering.");
    }

    return {
        universityId: university.id,
        institution: university.institution,
        modelVersion: UNIVERSITY_INTELLIGENCE_MODEL_VERSION,
        generatedAt,
        openRoleCount: ecosystem.openRoleCount,
        requestedSkillCount: ecosystem.skills.length,
        offeringCount: university.offerings.length,
        weightedDemandCoverage,
        coveredSkills,
        gaps,
        compoundedGaps,
        recommendations,
        largestGap,
        cohort,
        curriculumActionCount: university.curriculumActions.length,
        completedCurriculumActionCount: university.curriculumActions.filter(
            (action) => action.status === "COMPLETED"
        ).length,
        executiveSummary,
    };
}
