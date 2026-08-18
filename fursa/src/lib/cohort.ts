// ---------------------------------------------------------------------------
// Cohort readiness: aggregates the per-student readiness engine across an
// institution's students.
//
// Deliberately aggregate-only. The platform's stated position is that
// individual student records stay inside the student's own authorized views,
// so nothing here exposes a name, an email, or a per-person score. A cohort
// smaller than MIN_COHORT is suppressed entirely rather than reported, because
// with three students a "band distribution" identifies them individually.
// ---------------------------------------------------------------------------

import { computeReadinessScore, getTrackGaps, readinessBand, type StudentForScoring } from "./ai";
import type { CareerTrack } from "./careerTracks";

/** Below this, aggregates are re-identifying rather than anonymising. */
export const MIN_COHORT = 5;

export type CohortStudent = StudentForScoring & { university: string | null };

export type BandSummary = { label: string; count: number; sharePct: number };
export type TrackSummary = {
  id: string;
  label: string;
  students: number;
  averageScore: number;
  topGap: string | null;
};
export type GapSummary = { name: string; students: number; sharePct: number };

export type CohortReadiness = {
  /** True when the cohort is large enough to report without re-identifying. */
  reportable: boolean;
  students: number;
  averageScore: number | null;
  medianScore: number | null;
  bands: BandSummary[];
  tracks: TrackSummary[];
  /** Skills the most students are short of, the curriculum signal. */
  gaps: GapSummary[];
  /** Certifications the most students are short of. */
  certificationGaps: GapSummary[];
  summary: string;
};

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export function computeCohortReadiness(input: {
  students: CohortStudent[];
  tracks: CareerTrack[];
  institution: string;
}): CohortReadiness {
  const { tracks, institution } = input;
  const institutionKey = normalize(institution);
  const cohort = input.students.filter((s) => s.university && normalize(s.university) === institutionKey);
  const trackById = new Map(tracks.map((track) => [track.id, track]));

  const empty: CohortReadiness = {
    reportable: false,
    students: cohort.length,
    averageScore: null,
    medianScore: null,
    bands: [],
    tracks: [],
    gaps: [],
    certificationGaps: [],
    summary: "",
  };

  if (!cohort.length) {
    return { ...empty, summary: `No students have listed ${institution} on their Skills Passport yet.` };
  }
  if (cohort.length < MIN_COHORT) {
    return {
      ...empty,
      summary: `${cohort.length} student(s) list ${institution}. Cohort reporting starts at ${MIN_COHORT} students, so aggregate figures cannot describe a group this small without identifying individuals.`,
    };
  }

  // ---- Per-student scoring (kept local; never returned) -------------------
  const scored = cohort.map((student) => {
    const track = trackById.get(student.targetCareer) ?? tracks[0];
    const readiness = track ? computeReadinessScore(student, track) : { score: 0 };
    const gaps = track ? getTrackGaps(student, track) : { missingSkillNames: [], missingCertNames: [] };
    return { student, track, score: readiness.score, gaps };
  });

  const scores = scored.map((entry) => entry.score);
  const averageScore = Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length);

  // ---- Bands --------------------------------------------------------------
  const bandOrder = ["Career Ready", "Developing", "Early Stage"];
  const bandCounts = new Map<string, number>();
  for (const entry of scored) {
    const label = readinessBand(entry.score).label;
    bandCounts.set(label, (bandCounts.get(label) ?? 0) + 1);
  }
  const bands: BandSummary[] = bandOrder.map((label) => {
    const count = bandCounts.get(label) ?? 0;
    return { label, count, sharePct: Math.round((count / scored.length) * 100) };
  });

  // ---- Per-track ----------------------------------------------------------
  const byTrack = new Map<string, typeof scored>();
  for (const entry of scored) {
    const id = entry.track?.id ?? entry.student.targetCareer;
    byTrack.set(id, [...(byTrack.get(id) ?? []), entry]);
  }
  const trackSummaries: TrackSummary[] = [...byTrack.entries()]
    .map(([id, entries]) => {
      const gapCounts = new Map<string, number>();
      for (const entry of entries) {
        for (const gap of entry.gaps.missingSkillNames) gapCounts.set(gap, (gapCounts.get(gap) ?? 0) + 1);
      }
      const topGap = [...gapCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
      return {
        id,
        label: entries[0].track?.label ?? id,
        students: entries.length,
        averageScore: Math.round(entries.reduce((sum, e) => sum + e.score, 0) / entries.length),
        topGap,
      };
    })
    .sort((a, b) => b.students - a.students);

  // ---- Cohort-wide gaps ---------------------------------------------------
  function rollup(pick: (entry: (typeof scored)[number]) => string[]): GapSummary[] {
    const counts = new Map<string, number>();
    for (const entry of scored) {
      for (const name of new Set(pick(entry))) counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([name, students]) => ({ name, students, sharePct: Math.round((students / scored.length) * 100) }))
      .sort((a, b) => b.students - a.students);
  }

  const gaps = rollup((entry) => entry.gaps.missingSkillNames);
  const certificationGaps = rollup((entry) => entry.gaps.missingCertNames);

  const leadGap = gaps[0];
  const readyShare = bands.find((band) => band.label === "Career Ready")?.sharePct ?? 0;
  const summary =
    `${cohort.length} students list ${institution}, averaging ${averageScore}/100 readiness, with ${readyShare}% already career ready.` +
    (leadGap
      ? ` The most widespread gap is ${leadGap.name}, missing for ${leadGap.students} student(s) (${leadGap.sharePct}%).`
      : " No skill gap is shared across the cohort.");

  return {
    reportable: true,
    students: cohort.length,
    averageScore,
    medianScore: median(scores),
    bands,
    tracks: trackSummaries,
    gaps,
    certificationGaps,
    summary,
  };
}
