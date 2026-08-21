// ---------------------------------------------------------------------------
// Fursah AI Engine
// ---------------------------------------------------------------------------
// A transparent, rule-based scoring engine that stands in for the platform's
// AI/ML pipeline described in the proposal (ITU-T Y.3172-style stages:
// data collection -> feature engineering -> model scoring -> monitoring).
// Every score returned here comes with a human-readable explanation, in line
// with the "Explainable AI" and "Human oversight" principles in the README.
// ---------------------------------------------------------------------------

import type { CareerTrack } from "./careerTracks";
import {
  computeCareerReadiness,
  READINESS_WEIGHTS,
  type ReadinessEvidenceInput,
  type ReadinessTrackInput,
} from "./intelligence/readiness";

export type StudentSkillLike = { level: number; skill: { name: string; category: string } };
export type StudentCertLike = { certification: { name: string }; verificationStatus?: string };
export type ExperienceLike = { type: string; months: number; title: string };
export type ProjectLike = { title: string };

export interface StudentForScoring {
  targetCareer: string;
  skills: StudentSkillLike[];
  certifications: StudentCertLike[];
  experiences: ExperienceLike[];
  projects: ProjectLike[];
}

export interface ReadinessBreakdown {
  category: string;
  score: number; // 0-100 contribution-normalized
  weight: number; // relative weight in overall score
  detail: string;
}

export interface ReadinessResult {
  score: number; // 0-100
  breakdown: ReadinessBreakdown[];
  nextActions: string[];
}

export const READINESS_WEIGHTS_DISPLAY = READINESS_WEIGHTS;

/** Normalizes a loaded student record into the shared readiness evidence shape. */
export function toReadinessEvidence(student: StudentForScoring): ReadinessEvidenceInput {
  return {
    skills: student.skills.map((entry) => ({ skillId: null, name: entry.skill.name, level: entry.level })),
    certifications: student.certifications.map((entry) => ({
      certificationId: null,
      name: entry.certification.name,
      // Legacy callers pass records without a status; those predate evidence
      // verification and are treated as already verified rather than dropped.
      verified: !entry.verificationStatus || entry.verificationStatus === "APPROVED",
    })),
    experienceMonths: student.experiences.reduce((sum, entry) => sum + Math.max(0, entry.months), 0),
    projectCount: student.projects.length,
  };
}

/** Normalizes a career track into the shared readiness requirement shape. */
export function toReadinessTrack(track: CareerTrack): ReadinessTrackInput {
  return {
    id: track.id,
    label: track.label,
    skills: [
      ...track.technicalSkills.map((entry) => ({ skillId: null, name: entry.name, category: "technical", weight: entry.weight })),
      ...track.softSkills.map((entry) => ({ skillId: null, name: entry.name, category: "soft", weight: entry.weight })),
    ],
    certifications: track.certifications.map((name) => ({ certificationId: null, name })),
    recommendedExperienceMonths: track.recommendedExperienceMonths,
  };
}

/**
 * Career Readiness Score (0-100).
 *
 * Thin wrapper over the single authoritative calculation in
 * "@/lib/intelligence/readiness". Kept because the roadmap, passport, cohort
 * rollup and public workforce page all call it; the arithmetic itself lives
 * in one place so no two surfaces can disagree about a student's score.
 */
export function computeReadinessScore(student: StudentForScoring, track: CareerTrack): ReadinessResult {
  const core = computeCareerReadiness(toReadinessEvidence(student), toReadinessTrack(track));

  const breakdown: ReadinessBreakdown[] = core.components.map((component) => ({
    category: component.name,
    score: component.percentage,
    weight: component.weight,
    detail: component.detail,
  }));

  const haveSkillMap = new Map(student.skills.map((s) => [s.skill.name.toLowerCase(), s.level]));
  const haveCerts = new Set(
    student.certifications
      .filter((c) => !c.verificationStatus || c.verificationStatus === "APPROVED")
      .map((c) => c.certification.name.toLowerCase()),
  );

  return {
    score: core.score,
    breakdown,
    nextActions: buildNextActions(student, track, haveSkillMap, haveCerts),
  };
}

/** Adaptive learning: recommend the highest-impact next actions. */
function buildNextActions(
  student: StudentForScoring,
  track: CareerTrack,
  haveSkillMap: Map<string, number>,
  haveCerts: Set<string>
): string[] {
  const actions: { label: string; impact: number }[] = [];

  for (const req of [...track.technicalSkills, ...track.softSkills]) {
    const level = haveSkillMap.get(req.name.toLowerCase()) ?? 0;
    if (level < 3) {
      actions.push({
        label:
          level === 0
            ? `Complete a foundational course in ${req.name}`
            : `Strengthen ${req.name} (currently level ${level}/5) with a project or advanced course`,
        impact: req.weight * (3 - level),
      });
    }
  }

  for (const cert of track.certifications) {
    if (!haveCerts.has(cert.toLowerCase())) {
      actions.push({ label: `Earn the "${cert}" certification`, impact: 3 });
    }
  }

  const totalMonths = student.experiences.reduce((s, e) => s + e.months, 0);
  if (totalMonths < track.recommendedExperienceMonths) {
    actions.push({
      label: `Complete an internship or research role (${track.recommendedExperienceMonths - totalMonths} more month(s) recommended)`,
      impact: 3,
    });
  }

  if (student.projects.length < 3) {
    actions.push({
      label: `Add ${3 - student.projects.length} more project(s) to your portfolio`,
      impact: 2,
    });
  }

  return actions
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 5)
    .map((a) => a.label);
}

// ---------------------------------------------------------------------------
// Job matching
// ---------------------------------------------------------------------------

export interface JobForMatching {
  minExperience: number;
  requiredSkills: { weight: number; requirementType?: string; skill: { name: string } }[];
  requiredCerts: { certification: { name: string } }[];
}

export interface JobMatchResult {
  score: number; // 0-100
  matchedSkills: string[];
  missingSkills: string[];
  matchedCerts: string[];
  missingCerts: string[];
  experienceGapMonths: number;
  explanation: string;
}

export function computeJobMatch(
  student: StudentForScoring,
  job: JobForMatching
): JobMatchResult {
  const haveSkillMap = new Map(
    student.skills.map((s) => [s.skill.name.toLowerCase(), s.level])
  );
  const haveCerts = new Set(
    student.certifications.filter((c) => !c.verificationStatus || c.verificationStatus === "APPROVED").map((c) => c.certification.name.toLowerCase())
  );
  const totalMonths = student.experiences.reduce((s, e) => s + e.months, 0);

  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];
  let essentialEarned = 0;
  let preferredEarned = 0;
  const essential = job.requiredSkills.filter(r => !r.requirementType || r.requirementType === "ESSENTIAL");
  const preferred = job.requiredSkills.filter(r => r.requirementType === "PREFERRED");
  const essentialTotal = essential.reduce((s, r) => s + r.weight, 0) || 1;
  const preferredTotal = preferred.reduce((s, r) => s + r.weight, 0) || 1;
  for (const r of job.requiredSkills) {
    const level = haveSkillMap.get(r.skill.name.toLowerCase());
    if (level) {
      matchedSkills.push(r.skill.name);
      if (r.requirementType === "PREFERRED") preferredEarned += r.weight * Math.min(level / 5, 1);
      else essentialEarned += r.weight * Math.min(level / 5, 1);
    } else {
      missingSkills.push(r.skill.name);
    }
  }
  const essentialScore = (essentialEarned / essentialTotal) * 100;
  const preferredScore = preferred.length ? (preferredEarned / preferredTotal) * 100 : essentialScore;
  const skillScore = essentialScore * 0.8 + preferredScore * 0.2;

  const matchedCerts: string[] = [];
  const missingCerts: string[] = [];
  for (const c of job.requiredCerts) {
    if (haveCerts.has(c.certification.name.toLowerCase())) {
      matchedCerts.push(c.certification.name);
    } else {
      missingCerts.push(c.certification.name);
    }
  }
  // A job that requires no certification has nothing to satisfy, so the
  // certification component is dropped and its weight is redistributed across
  // the components that do apply. Previously it scored 0/1 = 0%, silently
  // capping every candidate at 75% and making `strongCandidateCount` (>= 80)
  // permanently zero for such roles.
  const certRequired = job.requiredCerts.length > 0;
  const certScore = certRequired
    ? (matchedCerts.length / job.requiredCerts.length) * 100
    : 0;

  const experienceGapMonths = Math.max(0, job.minExperience - totalMonths);
  const expScore = job.minExperience === 0
    ? 100
    : Math.min(100, (totalMonths / job.minExperience) * 100);

  const components = [
    { value: skillScore, weight: 0.55, applicable: true },
    { value: certScore, weight: 0.25, applicable: certRequired },
    { value: expScore, weight: 0.2, applicable: true },
  ].filter((component) => component.applicable);

  const totalWeight = components.reduce((sum, component) => sum + component.weight, 0);

  const overall = Math.round(
    components.reduce((sum, component) => sum + component.value * component.weight, 0) / totalWeight
  );

  const parts: string[] = [];
  parts.push(
    matchedSkills.length
      ? `Matches ${matchedSkills.length}/${job.requiredSkills.length} required skills (${matchedSkills.join(", ")}).`
      : `Matches none of the ${job.requiredSkills.length} required skills yet.`
  );
  if (missingSkills.length) parts.push(`Missing: ${missingSkills.join(", ")}.`);
  if (job.requiredCerts.length) {
    parts.push(
      missingCerts.length
        ? `Missing certification(s): ${missingCerts.join(", ")}.`
        : `Holds all required certifications.`
    );
  }
  if (experienceGapMonths > 0) {
    parts.push(`Needs ${experienceGapMonths} more month(s) of relevant experience.`);
  }

  return {
    score: Math.max(0, Math.min(100, overall)),
    matchedSkills,
    missingSkills,
    matchedCerts,
    missingCerts,
    experienceGapMonths,
    explanation: parts.join(" "),
  };
}

export function readinessBand(score: number): { label: string; color: string } {
  if (score >= 80) return { label: "Career Ready", color: "emerald" };
  if (score >= 55) return { label: "Developing", color: "amber" };
  return { label: "Early Stage", color: "rose" };
}

// ---------------------------------------------------------------------------
// Career interests: gap analysis for a favorited track/company + matching
// university offerings to close those gaps. This is what powers "if the
// student already fits, surface the match; if they're a few skills short,
// recommend the course/certification that gets them there."
// ---------------------------------------------------------------------------

export interface TrackGaps {
  missingSkillNames: string[];
  missingCertNames: string[];
}

/**
 * Structured version of the readiness gap analysis, for a given (possibly
 * non-primary) track. Uses the same "requirement met" threshold as the
 * readiness score, so a gap listed here is exactly a gap the score penalizes.
 */
export function getTrackGaps(student: StudentForScoring, track: CareerTrack): TrackGaps {
  const core = computeCareerReadiness(toReadinessEvidence(student), toReadinessTrack(track));

  return {
    missingSkillNames: core.missingSkills.map((entry) => entry.name),
    missingCertNames: core.missingCertifications.map((entry) => entry.name),
  };
}

export type OfferingForMatching = {
  id: string;
  title: string;
  type: string;
  url: string | null;
  university: { institution: string };
  skills: { skill: { name: string } }[];
  certification: { name: string } | null;
};

export interface OfferingMatch {
  offering: OfferingForMatching;
  coveredSkillNames: string[];
  coversCertification: boolean;
}

/** Rank university offerings by how many of the given gaps they close. */
export function matchOfferingsToGaps(gaps: TrackGaps, offerings: OfferingForMatching[]): OfferingMatch[] {
  const missingSkillsLower = new Set(gaps.missingSkillNames.map((s) => s.toLowerCase()));
  const missingCertsLower = new Set(gaps.missingCertNames.map((c) => c.toLowerCase()));

  const results: OfferingMatch[] = [];
  for (const offering of offerings) {
    const coveredSkillNames = offering.skills
      .map((s) => s.skill.name)
      .filter((name) => missingSkillsLower.has(name.toLowerCase()));
    const coversCertification = offering.certification
      ? missingCertsLower.has(offering.certification.name.toLowerCase())
      : false;

    if (coveredSkillNames.length > 0 || coversCertification) {
      results.push({ offering, coveredSkillNames, coversCertification });
    }
  }

  return results.sort(
    (a, b) =>
      b.coveredSkillNames.length + (b.coversCertification ? 1 : 0) - (a.coveredSkillNames.length + (a.coversCertification ? 1 : 0))
  );
}
