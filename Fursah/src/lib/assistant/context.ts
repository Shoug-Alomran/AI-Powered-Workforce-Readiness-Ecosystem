import "server-only";

import { prisma } from "@/lib/db";
import { computeJobMatch } from "@/lib/ai";
import { getStudentIntelligence } from "@/lib/intelligence/student";
import { getEmployerIntelligence } from "@/lib/intelligence/employer";
import { getUniversityIntelligence } from "@/lib/intelligence/university";
import { getEcosystemIntelligence } from "@/lib/intelligence/ecosystem";
import { MIN_COHORT } from "@/lib/cohort";

export type AssistantRole = "STUDENT" | "EMPLOYER" | "UNIVERSITY";

export type AssistantContext = {
  role: AssistantRole;
  modelVersions: string[];
  /**
   * The grounding pack. Serialized into the prompt as the ONLY permitted
   * source of quantitative fact. Every number here was produced by the
   * deterministic intelligence layer or read directly from the database.
   */
  facts: Record<string, unknown>;
};

/**
 * Student grounding pack.
 *
 * Scoped to the signed-in student's own record. No other student's data is
 * ever loaded here, so the assistant cannot surface a peer's profile.
 */
export async function buildStudentContext(studentId: string): Promise<AssistantContext> {
  const [intelligence, student, ecosystem] = await Promise.all([
    getStudentIntelligence(studentId),
    prisma.student.findUniqueOrThrow({
      where: { id: studentId },
      include: {
        user: { select: { name: true } },
        skills: { include: { skill: true } },
        certifications: { include: { certification: true } },
        experiences: true,
        projects: true,
        applications: { include: { job: { include: { employer: true } } } },
        bookmarks: { include: { job: true } },
        roadmapItems: true,
      },
    }),
    getEcosystemIntelligence(),
  ]);

  const openJobs = await prisma.job.findMany({
    where: { status: "open", employer: { verificationStatus: "APPROVED" } },
    include: {
      employer: true,
      requiredSkills: { include: { skill: true } },
      requiredCerts: { include: { certification: true } },
    },
  });

  const jobMatches = openJobs
    .map((job) => {
      const match = computeJobMatch(student, job);
      return {
        jobTitle: job.title,
        company: job.employer.company,
        careerTrack: job.careerTrack,
        matchScore: match.score,
        matchedSkills: match.matchedSkills,
        missingSkills: match.missingSkills,
        missingCertifications: match.missingCerts,
        experienceGapMonths: match.experienceGapMonths,
        minExperienceMonths: job.minExperience,
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore);

  // Offerings are public catalogue data, safe to surface in full.
  const offerings = await prisma.offering.findMany({
    include: { university: true, skills: { include: { skill: true } }, certification: true },
  });

  const readiness = intelligence.readiness;

  return {
    role: "STUDENT",
    modelVersions: [intelligence.modelVersion, ecosystem.modelVersion],
    facts: {
      studentName: student.user.name,
      declaredTargetCareer: student.targetCareer,
      university: student.university,
      degree: student.degree,

      readiness: readiness
        ? {
            careerTrack: readiness.careerTrackLabel,
            score: readiness.score,
            components: readiness.components.map((component) => ({
              name: component.name,
              percentage: component.percentage,
              weightPct: Math.round(component.weight * 100),
              detail: component.detail,
              applicable: component.applicable,
            })),
            explanation: readiness.explanation,
            experienceMonths: readiness.experienceMonths,
            recommendedExperienceMonths: readiness.recommendedExperienceMonths,
            projectCount: readiness.projectCount,
            modelVersion: readiness.modelVersion,
          }
        : null,

      skills: student.skills.map((entry) => ({ name: entry.skill.name, level: entry.level, outOf: 5 })),

      certifications: student.certifications.map((entry) => ({
        name: entry.certification.name,
        verificationStatus: entry.verificationStatus,
        countsTowardScore: entry.verificationStatus === "APPROVED",
      })),

      experiences: student.experiences.map((entry) => ({
        title: entry.title,
        organization: entry.org,
        months: entry.months,
        verificationStatus: entry.verificationStatus,
      })),

      projects: student.projects.map((entry) => ({ title: entry.title, verificationStatus: entry.verificationStatus })),

      skillGaps: intelligence.skillGaps.map((gap) => ({
        skill: gap.skillName,
        currentLevel: gap.currentLevel,
        requiredWeight: gap.requiredWeight,
        openRolesRequestingIt: gap.openRoleCount,
        priorityScore: gap.priorityScore,
      })),

      roadmap: student.roadmapItems.map((item) => ({
        title: item.title,
        category: item.category,
        status: item.status,
        dismissed: item.dismissedAt !== null,
        expectedImpact: item.expectedImpact,
        reason: item.recommendationReason,
        careerTrack: item.careerTrackId,
      })),

      roadmapRecommendations: intelligence.roadmapRecommendations.map((entry) => ({
        title: entry.title,
        source: entry.source,
        careerTrack: entry.careerTrackLabel,
        expectedImpact: entry.expectedImpact,
        reason: entry.reason,
        offeringProvider: entry.offeringProvider,
      })),

      careerMatches: intelligence.careerMatches.slice(0, 5).map((entry) => ({
        careerTrack: entry.careerTrackLabel,
        overallFitPct: entry.recommendationScore,
        readinessPct: entry.readinessScore,
        interestPct: entry.interestScore,
        employerDemandPct: entry.marketDemandScore,
        reasons: entry.reasons,
      })),

      careerInterestSignals: intelligence.interestProfiles.slice(0, 4).map((profile) => ({
        careerTrack: profile.careerTrackLabel,
        interestScore: profile.score,
        signals: profile.signals.map((signal) => ({ type: signal.type, value: signal.value, reason: signal.reason })),
      })),

      careerDirectionSuggestion: {
        suggested: intelligence.directionSuggestion.shouldSuggestChange,
        suggestedCareer: intelligence.directionSuggestion.suggestedCareer?.careerTrackLabel ?? null,
        currentCareer: intelligence.directionSuggestion.currentCareer?.careerTrackLabel ?? null,
        reason: intelligence.directionSuggestion.reason,
        supportingSignals: intelligence.directionSuggestion.supportingSignals.map((signal) => signal.reason),
        disengagementSignals: intelligence.directionSuggestion.disengagementSignals.map((signal) => signal.reason),
        note: "Fursah never changes a student's target career automatically. This is an offer to explore, nothing more.",
      },

      jobMatches: jobMatches.slice(0, 8),

      applications: student.applications.map((application) => ({
        jobTitle: application.job.title,
        company: application.job.employer.company,
        status: application.status,
        matchScoreAtApplication: application.matchScore,
        employerNote: application.note,
      })),

      bookmarkedJobs: student.bookmarks.map((bookmark) => bookmark.job.title),

      universityOfferings: offerings.map((offering) => ({
        title: offering.title,
        type: offering.type,
        institution: offering.university.institution,
        skillsTaught: offering.skills.map((entry) => entry.skill.name),
        grantsCertification: offering.certification?.name ?? null,
      })),

      workforceDemand: {
        openRoleCount: ecosystem.openRoleCount,
        mostRequestedSkills: ecosystem.skills.slice(0, 8).map((skill) => ({
          name: skill.name,
          openRolesRequestingIt: skill.openRoleCount,
          studentsEvidencingIt: skill.studentsWithSkill,
          taughtByAUniversity: skill.taughtByUniversity,
        })),
        note: "Counts over currently open roles. No trend, growth, or forecast data exists on this platform.",
      },
    },
  };
}

/**
 * Employer grounding pack.
 *
 * Restricted to this employer's own jobs. Candidate-level detail is included
 * only for students who actually applied to one of those jobs — the same
 * boundary the employer's own pages enforce. Whole-platform student profiles
 * are never included.
 */
export async function buildEmployerContext(employerId: string): Promise<AssistantContext> {
  const [intelligence, employer, ecosystem] = await Promise.all([
    getEmployerIntelligence(employerId),
    prisma.employer.findUniqueOrThrow({
      where: { id: employerId },
      include: {
        jobs: {
          include: {
            requiredSkills: { include: { skill: true } },
            requiredCerts: { include: { certification: true } },
            applications: { include: { student: { include: { user: true } } } },
          },
        },
      },
    }),
    getEcosystemIntelligence(),
  ]);

  const applicantNameByStudentId = new Map<string, string>();
  const applicationStatusByStudentId = new Map<string, string>();
  for (const job of employer.jobs) {
    for (const application of job.applications) {
      applicantNameByStudentId.set(application.studentId, application.student.user.name);
      applicationStatusByStudentId.set(`${job.id}:${application.studentId}`, application.status);
    }
  }

  return {
    role: "EMPLOYER",
    modelVersions: [intelligence.modelVersion, ecosystem.modelVersion],
    facts: {
      company: employer.company,
      industry: employer.industry,
      openJobCount: intelligence.openJobCount,
      studentPoolSize: intelligence.studentPoolSize,
      totalCandidatePoolAcrossRoles: intelligence.totalCandidatePool,

      jobs: intelligence.jobs.map((job) => {
        const source = employer.jobs.find((entry) => entry.id === job.jobId);

        return {
          title: job.jobTitle,
          hiringDifficulty: job.hiringDifficulty,
          candidatePoolSize: job.candidatePoolSize,
          strongCandidateCount: job.strongCandidateCount,
          applicantCount: job.applicantCount,

          requirementQuality: {
            score: job.quality.score,
            completeness: job.quality.completenessScore,
            requirementStructure: job.quality.requirementQualityScore,
            marketRealism: job.quality.marketRealismScore,
            issues: job.quality.issues,
            strengths: job.quality.strengths,
          },

          structuredRequirements: {
            minExperienceMonths: source?.minExperience ?? null,
            skills: (source?.requiredSkills ?? []).map((requirement) => ({
              name: requirement.skill.name,
              weight: requirement.weight,
              requirementType: requirement.requirementType,
            })),
            certifications: (source?.requiredCerts ?? []).map((requirement) => requirement.certification.name),
          },

          recurringApplicantGaps: job.recurringGaps,
          scarceSkillsInPool: job.scarceSkills.map((skill) => ({
            name: skill.name,
            openRolesRequestingIt: skill.openRoleCount,
          })),
          insights: job.insights,

          // Only students who applied to THIS employer's role.
          applicants: job.applicantFits.map((fit) => ({
            candidateName: applicantNameByStudentId.get(fit.studentId) ?? "Applicant",
            applicationStatus: applicationStatusByStudentId.get(`${job.jobId}:${fit.studentId}`) ?? "applied",
            matchScore: fit.score,
            essentialSkillScore: fit.essentialSkillScore,
            preferredSkillScore: fit.preferredSkillScore,
            certificationScore: fit.certificationScore,
            experienceScore: fit.experienceScore,
            matchedSkills: fit.matchedSkills,
            missingEssentialSkills: fit.missingEssentialSkills,
            experienceMonths: fit.experienceMonths,
            verifiedExperienceMonths: fit.verifiedExperienceMonths,
            verifiedEvidenceItems: fit.verifiedEvidenceItems,
            totalEvidenceItems: fit.evidenceItems,
            explanation: fit.explanation,
          })),
        };
      }),

      recurringGapsAcrossAllRoles: intelligence.recurringGaps,

      talentSupply: {
        note: "Platform-wide aggregates. Individual profiles of students who did not apply are not available to employers.",
        skillsWithThinnestSupply: ecosystem.supplyGaps.slice(0, 6).map((skill) => ({
          name: skill.name,
          studentsEvidencingIt: skill.studentsWithSkill,
          openRolesRequestingIt: skill.openRoleCount,
          taughtByAUniversity: skill.taughtByUniversity,
        })),
      },
    },
  };
}

/**
 * University grounding pack.
 *
 * Aggregate only. Cohort figures come from the privacy-suppressed rollup,
 * which withholds everything below MIN_COHORT students, and no per-student
 * record is loaded at all — so the assistant physically cannot name a student.
 */
export async function buildUniversityContext(universityId: string): Promise<AssistantContext> {
  const [intelligence, ecosystem] = await Promise.all([
    getUniversityIntelligence(universityId),
    getEcosystemIntelligence(),
  ]);

  const curriculumActions = await prisma.curriculumAction.findMany({
    where: { universityId },
    orderBy: { createdAt: "desc" },
  });

  const offerings = await prisma.offering.findMany({
    where: { universityId },
    include: { skills: { include: { skill: true } }, certification: true },
  });

  const cohort = intelligence.cohort;

  return {
    role: "UNIVERSITY",
    modelVersions: [intelligence.modelVersion, ecosystem.modelVersion],
    facts: {
      institution: intelligence.institution,

      privacy: {
        minimumCohortSize: MIN_COHORT,
        cohortReportable: cohort.reportable,
        note: `All student figures are aggregates. No individual student record is available on this surface. Suppression applies to every reporting group, not only the cohort total: any band, career track, skill gap or certification gap holding fewer than ${MIN_COHORT} students is withheld and appears below as {withheld: true}. A withheld group is not zero — its value is unknown to you. Say it is withheld for privacy; never estimate it.`,
        suppressedGroupCount: cohort.suppressedGroupCount,
      },

      demandCoverage: {
        weightedDemandCoveragePct: intelligence.weightedDemandCoverage,
        openRoleCount: intelligence.openRoleCount,
        distinctRequestedSkills: intelligence.requestedSkillCount,
        offeringCount: intelligence.offeringCount,
      },

      offerings: offerings.map((offering) => ({
        title: offering.title,
        type: offering.type,
        skillsTaught: offering.skills.map((entry) => entry.skill.name),
        grantsCertification: offering.certification?.name ?? null,
      })),

      coveredSkills: intelligence.coveredSkills.slice(0, 15).map((skill) => ({
        skill: skill.skillName,
        openRolesRequestingIt: skill.openRoleCount,
        covered: skill.covered,
        coveringOfferings: skill.offeringTitles,
        cohortMissingSharePct: skill.cohortMissingSharePct,
      })),

      curriculumGaps: intelligence.gaps.slice(0, 10).map((gap) => ({
        skill: gap.skillName,
        openRolesRequestingIt: gap.openRoleCount,
        cohortMissingSharePct: gap.cohortMissingSharePct,
        priorityScore: gap.priorityScore,
      })),

      compoundedGaps: intelligence.compoundedGaps.map((gap) => ({
        skill: gap.skillName,
        openRolesRequestingIt: gap.openRoleCount,
        cohortMissingSharePct: gap.cohortMissingSharePct,
        meaning: "Requested by employers, not taught here, and not evidenced across the cohort.",
      })),

      recommendations: intelligence.recommendations.map((entry) => ({
        type: entry.type,
        subject: entry.skillName,
        priorityScore: entry.priorityScore,
        openRolesRequestingIt: entry.relatedOpenRoles,
        cohortMissingSharePct: entry.cohortMissingSharePct,
        alreadyHasInitiative: entry.alreadyPlanned,
        reason: entry.reason,
      })),

      // Suppressed groups are handed over as an explicit {withheld: true}
      // marker rather than as nulls. A null in a numeric field reads to a
      // small model as "zero" or "missing", and both of those are wrong
      // answers to give about a group the platform is deliberately hiding.
      cohortReadiness: cohort.reportable
        ? {
            students: cohort.students,
            averageScore: cohort.averageScore,
            medianScore: cohort.medianScore,
            bands: cohort.bands.map((band) =>
              band.suppressed
                ? { label: band.label, withheld: true, reason: `fewer than ${MIN_COHORT} students` }
                : { label: band.label, students: band.count, sharePct: band.sharePct },
            ),
            byCareerTrack: cohort.tracks.map((track) =>
              track.suppressed
                ? { careerTrack: track.label, withheld: true, reason: `fewer than ${MIN_COHORT} students` }
                : {
                    careerTrack: track.label,
                    students: track.students,
                    averageScore: track.averageScore,
                    mostCommonGap: track.topGap,
                  },
            ),
            mostWidespreadSkillGaps: cohort.gaps
              .slice(0, 8)
              .map((gap) =>
                gap.suppressed
                  ? { skill: gap.name, withheld: true, reason: `fewer than ${MIN_COHORT} students` }
                  : { skill: gap.name, students: gap.students, sharePct: gap.sharePct },
              ),
            certificationGaps: cohort.certificationGaps
              .slice(0, 5)
              .map((gap) =>
                gap.suppressed
                  ? { certification: gap.name, withheld: true, reason: `fewer than ${MIN_COHORT} students` }
                  : { certification: gap.name, students: gap.students, sharePct: gap.sharePct },
              ),
            summary: cohort.summary,
          }
        : { withheld: true, reason: cohort.summary },

      curriculumActions: curriculumActions.map((action) => ({
        title: action.title,
        subject: action.skill,
        status: action.status,
        owner: action.owner,
        dueDate: action.dueDate?.toISOString().slice(0, 10) ?? null,
      })),

      employerDemand: {
        mostRequestedSkills: ecosystem.skills.slice(0, 10).map((skill) => ({
          name: skill.name,
          openRolesRequestingIt: skill.openRoleCount,
          studentsEvidencingItPlatformWide: skill.studentsWithSkill,
          taughtByAnyUniversity: skill.taughtByUniversity,
        })),
        certificationDemand: ecosystem.certifications.slice(0, 6),
        rolesNoStudentFullyQualifiesFor: ecosystem.hardToFillRoles
          .filter((role) => role.qualifiedStudents === 0)
          .map((role) => ({ title: role.jobTitle, essentialSkillCount: role.essentialSkillCount })),
        note: "Counts over currently open roles. The platform stores no historical demand series, so no trend or forecast exists.",
      },
    },
  };
}
