// ---------------------------------------------------------------------------
// Fursa AI Service client — drop into src/lib/aiService.ts
// ---------------------------------------------------------------------------
// Bridges the Next.js app to the FastAPI reasoning service (the real pipeline
// that src/lib/ai.ts stands in for). Functions accept the SAME shapes ai.ts
// already uses (StudentForScoring, JobForMatching, OfferingForMatching), so
// call sites need no data-shape changes — the Prisma->API mapping happens here.
//
// Setup:
//   1. Copy this file to src/lib/aiService.ts
//   2. Add to .env.local:   AI_SERVICE_URL=http://127.0.0.1:8000
//      (or http://<laptop-ip>:8000 when the AI service runs on another machine)
//
// Rules of engagement:
//   - SERVER-SIDE ONLY (server components, server actions, route handlers).
//     Never import from a "use client" component — calls take 15-35s and the
//     service URL should not be exposed to browsers.
//   - Keep using src/lib/ai.ts for list views and dashboards: it is instant
//     and deterministic. Call this service for DEEP views — one candidate,
//     one student, the intelligence page — where a 20s explainable answer is
//     worth a loading state. Deterministic layer + reasoning layer is the
//     architecture story, not a workaround.
// ---------------------------------------------------------------------------

import type {
  JobForMatching,
  OfferingForMatching,
  StudentForScoring,
} from "./ai";

const BASE = process.env.AI_SERVICE_URL ?? "http://127.0.0.1:8000";
const TIMEOUT_MS = 120_000;

// ---------------------------------------------------------------- transport

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`AI service ${path} -> HTTP ${res.status}: ${detail.slice(0, 300)}`);
  }
  return res.json() as Promise<T>;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`AI service ${path} -> HTTP ${res.status}: ${detail.slice(0, 300)}`);
  }
  return res.json() as Promise<T>;
}

// ------------------------------------------------- Prisma -> API mapping

const LEVELS = ["beginner", "beginner", "beginner", "intermediate", "advanced", "expert"] as const;

function toApiStudent(student: StudentForScoring) {
  return {
    target_role: student.targetCareer,
    skills: student.skills
      .filter((s) => s.skill.category !== "soft")
      .map((s) => ({
        name: s.skill.name,
        level: LEVELS[Math.max(0, Math.min(5, Math.round(s.level)))],
        verified: false,
      })),
    soft_skills: student.skills
      .filter((s) => s.skill.category === "soft")
      .map((s) => s.skill.name),
    certifications: student.certifications.map((c) => ({
      name: c.certification.name,
      verified: c.verificationStatus === "APPROVED",
    })),
    experience: student.experiences.map((e) => ({
      title: e.title,
      months: e.months,
      description: e.type,
    })),
    projects: student.projects.map((p) => ({ name: p.title })),
  };
}

function toApiJob(job: JobForMatching, title: string, employer?: string) {
  const essential = job.requiredSkills.filter(
    (r) => !r.requirementType || r.requirementType === "ESSENTIAL"
  );
  const preferred = job.requiredSkills.filter((r) => r.requirementType === "PREFERRED");
  return {
    title,
    employer,
    required_skills: essential.map((r) => r.skill.name),
    preferred_skills: preferred.map((r) => r.skill.name),
    required_certifications: job.requiredCerts.map((c) => c.certification.name),
    min_experience_months: job.minExperience,
    is_entry_level: job.minExperience <= 6,
  };
}

function toApiCourse(offering: OfferingForMatching) {
  return {
    course_id: offering.id,
    title: offering.title,
    provider: offering.university.institution,
    skills_taught: offering.skills.map((s) => s.skill.name),
    certification_awarded: offering.certification?.name ?? null,
    url: offering.url,
  };
}

// ------------------------------------------------------------ public API

/** Deep readiness analysis for ONE student (student profile page, "full report").
 *  Dashboards/lists should keep using computeReadinessScore from ai.ts. */
export function getDeepReadiness(student: StudentForScoring) {
  return post<{
    readiness_score: number;
    band: "early_stage" | "developing" | "job_ready" | "highly_competitive";
    breakdown: Record<string, { score: number; max: number; note: string }>;
    strengths: string[];
    weaknesses: string[];
    highest_impact_next_step: string | null;
    explanation: string;
  }>("/api/readiness-score", { student: toApiStudent(student) });
}

/** Explainable match for ONE candidate <-> ONE job (candidate detail page).
 *  Job lists should keep using computeJobMatch from ai.ts. */
export function getDeepMatch(
  student: StudentForScoring,
  job: JobForMatching,
  jobTitle: string,
  employer?: string
) {
  return post<{
    match_score: number;
    verdict: "strong_match" | "promising" | "developing" | "not_yet_ready";
    explanation: string;
    matched_skills: string[];
    gaps: {
      skill: string;
      importance: "critical" | "important" | "nice_to_have";
      closable_in_weeks: number | null;
    }[];
    breakdown: Record<string, { score: number; max: number; note: string }>;
    recommended_next_actions: string[];
    fairness_note: string | null;
  }>("/api/match", {
    job: toApiJob(job, jobTitle, employer),
    student: toApiStudent(student),
  });
}

/** Impact-ranked learning path from the student's gaps + university offerings
 *  (interests page — upgrade from matchOfferingsToGaps' count-based ranking). */
export function getRankedCourses(
  skillGaps: string[],
  offerings: OfferingForMatching[],
  student?: StudentForScoring,
  targetRole?: string
) {
  return post<{
    recommendations: {
      course_id: string | null;
      title: string;
      rank: number;
      closes_gaps: string[];
      impact_score: number;
      rationale: string;
      estimated_readiness_gain: number | null;
      sequence_note: string | null;
    }[];
    uncovered_gaps: string[];
    learning_path_summary: string | null;
  }>("/api/recommend-courses", {
    skill_gaps: skillGaps,
    course_catalog: offerings.map(toApiCourse),
    student: student ? toApiStudent(student) : undefined,
    target_role: targetRole,
    max_recommendations: 5,
  });
}

/** Grounded Q&A over the 19 Saudi policy documents, with KB citations
 *  (workforce-intelligence page). */
export function askKnowledgeBase(question: string) {
  return post<{
    answer: string;
    citations: string[];
    confidence: "high" | "medium" | "low";
    grounded: boolean;
    follow_up_questions: string[];
    sources: {
      kb_id: string;
      title: string;
      source: string;
      url: string;
      relevance: number;
      excerpt: string;
    }[];
  }>("/api/ask-kb", { question });
}

/** Skill demand forecast (workforce-intelligence page). Cached server-side
 *  after the first call, so subsequent renders are instant. */
export function getSkillTrends(horizonMonths = 12) {
  return get<{
    trending_up: { skill: string; growth_rate: number; interpretation: string }[];
    trending_down: { skill: string; growth_rate: number; interpretation: string }[];
    emerging: { skill: string; signal: string; why_it_matters: string }[];
    curriculum_implications: string[];
    summary: string | null;
  }>(`/api/skill-trends?horizon_months=${horizonMonths}`);
}

/** Re-route a struggling learner. progressHistory rows are free-form; useful
 *  keys: course_id, title, skill, status, score, attempts, time_spent_hours. */
export function getAdaptivePath(
  student: StudentForScoring,
  progressHistory: Record<string, unknown>[],
  currentPath: string[] = []
) {
  return post<{
    status: "on_track" | "at_risk" | "struggling" | "ready_to_accelerate";
    diagnosis: string;
    alternative_paths: {
      name: string;
      approach: string;
      why_this_fits: string;
      first_step: string;
      estimated_weeks: number;
    }[];
    recommended_adjustments: string[];
    motivation_note: string | null;
  }>("/api/adaptive-path", {
    student: toApiStudent(student),
    progress_history: progressHistory,
    current_path: currentPath,
  });
}

/** Liveness probe — render a status badge, or fall back to ai.ts when down. */
export async function aiServiceHealthy(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/api/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(3_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
