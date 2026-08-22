import "server-only";

import { prisma } from "@/lib/db";
import { computeCareerReadiness, isScoredEvidence, READINESS_MODEL_VERSION, type ReadinessEvidenceInput } from "./readiness";
import { getMarketIntelligence } from "./market";
import { normalizeSkillName, round } from "./scoring";
import type { EcosystemIntelligenceResult, EcosystemSkillSignal } from "./types";

export const ECOSYSTEM_INTELLIGENCE_MODEL_VERSION = `ecosystem-intelligence-v1+${READINESS_MODEL_VERSION}`;

/**
 * Below this many scored profiles the platform-wide readiness average is
 * withheld rather than published: a handful of profiles does not describe an
 * ecosystem, and reporting it as though it did would be the invented-trend
 * failure the platform is explicitly built to avoid.
 */
export const MIN_ECOSYSTEM_SAMPLE = 5;

/** A student is treated as supplying a skill at this level or above. */
const SUPPLY_LEVEL = 3;

/**
 * Shared ecosystem intelligence.
 *
 * Everything returned here is a count or a ratio over rows that exist right
 * now. There is deliberately no trend, forecast, or growth figure: the schema
 * keeps no historical snapshots of demand, so "rising" or "declining" could
 * only ever be invented. Callers that want to describe change over time need
 * a time series first.
 */
export async function getEcosystemIntelligence(): Promise<EcosystemIntelligenceResult> {
    // This stamps the result with `new Date()` below. It used to call
    // `connection()` here so the unstable value could never be reached during a
    // prerender, but that made the function unusable inside `use cache` — and
    // the workforce-intelligence page needs exactly that, because recomputing
    // these ecosystem-wide counts per request was the slowest route on the site.
    //
    // The stamp is now the caller's concern. Every other caller reads the
    // session first, which already makes it dynamic; the cached caller wants
    // the stamp to be the cache build time, which is what it now gets and what
    // that page prints.

    const [market, students, tracks, offerings, jobs, employerCount, feedbackCount, applications] =
        await Promise.all([
            getMarketIntelligence(),

            prisma.student.findMany({
                include: {
                    skills: { include: { skill: true } },
                    certifications: { include: { certification: true } },
                    experiences: true,
                    projects: true,
                },
            }),

            prisma.careerTrack.findMany({
                include: {
                    trackSkills: { include: { skill: true } },
                    trackCerts: { include: { certification: true } },
                },
            }),

            prisma.offering.findMany({
                include: { skills: true, certification: true, university: true },
            }),

            prisma.job.findMany({
                // Same set of roles the demand scan uses; see market.ts.
                where: { status: "open", employer: { verificationStatus: "APPROVED" } },
                include: {
                    requiredSkills: { include: { skill: true } },
                    requiredCerts: { include: { certification: true } },
                    applications: { select: { id: true, status: true } },
                },
            }),

            prisma.employer.count({ where: { verificationStatus: "APPROVED" } }),
            prisma.feedback.count(),
            prisma.application.findMany({ select: { status: true } }),
        ]);

    const generatedAt = new Date();

    // ---- Supply per skill ---------------------------------------------------

    const supplyBySkillId = new Map<string, number>();
    for (const student of students) {
        for (const entry of student.skills) {
            if (entry.level >= SUPPLY_LEVEL) {
                supplyBySkillId.set(entry.skillId, (supplyBySkillId.get(entry.skillId) ?? 0) + 1);
            }
        }
    }

    const offeringSkillIds = new Set(offerings.flatMap((offering) => offering.skills.map((entry) => entry.skillId)));

    const universitiesBySkillId = new Map<string, Set<string>>();
    for (const offering of offerings) {
        for (const entry of offering.skills) {
            const existing = universitiesBySkillId.get(entry.skillId) ?? new Set<string>();
            existing.add(offering.university.institution);
            universitiesBySkillId.set(entry.skillId, existing);
        }
    }

    const skills: EcosystemSkillSignal[] = market.skills.map((skill) => {
        const supply = supplyBySkillId.get(skill.id) ?? 0;

        return {
            ...skill,
            studentsWithSkill: supply,
            supplyPerOpenRole: skill.openRoleCount > 0 ? round(supply / skill.openRoleCount, 2) : null,
            taughtByUniversity: offeringSkillIds.has(skill.id),
            teachingInstitutions: [...(universitiesBySkillId.get(skill.id) ?? new Set<string>())],
        };
    });

    // ---- Readiness across the platform -------------------------------------

    const trackById = new Map(tracks.map((track) => [track.id, track]));

    const scored = students
        .map((student) => {
            const track = trackById.get(student.targetCareer);
            if (!track) return null;

            const evidence: ReadinessEvidenceInput = {
                skills: student.skills.map((entry) => ({
                    skillId: entry.skillId,
                    name: entry.skill.name,
                    level: entry.level,
                })),
                certifications: student.certifications.map((entry) => ({
                    certificationId: entry.certificationId,
                    name: entry.certification.name,
                    verified: entry.verificationStatus === "APPROVED",
                })),
                // Same evidence-trust rule as every other surface; the
                // platform-wide average must mean what a student's own score
                // means.
                experienceMonths: student.experiences
                    .filter((entry) => isScoredEvidence(entry.verificationStatus))
                    .reduce((sum, entry) => sum + Math.max(0, entry.months), 0),
                projectCount: student.projects.filter((entry) => isScoredEvidence(entry.verificationStatus)).length,
                unverifiedExperienceMonths: student.experiences
                    .filter((entry) => !isScoredEvidence(entry.verificationStatus) && entry.verificationStatus !== "REJECTED")
                    .reduce((sum, entry) => sum + Math.max(0, entry.months), 0),
                unverifiedProjectCount: student.projects.filter(
                    (entry) => !isScoredEvidence(entry.verificationStatus) && entry.verificationStatus !== "REJECTED",
                ).length,
            };

            const result = computeCareerReadiness(evidence, {
                id: track.id,
                label: track.label,
                recommendedExperienceMonths: track.recommendedExperienceMonths,
                skills: track.trackSkills.map((entry) => ({
                    skillId: entry.skillId,
                    name: entry.skill.name,
                    category: entry.category || entry.skill.category,
                    weight: entry.weight,
                })),
                certifications: track.trackCerts.map((entry) => ({
                    certificationId: entry.certificationId,
                    name: entry.certification.name,
                })),
            });

            return { trackId: track.id, trackLabel: track.label, score: result.score };
        })
        .filter((entry): entry is { trackId: string; trackLabel: string; score: number } => entry !== null);

    const scoredCount = scored.length;
    const readinessReportable = scoredCount >= MIN_ECOSYSTEM_SAMPLE;

    const averageReadiness = readinessReportable
        ? Math.round(scored.reduce((sum, entry) => sum + entry.score, 0) / scoredCount)
        : null;

    // ---- Career-track demand and supply ------------------------------------

    const careerTracks = tracks
        .map((track) => {
            const trackSkillIds = new Set(track.trackSkills.map((entry) => entry.skillId));

            const openRoleCount = jobs.filter((job) => job.careerTrack === track.id).length;

            const relatedDemandPoints = market.skills
                .filter((skill) => trackSkillIds.has(skill.id))
                .reduce((sum, skill) => sum + skill.demandPoints, 0);

            const trackScores = scored.filter((entry) => entry.trackId === track.id);

            return {
                careerTrackId: track.id,
                careerTrackLabel: track.label,
                openRoleCount,
                demandPoints: round(relatedDemandPoints, 2),
                studentsTargeting: trackScores.length,
                averageReadiness:
                    trackScores.length >= MIN_ECOSYSTEM_SAMPLE
                        ? Math.round(trackScores.reduce((sum, entry) => sum + entry.score, 0) / trackScores.length)
                        : null,
            };
        })
        .sort((a, b) => b.demandPoints - a.demandPoints || b.openRoleCount - a.openRoleCount);

    // ---- Certification demand ----------------------------------------------

    const certificationDemandMap = new Map<
        string,
        { certificationId: string; name: string; openRoleCount: number }
    >();

    for (const job of jobs) {
        for (const requirement of job.requiredCerts) {
            const existing = certificationDemandMap.get(requirement.certificationId) ?? {
                certificationId: requirement.certificationId,
                name: requirement.certification.name,
                openRoleCount: 0,
            };
            existing.openRoleCount += 1;
            certificationDemandMap.set(requirement.certificationId, existing);
        }
    }

    const verifiedCertificationHolders = new Map<string, number>();
    for (const student of students) {
        for (const held of student.certifications) {
            if (held.verificationStatus === "APPROVED") {
                verifiedCertificationHolders.set(
                    held.certificationId,
                    (verifiedCertificationHolders.get(held.certificationId) ?? 0) + 1
                );
            }
        }
    }

    const offeredCertificationIds = new Set(
        offerings.map((offering) => offering.certificationId).filter((value): value is string => Boolean(value))
    );

    const certifications = [...certificationDemandMap.values()]
        .map((entry) => ({
            ...entry,
            verifiedHolders: verifiedCertificationHolders.get(entry.certificationId) ?? 0,
            offeredByUniversity: offeredCertificationIds.has(entry.certificationId),
        }))
        .sort((a, b) => b.openRoleCount - a.openRoleCount);

    // ---- Roles that the current talent pool cannot fill --------------------

    const hardToFillRoles = jobs
        .map((job) => {
            const essentialSkillIds = job.requiredSkills
                .filter((requirement) => requirement.requirementType !== "PREFERRED")
                .map((requirement) => requirement.skillId);

            const qualifiedStudents =
                essentialSkillIds.length === 0
                    ? students.length
                    : students.filter((student) =>
                        essentialSkillIds.every((skillId) =>
                            student.skills.some((entry) => entry.skillId === skillId && entry.level >= SUPPLY_LEVEL)
                        )
                    ).length;

            return {
                jobId: job.id,
                jobTitle: job.title,
                careerTrack: job.careerTrack,
                essentialSkillCount: essentialSkillIds.length,
                qualifiedStudents,
                applicationCount: job.applications.length,
            };
        })
        .filter((entry) => entry.essentialSkillCount > 0)
        .sort((a, b) => a.qualifiedStudents - b.qualifiedStudents || b.essentialSkillCount - a.essentialSkillCount);

    // ---- Coverage gaps -----------------------------------------------------

    const coverageGaps = skills
        .filter((skill) => !skill.taughtByUniversity)
        .sort((a, b) => b.demandPoints - a.demandPoints);

    const supplyGaps = skills
        .filter((skill) => skill.openRoleCount > 0 && skill.studentsWithSkill < skill.openRoleCount)
        .sort((a, b) => b.demandPoints - a.demandPoints);

    const taughtDemandPoints = skills
        .filter((skill) => skill.taughtByUniversity)
        .reduce((sum, skill) => sum + skill.demandPoints, 0);

    const universityCoveragePct =
        market.totalDemandPoints > 0 ? round((taughtDemandPoints / market.totalDemandPoints) * 100, 1) : null;

    const summary: string[] = [];

    if (market.openRoleCount === 0) {
        summary.push("No employer role is currently open, so demand-side signals cannot be calculated.");
    } else {
        summary.push(
            `${market.openRoleCount} open role(s) from ${employerCount} verified employer(s) currently request ${market.skills.length} distinct skill(s).`
        );
    }

    if (universityCoveragePct !== null) {
        summary.push(
            `University offerings on the platform cover ${universityCoveragePct}% of weighted skill demand.`
        );
    }

    if (readinessReportable) {
        summary.push(
            `${scoredCount} student profile(s) are scored against a configured career track, averaging ${averageReadiness}/100 readiness.`
        );
    } else {
        summary.push(
            `Only ${scoredCount} student profile(s) are scored against a configured career track; readiness averages are withheld below ${MIN_ECOSYSTEM_SAMPLE}.`
        );
    }

    if (supplyGaps.length > 0) {
        summary.push(
            `${supplyGaps[0].name} shows the widest supply gap: ${supplyGaps[0].studentsWithSkill} student(s) evidence it against ${supplyGaps[0].openRoleCount} requesting role(s).`
        );
    }

    return {
        modelVersion: ECOSYSTEM_INTELLIGENCE_MODEL_VERSION,
        generatedAt,
        openRoleCount: market.openRoleCount,
        employerCount,
        studentCount: students.length,
        scoredStudentCount: scoredCount,
        readinessReportable,
        averageReadiness,
        totalDemandPoints: market.totalDemandPoints,
        universityCoveragePct,
        offeringCount: offerings.length,
        feedbackCount,
        applicationCount: applications.length,
        placementCount: applications.filter((application) => ["shortlisted", "hired"].includes(application.status)).length,
        skills,
        coverageGaps,
        supplyGaps,
        careerTracks,
        certifications,
        hardToFillRoles,
        summary,
    };
}

/** Case-insensitive skill lookup helper shared by the university surfaces. */
export function findSkillSignal(skills: EcosystemSkillSignal[], name: string) {
    const key = normalizeSkillName(name);
    return skills.find((skill) => normalizeSkillName(skill.name) === key) ?? null;
}
