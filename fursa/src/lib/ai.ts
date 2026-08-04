// ---------------------------------------------------------------------------
// Fursa AI Engine
// ---------------------------------------------------------------------------
// A transparent, rule-based scoring engine that stands in for the platform's
// AI/ML pipeline described in the proposal (ITU-T Y.3172-style stages:
// data collection -> feature engineering -> model scoring -> monitoring).
// Every score returned here comes with a human-readable explanation, in line
// with the "Explainable AI" and "Human oversight" principles in the README.
// ---------------------------------------------------------------------------

import type { CareerTrack } from "./careerTracks";

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

const WEIGHTS = {
  technicalSkills: 0.35,
  softSkills: 0.15,
  certifications: 0.2,
  experience: 0.2,
  projects: 0.1,
};

/**
 * Career Readiness Score (0-100).
 * Mirrors the "Feature Engineering" stage of the ML pipeline: raw profile
 * data is converted into normalized indicators (skills competency, cert
 * relevance, experience relevance, portfolio strength) which are then
 * combined into a single explainable score.
 */
export function computeReadinessScore(student: StudentForScoring, track: CareerTrack): ReadinessResult {
  // --- Technical skills coverage ---
  const techTotal = track.technicalSkills.reduce((s, x) => s + x.weight, 0) || 1;
  let techEarned = 0;
  const haveSkillMap = new Map(
    student.skills.map((s) => [s.skill.name.toLowerCase(), s.level])
  );
  for (const req of track.technicalSkills) {
    const level = haveSkillMap.get(req.name.toLowerCase());
    if (level) techEarned += req.weight * Math.min(level / 5, 1);
  }
  const techScore = Math.round((techEarned / techTotal) * 100);

  // --- Soft skills coverage ---
  const softTotal = track.softSkills.reduce((s, x) => s + x.weight, 0) || 1;
  let softEarned = 0;
  for (const req of track.softSkills) {
    const level = haveSkillMap.get(req.name.toLowerCase());
    if (level) softEarned += req.weight * Math.min(level / 5, 1);
  }
  const softScore = Math.round((softEarned / softTotal) * 100);

  // --- Certifications coverage ---
  const haveCerts = new Set(
    student.certifications.filter((c) => !c.verificationStatus || c.verificationStatus === "APPROVED").map((c) => c.certification.name.toLowerCase())
  );
  const certTotal = track.certifications.length || 1;
  const certEarned = track.certifications.filter((c) =>
    haveCerts.has(c.toLowerCase())
  ).length;
  const certScore = Math.round((certEarned / certTotal) * 100);

  // --- Experience coverage ---
  const totalMonths = student.experiences.reduce((s, e) => s + e.months, 0);
  const expScore = Math.min(
    100,
    Math.round((totalMonths / Math.max(track.recommendedExperienceMonths, 1)) * 100)
  );

  // --- Portfolio / projects ---
  const projectScore = Math.min(100, student.projects.length * 34);

  const breakdown: ReadinessBreakdown[] = [
    {
      category: "Technical Skills",
      score: techScore,
      weight: WEIGHTS.technicalSkills,
      detail: `${track.technicalSkills.filter((r) => haveSkillMap.has(r.name.toLowerCase())).length}/${track.technicalSkills.length} target skills present`,
    },
    {
      category: "Soft Skills",
      score: softScore,
      weight: WEIGHTS.softSkills,
      detail: `${track.softSkills.filter((r) => haveSkillMap.has(r.name.toLowerCase())).length}/${track.softSkills.length} target soft skills present`,
    },
    {
      category: "Certifications",
      score: certScore,
      weight: WEIGHTS.certifications,
      detail: `${certEarned}/${certTotal} recommended certifications earned`,
    },
    {
      category: "Experience",
      score: expScore,
      weight: WEIGHTS.experience,
      detail: `${totalMonths} of ${track.recommendedExperienceMonths} recommended months completed`,
    },
    {
      category: "Portfolio & Projects",
      score: projectScore,
      weight: WEIGHTS.projects,
      detail: `${student.projects.length} project(s) documented`,
    },
  ];

  const overall = Math.round(
    breakdown.reduce((sum, b) => sum + b.score * b.weight, 0)
  );

  const nextActions = buildNextActions(student, track, haveSkillMap, haveCerts);

  return { score: overall, breakdown, nextActions };
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
  requiredSkills: { weight: number; skill: { name: string } }[];
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
  let skillEarned = 0;
  const skillTotal = job.requiredSkills.reduce((s, r) => s + r.weight, 0) || 1;
  for (const r of job.requiredSkills) {
    const level = haveSkillMap.get(r.skill.name.toLowerCase());
    if (level) {
      matchedSkills.push(r.skill.name);
      skillEarned += r.weight * Math.min(level / 5, 1);
    } else {
      missingSkills.push(r.skill.name);
    }
  }
  const skillScore = (skillEarned / skillTotal) * 100;

  const matchedCerts: string[] = [];
  const missingCerts: string[] = [];
  for (const c of job.requiredCerts) {
    if (haveCerts.has(c.certification.name.toLowerCase())) {
      matchedCerts.push(c.certification.name);
    } else {
      missingCerts.push(c.certification.name);
    }
  }
  const certTotal = job.requiredCerts.length || 1;
  const certScore = (matchedCerts.length / certTotal) * 100;

  const experienceGapMonths = Math.max(0, job.minExperience - totalMonths);
  const expScore = job.minExperience === 0
    ? 100
    : Math.min(100, (totalMonths / job.minExperience) * 100);

  const overall = Math.round(
    skillScore * 0.55 + certScore * 0.25 + expScore * 0.2
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

/** Structured version of the readiness gap analysis, for a given (possibly non-primary) track. */
export function getTrackGaps(student: StudentForScoring, track: CareerTrack): TrackGaps {
  const haveSkillMap = new Map(student.skills.map((s) => [s.skill.name.toLowerCase(), s.level]));
  const haveCerts = new Set(
    student.certifications
      .filter((c) => !c.verificationStatus || c.verificationStatus === "APPROVED")
      .map((c) => c.certification.name.toLowerCase())
  );

  const missingSkillNames = [...track.technicalSkills, ...track.softSkills]
    .filter((req) => (haveSkillMap.get(req.name.toLowerCase()) ?? 0) < 3)
    .map((req) => req.name);

  const missingCertNames = track.certifications.filter((c) => !haveCerts.has(c.toLowerCase()));

  return { missingSkillNames, missingCertNames };
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
