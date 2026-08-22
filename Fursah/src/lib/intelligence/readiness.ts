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

/**
 * The single rule deciding whether a piece of evidence may move a score.
 *
 * Certifications have always required human approval, but experience and
 * portfolio entries were counted whatever their state: a self-reported
 * internship and an internship whose letter an administrator had inspected
 * produced exactly the same number, and so did one whose evidence had been
 * REJECTED. That is two different trust models inside one score, and the
 * weaker of the two is the one an employer reads.
 *
 * There is now one model. Human-approved evidence scores; everything else is
 * recorded, shown with its state, and reported as present-but-unscored, never
 * silently dropped and never quietly counted.
 *
 * A missing status is treated as unverified for experience and portfolio
 * entries — the columns have always existed with a default, so an absent value
 * means a caller did not supply it rather than a record predating verification.
 * Certifications keep the opposite legacy default, which is deliberate: rows
 * genuinely do exist from before that column was added, and they are handled
 * where they are read.
 */
export function isScoredEvidence(verificationStatus: string | null | undefined): boolean {
  return verificationStatus === "APPROVED";
}

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
  /** Months whose evidence a human approved. Only these are scored. */
  experienceMonths: number;
  /** Projects whose evidence a human approved. Only these are scored. */
  projectCount: number;
  /**
   * Recorded but not human-approved. Never scored; reported so a student can
   * see the platform received the entry and what it is waiting on.
   */
  unverifiedExperienceMonths?: number;
  unverifiedProjectCount?: number;
  /** Awaiting a decision, as opposed to never submitted for one. */
  pendingExperienceMonths?: number;
  pendingProjectCount?: number;
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
  /** Recorded experience and portfolio evidence that no human has approved. */
  unverifiedExperienceMonths: number;
  unverifiedProjectCount: number;
  /** The share of the above that is awaiting a decision rather than unsubmitted. */
  pendingExperienceMonths: number;
  pendingProjectCount: number;
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

  // Both figures below are the human-approved subset. The caller separates
  // approved from unapproved; this module never sees the total and so cannot
  // accidentally score it.
  const experienceMonths = Math.max(0, Math.round(evidence.experienceMonths));
  const recommendedExperienceMonths = Math.max(0, Math.round(track.recommendedExperienceMonths));
  const experienceScore =
    recommendedExperienceMonths > 0 ? clamp(Math.round((experienceMonths / recommendedExperienceMonths) * 100)) : 0;

  const projectCount = Math.max(0, Math.round(evidence.projectCount));
  const portfolioScore = clamp(Math.round((projectCount / PORTFOLIO_TARGET_PROJECTS) * 100));

  const unverifiedExperienceMonths = Math.max(0, Math.round(evidence.unverifiedExperienceMonths ?? 0));
  const unverifiedProjectCount = Math.max(0, Math.round(evidence.unverifiedProjectCount ?? 0));
  const pendingExperienceMonths = Math.max(0, Math.round(evidence.pendingExperienceMonths ?? 0));
  const pendingProjectCount = Math.max(0, Math.round(evidence.pendingProjectCount ?? 0));

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
      detail:
        `${experienceMonths} of ${recommendedExperienceMonths} recommended month(s) verified` +
        (unverifiedExperienceMonths > 0
          ? `; a further ${unverifiedExperienceMonths} month(s) are recorded but not yet human-verified and are not scored`
          : ""),
      applicable: recommendedExperienceMonths > 0,
    },
    {
      name: "Portfolio & Projects",
      weight: READINESS_WEIGHTS.portfolio,
      percentage: portfolioScore,
      earned: projectCount,
      possible: PORTFOLIO_TARGET_PROJECTS,
      detail:
        `${projectCount} verified project(s) of ${PORTFOLIO_TARGET_PROJECTS} recommended` +
        (unverifiedProjectCount > 0
          ? `; a further ${unverifiedProjectCount} project(s) are documented but not yet human-verified and are not scored`
          : ""),
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

  // Saying "0 projects documented" to a student who has documented three would
  // be false, and leaving it out would be worse: they would see a component at
  // zero with no explanation of what happened to their evidence.
  if (unverifiedProjectCount > 0) {
    explanation.push(
      `${unverifiedProjectCount} project(s) are on your profile but not human-verified, so they do not contribute to this score` +
        (pendingProjectCount > 0
          ? `; ${pendingProjectCount} of those are awaiting an administrator's decision.`
          : ". Attach evidence and submit them for review to have them counted."),
    );
  }

  if (unverifiedExperienceMonths > 0) {
    explanation.push(
      `${unverifiedExperienceMonths} month(s) of recorded experience are not human-verified, so they do not contribute to this score` +
        (pendingExperienceMonths > 0
          ? `; ${pendingExperienceMonths} of those are awaiting an administrator's decision.`
          : ". Attach evidence and submit it for review to have it counted."),
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
    unverifiedExperienceMonths,
    unverifiedProjectCount,
    pendingExperienceMonths,
    pendingProjectCount,
    explanation,
  };
}

// ---------------------------------------------------------------------------
// Readiness headroom
// ---------------------------------------------------------------------------
// Three surfaces used to show a "potential gain" figure, each computing it
// slightly differently and all three labelled almost identically. A single
// student could see +7% on the dashboard, +0 on the roadmap, and a +10 pill on
// a recommendation inside that same roadmap — three numbers for what a reader
// would reasonably take to be one thing.
//
// They were measuring genuinely different sets, so the fix is not to collapse
// them into one number but to make the arithmetic identical and the names
// distinct:
//
//   - dashboard  : headroom across everything the engine currently RECOMMENDS
//   - roadmap    : headroom across the milestones the student has ACCEPTED
//   - pill       : one item's own estimate, uncapped
//
// The cap is what made them diverge: a sum of item estimates can exceed the
// points actually left in the score, so any total has to be clamped to
// `100 - score` while an individual item's estimate is not. That clamp lives
// here now, so no surface can clamp differently or forget to.

/**
 * Points a set of recommendations could still add, capped by what is left in
 * the score. Never negative.
 *
 * This is an estimate of what the listed items are worth, not a prediction
 * that the student will complete them, and not a forecast of a future score.
 */
/**
 * A change a student could make to their evidence.
 *
 * Used to answer "what would this actually be worth?" by running the
 * authoritative calculation again rather than estimating.
 */
export type ReadinessChange =
  | { kind: "SKILL"; skillId: string | null; name: string; toLevel: number }
  | { kind: "CERTIFICATION"; certificationId: string | null; name: string }
  | { kind: "EXPERIENCE_MONTHS"; months: number }
  | { kind: "PROJECTS"; count: number };

/** Evidence as it would be after the changes. Pure; the input is not mutated. */
export function applyReadinessChanges(
  evidence: ReadinessEvidenceInput,
  changes: readonly ReadinessChange[],
): ReadinessEvidenceInput {
  const skills = evidence.skills.map((entry) => ({ ...entry }));
  const certifications = evidence.certifications.map((entry) => ({ ...entry }));
  let experienceMonths = evidence.experienceMonths;
  let projectCount = evidence.projectCount;

  for (const change of changes) {
    if (change.kind === "SKILL") {
      const existing = skills.find(
        (entry) =>
          (change.skillId !== null && entry.skillId === change.skillId) ||
          normalizeSkillName(entry.name) === normalizeSkillName(change.name),
      );
      if (existing) existing.level = Math.max(existing.level, change.toLevel);
      else skills.push({ skillId: change.skillId, name: change.name, level: change.toLevel });
      continue;
    }

    if (change.kind === "CERTIFICATION") {
      const existing = certifications.find(
        (entry) =>
          (change.certificationId !== null && entry.certificationId === change.certificationId) ||
          normalizeSkillName(entry.name) === normalizeSkillName(change.name),
      );
      // Earning it means a human verifies it; that is what makes it count.
      if (existing) existing.verified = true;
      else certifications.push({ certificationId: change.certificationId, name: change.name, verified: true });
      continue;
    }

    if (change.kind === "EXPERIENCE_MONTHS") {
      experienceMonths += Math.max(0, change.months);
      continue;
    }

    projectCount += Math.max(0, change.count);
  }

  return { ...evidence, skills, certifications, experienceMonths, projectCount };
}

/**
 * Points a set of changes would actually add, according to the same engine
 * that produced the current score.
 *
 * This replaces a per-recommendation estimate that was derived from a priority
 * ranking rather than from the score: it read `priorityScore / 5`, and
 * `priorityScore` folds in employer demand for the skill. A student was
 * therefore told that a widely-requested skill was worth more *readiness*
 * points than a rarely-requested one of the same weight, which the readiness
 * model does not say and cannot support - readiness measures evidence against
 * a career track and does not consider demand at all.
 *
 * Computing the difference directly also makes the totals honest. Component
 * gains are not additive: two skills inside the same component share one
 * weighting, so summing their individual values overstates the pair. Passing
 * every change at once returns what they are jointly worth.
 *
 * It is a projection of the model, not a forecast about the student.
 */
export function projectedReadinessGain(
  evidence: ReadinessEvidenceInput,
  track: ReadinessTrackInput,
  changes: readonly ReadinessChange[],
): number {
  if (changes.length === 0) return 0;
  const current = computeCareerReadiness(evidence, track).score;
  const projected = computeCareerReadiness(applyReadinessChanges(evidence, changes), track).score;
  return Math.max(0, projected - current);
}

export function readinessHeadroom(currentScore: number, expectedImpacts: readonly number[]): number {
  const remaining = Math.max(0, 100 - currentScore);
  const claimed = expectedImpacts.reduce((total, impact) => total + Math.max(0, impact), 0);
  return Math.max(0, Math.min(remaining, claimed));
}
