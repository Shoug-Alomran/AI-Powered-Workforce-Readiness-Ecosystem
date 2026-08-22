import "server-only";

import { prisma } from "@/lib/db";
import {
    clamp,
    normalizeCareerTrackId,
    normalizeSkillName,
    round,
    weightedAverage,
} from "./scoring";
import {
    computeCareerReadiness,
    READINESS_MODEL_VERSION,
    type ReadinessEvidenceInput,
    type ReadinessTrackInput,
} from "./readiness";
import { getMarketIntelligence } from "./market";
import type {
    CareerDirectionSuggestion,
    CareerInterestResult,
    CareerRecommendation,
    InterestSignal,
    RoadmapRecommendation,
    SkillGap,
    StudentIntelligenceResult,
    StudentReadinessResult,
} from "./types";

/**
 * A career-direction suggestion is deliberately conservative. Losing interest
 * is inferred from several independent behaviours, never from one unfinished
 * recommendation, and the suggestion is only ever an offer: the student's
 * target career is never changed by the system.
 */
const MIN_DIRECTION_EVIDENCE = 2;
const MIN_DIRECTION_SIGNAL_TYPES = 2;
const MIN_DIRECTION_ADVANTAGE = 15;
const DIRECTION_DISMISSAL_ACTION = "CAREER_SUGGESTION_DISMISSED";
const DIRECTION_DISMISSAL_DAYS = 60;

export const STUDENT_INTELLIGENCE_MODEL_VERSION = `student-intelligence-v2+${READINESS_MODEL_VERSION}`;

type TrackRow = {
    id: string;
    label: string;
    recommendedExperienceMonths: number;
    trackSkills: Array<{
        skillId: string;
        weight: number;
        category: string;
        skill: { id: string; name: string; category: string };
    }>;
    trackCerts: Array<{
        certificationId: string;
        certification: { id: string; name: string };
    }>;
};

function toTrackInput(track: TrackRow): ReadinessTrackInput {
    return {
        id: track.id,
        label: track.label,
        recommendedExperienceMonths: track.recommendedExperienceMonths,
        skills: track.trackSkills.map((entry) => ({
            skillId: entry.skillId,
            name: entry.skill.name,
            // The join row carries the category the track assigned; fall back
            // to the catalogue skill's own category when it is not set.
            category: entry.category || entry.skill.category,
            weight: entry.weight,
        })),
        certifications: track.trackCerts.map((entry) => ({
            certificationId: entry.certificationId,
            name: entry.certification.name,
        })),
    };
}

export async function getStudentIntelligence(
    studentId: string
): Promise<StudentIntelligenceResult> {
    const [student, tracks, market, offerings] = await Promise.all([
        prisma.student.findUnique({
            where: { id: studentId },
            include: {
                user: true,
                skills: { include: { skill: true } },
                certifications: { include: { certification: true } },
                experiences: true,
                projects: true,
                applications: { include: { job: true } },
                bookmarks: { include: { job: true } },
                favoriteCompanies: {
                    include: {
                        employer: {
                            include: { jobs: { where: { status: "open" } } },
                        },
                    },
                },
                favoriteCareerTracks: true,
                roadmapItems: true,
            },
        }),

        prisma.careerTrack.findMany({
            include: {
                trackSkills: { include: { skill: true } },
                trackCerts: { include: { certification: true } },
            },
        }),

        getMarketIntelligence(),

        prisma.offering.findMany({
            include: {
                skills: { include: { skill: true } },
                certification: true,
                university: true,
            },
        }),
    ]);

    if (!student) {
        throw new Error("Student not found");
    }

    // Dismissed direction suggestions are recorded as audit events rather than
    // silently forgotten, so the student stays in control of what Fursah keeps
    // proposing without needing a dedicated table.
    const dismissedDirections = await prisma.auditEvent.findMany({
        where: {
            actorUserId: student.userId,
            action: DIRECTION_DISMISSAL_ACTION,
            createdAt: {
                gte: new Date(Date.now() - DIRECTION_DISMISSAL_DAYS * 86400000),
            },
        },
        select: { entityId: true },
    });

    const dismissedTrackIds = new Set(
        dismissedDirections
            .map((event) => event.entityId)
            .filter((value): value is string => Boolean(value))
    );

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
        experienceMonths: student.experiences.reduce(
            (sum, entry) => sum + Math.max(0, entry.months),
            0
        ),
        projectCount: student.projects.length,
    };

    const demandBySkillId = new Map(market.skills.map((skill) => [skill.id, skill]));
    const demandBySkillName = new Map(
        market.skills.map((skill) => [normalizeSkillName(skill.name), skill])
    );

    function demandFor(skillId: string | null, skillName: string) {
        return (
            (skillId ? demandBySkillId.get(skillId) : undefined) ??
            demandBySkillName.get(normalizeSkillName(skillName)) ??
            null
        );
    }

    const readinessResults: StudentReadinessResult[] = tracks.map((track) => {
        const core = computeCareerReadiness(evidence, toTrackInput(track as TrackRow));

        const missingSkills: SkillGap[] = core.missingSkills.map((gap) => {
            const demand = demandFor(gap.skillId, gap.name);
            const levelGap = Math.max(0, gap.expectedLevel - gap.currentLevel);

            return {
                skillId: gap.skillId ?? gap.name,
                skillName: gap.name,
                category: gap.category,
                requiredWeight: gap.requiredWeight,
                currentLevel: gap.currentLevel,
                gap: levelGap,
                demandPoints: demand?.demandPoints ?? 0,
                openRoleCount: demand?.openRoleCount ?? 0,
                priorityScore: round(
                    levelGap * 20 + gap.requiredWeight * 10 + (demand?.demandPoints ?? 0) * 5,
                    1
                ),
            };
        });

        return {
            studentId: student.id,
            careerTrackId: track.id,
            careerTrackLabel: track.label,
            score: core.score,
            skillScore: core.skillScore,
            certificationScore: core.certificationScore,
            experienceScore: core.experienceScore,
            portfolioScore: core.portfolioScore,
            components: core.components.map((component) => ({
                name: component.name,
                earned: component.earned,
                possible: component.possible,
                percentage: component.percentage,
                weight: component.weight,
                detail: component.detail,
                applicable: component.applicable,
            })),
            matchedSkills: core.matchedSkills.map((entry) => ({
                id: entry.skillId ?? entry.name,
                name: entry.name,
                category: entry.category,
                weight: entry.requiredWeight,
            })),
            missingSkills: missingSkills.sort((a, b) => b.priorityScore - a.priorityScore),
            matchedCertifications: core.matchedCertifications.map((entry) => entry.name),
            missingCertifications: core.missingCertifications.map((entry) => entry.name),
            unverifiedCertifications: core.unverifiedCertifications,
            experienceMonths: core.experienceMonths,
            recommendedExperienceMonths: core.recommendedExperienceMonths,
            projectCount: core.projectCount,
            modelVersion: READINESS_MODEL_VERSION,
            explanation: core.explanation,
        };
    });

    const readinessByTrack = new Map(
        readinessResults.map((result) => [result.careerTrackId, result])
    );

    // ---- Interest signals --------------------------------------------------

    const interestProfiles: CareerInterestResult[] = tracks.map((track) => {
        const signals: InterestSignal[] = [];
        const targetKey = normalizeCareerTrackId(student.targetCareer);

        if (
            targetKey === normalizeCareerTrackId(track.id) ||
            targetKey === normalizeCareerTrackId(track.label)
        ) {
            signals.push({
                type: "TARGET_CAREER",
                careerTrackId: track.id,
                value: 30,
                reason: "This is the student's declared target career.",
            });
        }

        if (student.favoriteCareerTracks.some((favorite) => favorite.careerTrackId === track.id)) {
            signals.push({
                type: "FAVORITE_TRACK",
                careerTrackId: track.id,
                value: 25,
                reason: "The student follows this career track.",
            });
        }

        const relatedApplications = student.applications.filter(
            (application) =>
                normalizeCareerTrackId(application.job.careerTrack) ===
                normalizeCareerTrackId(track.id)
        );

        if (relatedApplications.length > 0) {
            signals.push({
                type: "JOB_APPLICATION",
                careerTrackId: track.id,
                value: Math.min(30, relatedApplications.length * 10),
                reason: `The student applied to ${relatedApplications.length} related job(s).`,
            });
        }

        const relatedBookmarks = student.bookmarks.filter(
            (bookmark) =>
                normalizeCareerTrackId(bookmark.job.careerTrack) ===
                normalizeCareerTrackId(track.id)
        );

        if (relatedBookmarks.length > 0) {
            signals.push({
                type: "BOOKMARKED_JOB",
                careerTrackId: track.id,
                value: Math.min(15, relatedBookmarks.length * 5),
                reason: `The student bookmarked ${relatedBookmarks.length} related job(s).`,
            });
        }

        const relatedFollowedCompanyJobs = student.favoriteCompanies
            .flatMap((favorite) => favorite.employer.jobs)
            .filter(
                (job) =>
                    normalizeCareerTrackId(job.careerTrack) === normalizeCareerTrackId(track.id)
            );

        if (relatedFollowedCompanyJobs.length > 0) {
            signals.push({
                type: "FAVORITE_COMPANY",
                careerTrackId: track.id,
                value: Math.min(10, relatedFollowedCompanyJobs.length * 2),
                reason: "A followed company currently has roles related to this career.",
            });
        }

        for (const item of student.roadmapItems.filter((entry) => entry.careerTrackId === track.id)) {
            if (item.dismissedAt !== null) {
                signals.push({
                    type: "ROADMAP_DISMISSED",
                    careerTrackId: track.id,
                    value: -15,
                    reason: `The student dismissed the recommendation "${item.title}".`,
                });
                continue;
            }

            if (item.status === "COMPLETED") {
                signals.push({
                    type: "ROADMAP_COMPLETED",
                    careerTrackId: track.id,
                    value: 12,
                    reason: `The student completed "${item.title}".`,
                });
            }

            if (item.status === "IN_PROGRESS") {
                signals.push({
                    type: "ROADMAP_IN_PROGRESS",
                    careerTrackId: track.id,
                    value: 8,
                    reason: `The student is actively pursuing "${item.title}".`,
                });
            }

            if (item.status === "STRUGGLING") {
                signals.push({
                    type: "ROADMAP_STRUGGLING",
                    careerTrackId: track.id,
                    value: 3,
                    reason: `The student is still engaging with "${item.title}" but has reported difficulty.`,
                });
            }

            if (item.status === "SKIPPED") {
                signals.push({
                    type: "ROADMAP_SKIPPED",
                    careerTrackId: track.id,
                    value: -8,
                    reason: `The student explicitly skipped "${item.title}".`,
                });
            }

            /*
             * NOT_STARTED intentionally produces no negative signal. Failure to
             * complete something is not sufficient evidence of disinterest.
             */
        }

        // Verified evidence that happens to align with a track is a genuine
        // signal of direction, independent of anything the student declared.
        const readiness = readinessByTrack.get(track.id);

        const verifiedAlignedCertifications = track.trackCerts.filter((requirement) =>
            student.certifications.some(
                (held) =>
                    held.certificationId === requirement.certificationId &&
                    held.verificationStatus === "APPROVED"
            )
        );

        if (verifiedAlignedCertifications.length > 0) {
            signals.push({
                type: "VERIFIED_CERTIFICATION",
                careerTrackId: track.id,
                value: Math.min(15, verifiedAlignedCertifications.length * 8),
                reason: `${verifiedAlignedCertifications.length} human-verified certification(s) required by this career are already held.`,
            });
        }

        if (readiness && readiness.matchedSkills.length >= 3) {
            signals.push({
                type: "SKILL_ALIGNMENT",
                careerTrackId: track.id,
                value: Math.min(15, readiness.matchedSkills.length * 2),
                reason: `${readiness.matchedSkills.length} of this career's skill requirements are already evidenced.`,
            });
        }

        const positiveScore = signals
            .filter((signal) => signal.value > 0)
            .reduce((sum, signal) => sum + signal.value, 0);

        const negativeScore = Math.abs(
            signals.filter((signal) => signal.value < 0).reduce((sum, signal) => sum + signal.value, 0)
        );

        return {
            careerTrackId: track.id,
            careerTrackLabel: track.label,
            score: clamp(positiveScore - negativeScore),
            positiveScore,
            negativeScore,
            evidenceStrength: signals.length,
            signalTypeCount: new Set(signals.filter((s) => s.value > 0).map((s) => s.type)).size,
            signals,
        } satisfies CareerInterestResult;
    });

    const interestByTrack = new Map(
        interestProfiles.map((profile) => [profile.careerTrackId, profile])
    );

    // ---- Career recommendations -------------------------------------------

    const careerRecommendations: CareerRecommendation[] = tracks
        .map((track) => {
            const readiness = readinessByTrack.get(track.id);
            const interest = interestByTrack.get(track.id);

            const trackSkillIds = new Set(track.trackSkills.map((item) => item.skillId));
            const relatedDemand = market.skills.filter((skill) => trackSkillIds.has(skill.id));

            const marketDemandScore =
                market.totalDemandPoints > 0
                    ? clamp(
                        Math.round(
                            (relatedDemand.reduce((sum, skill) => sum + skill.demandPoints, 0) /
                                market.totalDemandPoints) *
                            100
                        )
                    )
                    : 0;

            const recommendationScore = Math.round(
                weightedAverage([
                    { value: readiness?.score ?? 0, weight: 0.45 },
                    { value: interest?.score ?? 0, weight: 0.35 },
                    { value: marketDemandScore, weight: 0.2 },
                ])
            );

            const reasons: string[] = [];

            if ((interest?.score ?? 0) >= 50) {
                reasons.push("Student behavior shows meaningful interest in this career.");
            }

            if ((readiness?.score ?? 0) >= 70) {
                reasons.push("The student's current profile already aligns well with this career.");
            }

            if (marketDemandScore >= 20) {
                reasons.push(
                    `Skills associated with this career appear across ${relatedDemand.reduce((sum, skill) => sum + skill.openRoleCount, 0)} open role requirement(s).`
                );
            }

            if (reasons.length === 0) {
                reasons.push(
                    "Ranked from readiness, demonstrated interest, and current employer demand; none of the three is strong yet."
                );
            }

            return {
                careerTrackId: track.id,
                careerTrackLabel: track.label,
                readinessScore: readiness?.score ?? 0,
                interestScore: interest?.score ?? 0,
                marketDemandScore,
                recommendationScore,
                reasons,
            };
        })
        .sort((a, b) => b.recommendationScore - a.recommendationScore);

    const currentCareer =
        careerRecommendations.find(
            (career) =>
                normalizeCareerTrackId(career.careerTrackId) ===
                normalizeCareerTrackId(student.targetCareer) ||
                normalizeCareerTrackId(career.careerTrackLabel) ===
                normalizeCareerTrackId(student.targetCareer)
        ) ?? null;

    const currentInterest = currentCareer ? interestByTrack.get(currentCareer.careerTrackId) ?? null : null;

    const alternative =
        careerRecommendations.find(
            (career) =>
                career.careerTrackId !== currentCareer?.careerTrackId &&
                !dismissedTrackIds.has(career.careerTrackId)
        ) ?? null;

    const alternativeInterest = alternative ? interestByTrack.get(alternative.careerTrackId) ?? null : null;

    let directionSuggestion: CareerDirectionSuggestion = {
        shouldSuggestChange: false,
        currentCareer,
        suggestedCareer: null,
        reason: null,
        supportingSignals: [],
        disengagementSignals: [],
    };

    if (currentCareer && alternative && alternativeInterest && currentInterest) {
        // Positive evidence for the alternative direction.
        const supportingSignals = alternativeInterest.signals.filter((signal) => signal.value > 0);

        // Evidence that the student is disengaging from the current direction.
        const disengagementSignals = currentInterest.signals.filter((signal) => signal.value < 0);

        const qualifies =
            alternativeInterest.evidenceStrength >= MIN_DIRECTION_EVIDENCE &&
            alternativeInterest.signalTypeCount >= MIN_DIRECTION_SIGNAL_TYPES &&
            alternative.recommendationScore >= currentCareer.recommendationScore + MIN_DIRECTION_ADVANTAGE &&
            alternative.interestScore > currentInterest.score;

        if (qualifies) {
            directionSuggestion = {
                shouldSuggestChange: true,
                currentCareer,
                suggestedCareer: alternative,
                reason:
                    `Recent activity aligns more strongly with ${alternative.careerTrackLabel} than ${currentCareer.careerTrackLabel} ` +
                    `(${alternative.recommendationScore}% vs ${currentCareer.recommendationScore}% overall fit, across ${alternativeInterest.signalTypeCount} independent signal type(s))` +
                    (disengagementSignals.length > 0
                        ? `, and ${disengagementSignals.length} recommendation(s) for ${currentCareer.careerTrackLabel} were skipped or dismissed.`
                        : ".") +
                    " Fursah offers this as an alternative and never changes a target career automatically.",
                supportingSignals,
                disengagementSignals,
            };
        }
    }

    const targetReadiness = currentCareer
        ? readinessByTrack.get(currentCareer.careerTrackId) ?? null
        : null;

    // ---- Adaptive roadmap --------------------------------------------------

    const generatedAt = new Date();

    const activeRoadmapKeys = new Set(
        student.roadmapItems
            .filter((item) => item.status !== "COMPLETED" && item.dismissedAt === null)
            .map((item) =>
                recommendationKey({
                    careerTrackId: item.careerTrackId,
                    skillId: item.skillId,
                    certificationId: item.certificationId,
                    title: item.title,
                })
            )
    );

    const dismissedRoadmapKeys = new Set(
        student.roadmapItems
            .filter((item) => item.dismissedAt !== null)
            .map((item) =>
                recommendationKey({
                    careerTrackId: item.careerTrackId,
                    skillId: item.skillId,
                    certificationId: item.certificationId,
                    title: item.title,
                })
            )
    );

    const roadmapRecommendations: RoadmapRecommendation[] = [];

    if (targetReadiness) {
        const trackRow = tracks.find((track) => track.id === targetReadiness.careerTrackId);
        const label = targetReadiness.careerTrackLabel;

        for (const gap of targetReadiness.missingSkills.slice(0, 6)) {
            const matchingOfferings = offerings.filter((offering) =>
                offering.skills.some(
                    (offeringSkill) =>
                        offeringSkill.skillId === gap.skillId ||
                        normalizeSkillName(offeringSkill.skill.name) === normalizeSkillName(gap.skillName)
                )
            );

            const bestOffering = matchingOfferings[0] ?? null;

            roadmapRecommendations.push({
                title: bestOffering ? bestOffering.title : `Develop ${gap.skillName}`,
                category: bestOffering ? bestOffering.type.toUpperCase() : "SKILL",
                careerTrackId: targetReadiness.careerTrackId,
                careerTrackLabel: label,
                skillId: gap.skillId,
                skillName: gap.skillName,
                offeringId: bestOffering?.id ?? null,
                offeringProvider: bestOffering?.university.institution ?? null,
                certificationId: bestOffering?.certificationId ?? null,
                source: bestOffering ? "UNIVERSITY_OFFERING" : "SKILL_GAP",
                expectedImpact: expectedImpactFromGap(gap.priorityScore),
                recommendationScore: gap.priorityScore,
                generatedAt,
                reason: bestOffering
                    ? `${bestOffering.title} (${bestOffering.university.institution}) teaches ${gap.skillName}, currently evidenced at level ${gap.currentLevel}/5 for ${label}${gap.openRoleCount > 0 ? ` and requested by ${gap.openRoleCount} open role(s)` : ""}.`
                    : `${gap.skillName} is evidenced at level ${gap.currentLevel}/5 against the ${label} requirement${gap.openRoleCount > 0 ? ` and appears in ${gap.openRoleCount} open role(s)` : ""}.`,
            });
        }

        for (const certificationName of targetReadiness.missingCertifications.slice(0, 3)) {
            const requirement = trackRow?.trackCerts.find(
                (entry) => entry.certification.name === certificationName
            );

            const grantingOffering =
                offerings.find(
                    (offering) =>
                        offering.certificationId &&
                        offering.certificationId === requirement?.certificationId
                ) ?? null;

            roadmapRecommendations.push({
                title: grantingOffering
                    ? grantingOffering.title
                    : `Earn the "${certificationName}" certification`,
                category: "CERTIFICATION",
                careerTrackId: targetReadiness.careerTrackId,
                careerTrackLabel: label,
                skillId: null,
                skillName: null,
                offeringId: grantingOffering?.id ?? null,
                offeringProvider: grantingOffering?.university.institution ?? null,
                certificationId: requirement?.certificationId ?? null,
                source: grantingOffering ? "UNIVERSITY_OFFERING" : "CERTIFICATION_GAP",
                expectedImpact: 8,
                recommendationScore: 55,
                generatedAt,
                reason: grantingOffering
                    ? `${grantingOffering.title} (${grantingOffering.university.institution}) grants ${certificationName}, a certification recommended for ${label} that is not yet human-verified on your passport.`
                    : `${certificationName} is recommended for ${label} and is not yet human-verified on your passport.`,
            });
        }

        if (
            targetReadiness.recommendedExperienceMonths > 0 &&
            targetReadiness.experienceMonths < targetReadiness.recommendedExperienceMonths
        ) {
            const remaining =
                targetReadiness.recommendedExperienceMonths - targetReadiness.experienceMonths;

            roadmapRecommendations.push({
                title: `Complete ${remaining} more month(s) of relevant experience`,
                category: "EXPERIENCE",
                careerTrackId: targetReadiness.careerTrackId,
                careerTrackLabel: label,
                skillId: null,
                skillName: null,
                offeringId: null,
                offeringProvider: null,
                certificationId: null,
                source: "EXPERIENCE_GAP",
                expectedImpact: 10,
                recommendationScore: 50,
                generatedAt,
                reason: `${label} recommends ${targetReadiness.recommendedExperienceMonths} month(s) of experience; ${targetReadiness.experienceMonths} month(s) are currently recorded.`,
            });
        }

        if (targetReadiness.projectCount < 3) {
            const remaining = 3 - targetReadiness.projectCount;

            roadmapRecommendations.push({
                title: `Add ${remaining} more project(s) to your portfolio`,
                category: "PORTFOLIO",
                careerTrackId: targetReadiness.careerTrackId,
                careerTrackLabel: label,
                skillId: null,
                skillName: null,
                offeringId: null,
                offeringProvider: null,
                certificationId: null,
                source: "PORTFOLIO_GAP",
                expectedImpact: 5,
                recommendationScore: 35,
                generatedAt,
                reason: `${targetReadiness.projectCount} project(s) are documented; the portfolio component of readiness is measured against 3.`,
            });
        }
    }

    // Deduplicate against what the student already has, and never re-propose
    // something they explicitly dismissed.
    const seen = new Set<string>();

    const dedupedRecommendations = roadmapRecommendations
        .filter((recommendation) => {
            const key = recommendationKey({
                careerTrackId: recommendation.careerTrackId,
                skillId: recommendation.skillId,
                certificationId: recommendation.certificationId,
                title: recommendation.title,
            });

            if (seen.has(key) || dismissedRoadmapKeys.has(key)) return false;
            seen.add(key);
            return true;
        })
        .sort((a, b) => b.recommendationScore - a.recommendationScore);

    return {
        studentId: student.id,
        targetCareer: student.targetCareer,
        modelVersion: STUDENT_INTELLIGENCE_MODEL_VERSION,
        generatedAt,
        readiness: targetReadiness,
        readinessByTrack: readinessResults,
        careerMatches: careerRecommendations,
        interestProfiles: interestProfiles.sort((a, b) => b.score - a.score),
        directionSuggestion,
        skillGaps: targetReadiness?.missingSkills ?? [],
        roadmapRecommendations: dedupedRecommendations,
        newRoadmapRecommendations: dedupedRecommendations.filter(
            (recommendation) =>
                !activeRoadmapKeys.has(
                    recommendationKey({
                        careerTrackId: recommendation.careerTrackId,
                        skillId: recommendation.skillId,
                        certificationId: recommendation.certificationId,
                        title: recommendation.title,
                    })
                )
        ),
    };
}

/**
 * Stable identity for a recommendation. Two recommendations are "the same"
 * when they address the same gap for the same career, regardless of which
 * offering happened to be picked to close it.
 */
export function recommendationKey(input: {
    careerTrackId: string | null;
    skillId: string | null;
    certificationId: string | null;
    title: string;
}) {
    const subject =
        input.skillId ?? input.certificationId ?? normalizeSkillName(input.title);

    return `${input.careerTrackId ?? "-"}::${subject}`;
}

function expectedImpactFromGap(priorityScore: number) {
    return Math.max(1, Math.min(20, Math.round(priorityScore / 5)));
}
