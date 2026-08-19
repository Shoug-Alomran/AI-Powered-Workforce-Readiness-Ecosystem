// ---------------------------------------------------------------------------
// Authoritative career-readiness calculation.
// ---------------------------------------------------------------------------
// Before this module existed the platform had two readiness calculations:
// one in "@/lib/ai" (used by the roadmap, the passport, the cohort rollup and
// the public workforce page) and one inside the intelligence engine (used by
// the student dashboard). They disagreed, so the same student could see two
// different scores on two pages.
//
// This is now the single implementation. "@/lib/ai" and the intelligence
// engine both delegate here, so a score shown to a student, to their
// university in aggregate, and to an employer always comes from the same
// arithmetic. It is deliberately pure: no Prisma, no I/O, so it can run on
// data that a caller has already loaded rather than re-querying per student.
// ---------------------------------------------------------------------------

import { clamp, normalizeSkillName, normalizeWeight, percentage, skillProficiencyScore } from "./scoring";

/** Bumped whenever the arithmetic below changes; recorded on audit events. */
export const READINESS_MODEL_VERSION = "fursah-readiness-v2";

/**
 * Relative contribution of each evidence category. Kept identical to the
 * weighting the platform has always published to students so consolidating
 * the two engines did not silently re-score anybody's profile.
 */
export const READINESS_WEIGHTS = {
  technicalSkills: 0.35,
  softSkills: 0.15,
  certifications: 0.2,
  experience: 0.2,
  portfolio: 0.1,
} as const;

/** A requirement is considered met at this proficiency or above. */
export const PROFICIENCY_MET_THRESHOLD = 70;

/** Projects counted before the portfolio component is considered complete. */
export const PORTFOLIO_TARGET_PROJECTS = 3;

export type ReadinessSkillRequirement = {
  skillId: string | null;
  name: string;
  category: string;
  weight: number;
};

export type ReadinessCertificationRequirement = {
  certificationId: string | null;
  name: string;
};

export type ReadinessTrackInput = {
  id: string;
  label: string;
  skills: ReadinessSkillRequirement[];
  certifications: ReadinessCertificationRequirement[];
  recommendedExperienceMonths: number;
};

export type ReadinessEvidenceSkill = {
  skillId: string | null;
  name: string;
  level: number;
};

export type ReadinessEvidenceCertification = {
  certificationId: string | null;
  name: string;
  /** Only human-verified certifications contribute to the score. */
  verified: boolean;
};

export type ReadinessEvidenceInput = {
  skills: ReadinessEvidenceSkill[];
  certifications: ReadinessEvidenceCertification[];
  experienceMonths: number;
  projectCount: number;
};

export type ReadinessSkillMatch = {
  skillId: string | null;
  name: string;
  category: string;
  requiredWeight: number;
  currentLevel: number;
  expectedLevel: number;
  proficiency: number;
};

export type ReadinessComponentResult = {
  name: string;
  weight: number;
  percentage: number;
  earned: number;
  possible: number;
  detail: string;
  /**
   * False when the career track defines nothing to measure for this category
   * (for example a track that recommends no certification). Inapplicable
   * components are excluded from the weighted average and the remaining
   * weights are renormalized, so a track is never capped below 100 for
   * something it never asked for.
   */
  applicable: boolean;
};

export type ReadinessCoreResult = {
  trackId: string;
  trackLabel: string;
  score: number;
  technicalScore: number;
  softScore: number;
  /** Combined technical + soft skill coverage, for surfaces showing one figure. */
  skillScore: number;
  certificationScore: number;
  experienceScore: number;
  portfolioScore: number;
  components: ReadinessComponentResult[];
  matchedSkills: ReadinessSkillMatch[];
  missingSkills: ReadinessSkillMatch[];
  matchedCertifications: ReadinessCertificationRequirement[];
  missingCertifications: ReadinessCertificationRequirement[];
  experienceMonths: number;
  recommendedExperienceMonths: number;
  projectCount: number;
  /** Unverified certifications the student claims, reported but never scored. */
  unverifiedCertifications: string[];
  explanation: string[];
};

/** Level a requirement of this weight is expected to be evidenced at. */
export function expectedLevelForWeight(weight: number) {
  const normalized = normalizeWeight(weight);
  return normalized === 3 ? 4 : normalized === 2 ? 3 : 2;
}

type SkillLookup = {
  byId: Map<string, ReadinessEvidenceSkill>;
  byName: Map<string, ReadinessEvidenceSkill>;
};

function indexSkills(skills: ReadinessEvidenceSkill[]): SkillLookup {
  const byId = new Map<string, ReadinessEvidenceSkill>();
  const byName = new Map<string, ReadinessEvidenceSkill>();

  for (const skill of skills) {
    if (skill.skillId) byId.set(skill.skillId, skill);
    byName.set(normalizeSkillName(skill.name), skill);
  }

  return { byId, byName };
}

function findSkill(lookup: SkillLookup, requirement: ReadinessSkillRequirement) {
  if (requirement.skillId) {
    const byId = lookup.byId.get(requirement.skillId);
    if (byId) return byId;
  }
  return lookup.byName.get(normalizeSkillName(requirement.name)) ?? null;
}

function scoreSkillGroup(
  requirements: ReadinessSkillRequirement[],
  lookup: SkillLookup,
): { score: number; earned: number; possible: number; matched: ReadinessSkillMatch[]; missing: ReadinessSkillMatch[] } {
  let earned = 0;
  let possible = 0;
  const matched: ReadinessSkillMatch[] = [];
  const missing: ReadinessSkillMatch[] = [];

  for (const requirement of requirements) {
    const weight = normalizeWeight(requirement.weight);
    const evidence = findSkill(lookup, requirement);
    const level = Math.max(0, Math.min(5, Math.round(evidence?.level ?? 0)));
    const proficiency = skillProficiencyScore(level, weight);

    possible += weight * 100;
    earned += weight * proficiency;

    const entry: ReadinessSkillMatch = {
      skillId: requirement.skillId ?? evidence?.skillId ?? null,
      name: requirement.name,
      category: requirement.category,
      requiredWeight: weight,
      currentLevel: level,
      expectedLevel: expectedLevelForWeight(weight),
      proficiency,
    };

    if (proficiency >= PROFICIENCY_MET_THRESHOLD) matched.push(entry);
    else missing.push(entry);
  }

  return {
    score: possible > 0 ? percentage(earned, possible) : 0,
    earned,
    possible,
    matched,
    missing,
  };
}

export function computeCareerReadiness(
  evidence: ReadinessEvidenceInput,
  track: ReadinessTrackInput,
): ReadinessCoreResult {
  const lookup = indexSkills(evidence.skills);

  const technicalRequirements = track.skills.filter((item) => item.category !== "soft");
  const softRequirements = track.skills.filter((item) => item.category === "soft");

  const technical = scoreSkillGroup(technicalRequirements, lookup);
  const soft = scoreSkillGroup(softRequirements, lookup);

  const skillEarned = technical.earned + soft.earned;
  const skillPossible = technical.possible + soft.possible;
  const skillScore = skillPossible > 0 ? percentage(skillEarned, skillPossible) : 0;

  // Only human-verified credentials count. An AI extraction or a self-report
  // is surfaced separately so a student can see it was received without it
  // inflating a score that employers rely on.
  const verifiedById = new Set(
    evidence.certifications.filter((item) => item.verified && item.certificationId).map((item) => item.certificationId as string),
  );
  const verifiedByName = new Set(
    evidence.certifications.filter((item) => item.verified).map((item) => normalizeSkillName(item.name)),
  );

  const matchedCertifications: ReadinessCertificationRequirement[] = [];
  const missingCertifications: ReadinessCertificationRequirement[] = [];

  for (const requirement of track.certifications) {
    const held =
      (requirement.certificationId !== null && verifiedById.has(requirement.certificationId)) ||
      verifiedByName.has(normalizeSkillName(requirement.name));
    if (held) matchedCertifications.push(requirement);
    else missingCertifications.push(requirement);
  }

  const certificationScore =
    track.certifications.length > 0 ? percentage(matchedCertifications.length, track.certifications.length) : 0;

  const experienceMonths = Math.max(0, Math.round(evidence.experienceMonths));
  const recommendedExperienceMonths = Math.max(0, Math.round(track.recommendedExperienceMonths));
  const experienceScore =
    recommendedExperienceMonths > 0 ? clamp(Math.round((experienceMonths / recommendedExperienceMonths) * 100)) : 0;

  const projectCount = Math.max(0, Math.round(evidence.projectCount));
  const portfolioScore = clamp(Math.round((projectCount / PORTFOLIO_TARGET_PROJECTS) * 100));

  const components: ReadinessComponentResult[] = [
    {
      name: "Technical Skills",
      weight: READINESS_WEIGHTS.technicalSkills,
      percentage: technical.score,
      earned: technical.matched.length,
      possible: technicalRequirements.length,
      detail: `${technical.matched.length}/${technicalRequirements.length} technical requirements evidenced at the expected level`,
      applicable: technicalRequirements.length > 0,
    },
    {
      name: "Soft Skills",
      weight: READINESS_WEIGHTS.softSkills,
      percentage: soft.score,
      earned: soft.matched.length,
      possible: softRequirements.length,
      detail: `${soft.matched.length}/${softRequirements.length} soft-skill requirements evidenced at the expected level`,
      applicable: softRequirements.length > 0,
    },
    {
      name: "Certifications",
      weight: READINESS_WEIGHTS.certifications,
      percentage: certificationScore,
      earned: matchedCertifications.length,
      possible: track.certifications.length,
      detail:
        track.certifications.length === 0
          ? "This career track lists no recommended certification"
          : `${matchedCertifications.length}/${track.certifications.length} recommended certifications human-verified`,
      applicable: track.certifications.length > 0,
    },
    {
      name: "Experience",
      weight: READINESS_WEIGHTS.experience,
      percentage: experienceScore,
      earned: experienceMonths,
      possible: recommendedExperienceMonths,
      detail: `${experienceMonths} of ${recommendedExperienceMonths} recommended month(s) recorded`,
      applicable: recommendedExperienceMonths > 0,
    },
    {
      name: "Portfolio & Projects",
      weight: READINESS_WEIGHTS.portfolio,
      percentage: portfolioScore,
      earned: projectCount,
      possible: PORTFOLIO_TARGET_PROJECTS,
      detail: `${projectCount} project(s) documented of ${PORTFOLIO_TARGET_PROJECTS} recommended`,
      applicable: true,
    },
  ];

  const applicableComponents = components.filter((component) => component.applicable);
  const totalWeight = applicableComponents.reduce((sum, component) => sum + component.weight, 0);
  const score =
    totalWeight > 0
      ? clamp(
          Math.round(
            applicableComponents.reduce((sum, component) => sum + component.percentage * component.weight, 0) / totalWeight,
          ),
        )
      : 0;

  const unverifiedCertifications = evidence.certifications.filter((item) => !item.verified).map((item) => item.name);

  const explanation = [
    `Scored against the ${track.label} career track using ${track.skills.length} skill requirement(s), ${track.certifications.length} recommended certification(s), and ${recommendedExperienceMonths} recommended month(s) of experience.`,
    ...applicableComponents.map(
      (component) =>
        `${component.name} contributes ${Math.round((component.weight / totalWeight) * 100)}% of this score and currently scores ${component.percentage}% (${component.detail}).`,
    ),
  ];

  if (unverifiedCertifications.length > 0) {
    explanation.push(
      `${unverifiedCertifications.length} submitted certification(s) are not yet human-verified and therefore do not contribute to this score.`,
    );
  }

  return {
    trackId: track.id,
    trackLabel: track.label,
    score,
    technicalScore: technical.score,
    softScore: soft.score,
    skillScore,
    certificationScore,
    experienceScore,
    portfolioScore,
    components,
    matchedSkills: [...technical.matched, ...soft.matched],
    missingSkills: [...technical.missing, ...soft.missing].sort(
      (a, b) => b.requiredWeight - a.requiredWeight || a.proficiency - b.proficiency,
    ),
    matchedCertifications,
    missingCertifications,
    experienceMonths,
    recommendedExperienceMonths,
    projectCount,
    unverifiedCertifications,
    explanation,
  };
}
