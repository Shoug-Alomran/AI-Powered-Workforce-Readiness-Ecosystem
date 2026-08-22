// ---------------------------------------------------------------------------
// Cohort readiness: aggregates the per-student readiness engine across an
// institution's students.
//
// Deliberately aggregate-only. The platform's stated position is that
// individual student records stay inside the student's own authorized views,
// so nothing here exposes a name, an email, or a per-person score.
//
// Suppression applies to EVERY reporting group, not just the cohort total.
// It previously applied only to `cohort.length`, which meant an institution
// that cleared the floor overall then published per-track rows like
// "Financial Analyst · 1 student · 46/100" — a single identifiable student's
// readiness score handed to their university. That contradicted clause 7 of
// the published Privacy Policy, which suppresses "where fewer than five
// students fall within a reporting group", and contradicted the platform's own
// governance scenario declaring a three-student distribution re-identifying.
//
// Two rules are applied:
//
//   1. Primary suppression — any group with fewer than MIN_COHORT students
//      reports `suppressed: true` and null statistics.
//   2. Secondary suppression — for groups that partition the whole cohort
//      (bands, tracks), suppressing exactly one group would leak it anyway,
//      because its count is the total minus every published group. Where that
//      happens the next-smallest reportable group is suppressed too, so no
//      suppressed value is recoverable by subtraction.
//
// Suppressed groups are returned rather than dropped, so the interface can say
// a figure was withheld for privacy instead of silently showing a shorter list
// that looks like an absence of data.
// ---------------------------------------------------------------------------

import { computeReadinessScore, getTrackGaps, readinessBand, type StudentForScoring } from "./ai";
import type { CareerTrack } from "./careerTracks";

/** Below this, aggregates are re-identifying rather than anonymising. */
export const MIN_COHORT = 5;

export type CohortStudent = StudentForScoring & { university: string | null };

/** Statistics are null exactly when `suppressed` is true. */
export type BandSummary = {
  label: string;
  count: number | null;
  sharePct: number | null;
  suppressed: boolean;
};

export type TrackSummary = {
  id: string;
  label: string;
  students: number | null;
  averageScore: number | null;
  topGap: string | null;
  suppressed: boolean;
};

export type GapSummary = {
  name: string;
  students: number | null;
  sharePct: number | null;
  suppressed: boolean;
};

export type CohortReadiness = {
  /** True when the cohort as a whole is large enough to report at all. */
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
  /** How many individual groups were withheld, across every breakdown. */
  suppressedGroupCount: number;
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

/**
 * Applies both suppression rules to a set of groups that partitions the cohort.
 *
 * `counts` is read through `countOf`, and `suppress` rebuilds a group in its
 * withheld form. Bands and tracks each cover every student exactly once, which
 * is what makes the subtraction attack possible and secondary suppression
 * necessary.
 */
function suppressPartition<T>(
  groups: T[],
  countOf: (group: T) => number,
  suppress: (group: T) => T,
): { groups: T[]; suppressedCount: number } {
  // Rule 1: anything under the floor.
  const flags = groups.map(group => countOf(group) < MIN_COHORT);

  // Rule 2: a lone suppressed group is recoverable as (cohort - the rest), so
  // withhold the smallest surviving group as well. Only meaningful when there
  // is another group left to publish.
  const suppressedCount = flags.filter(Boolean).length;
  if (suppressedCount === 1 && groups.length - suppressedCount >= 1) {
    let smallestIndex = -1;
    for (let index = 0; index < groups.length; index++) {
      if (flags[index]) continue;
      if (smallestIndex === -1 || countOf(groups[index]) < countOf(groups[smallestIndex])) {
        smallestIndex = index;
      }
    }
    if (smallestIndex !== -1) flags[smallestIndex] = true;
  }

  return {
    groups: groups.map((group, index) => (flags[index] ? suppress(group) : group)),
    suppressedCount: flags.filter(Boolean).length,
  };
}

/** Non-partitioning groups (gaps) need primary suppression only. */
function suppressIndependent<T>(
  groups: T[],
  countOf: (group: T) => number,
  suppress: (group: T) => T,
): { groups: T[]; suppressedCount: number } {
  let suppressedCount = 0;
  const out = groups.map(group => {
    if (countOf(group) >= MIN_COHORT) return group;
    suppressedCount += 1;
    return suppress(group);
  });
  return { groups: out, suppressedCount };
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
    suppressedGroupCount: 0,
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

  // ---- Bands (partition the cohort) ---------------------------------------
  const bandOrder = ["Career Ready", "Developing", "Early Stage"];
  const bandCounts = new Map<string, number>();
  for (const entry of scored) {
    const label = readinessBand(entry.score).label;
    bandCounts.set(label, (bandCounts.get(label) ?? 0) + 1);
  }
  const rawBands: BandSummary[] = bandOrder.map((label) => {
    const count = bandCounts.get(label) ?? 0;
    return { label, count, sharePct: Math.round((count / scored.length) * 100), suppressed: false };
  });
  // An empty band reveals nothing about anybody, so it stays publishable at
  // zero rather than being withheld as if it hid someone.
  const populatedBands = rawBands.filter((band) => (band.count ?? 0) > 0);
  const emptyBands = rawBands.filter((band) => (band.count ?? 0) === 0);
  const bandResult = suppressPartition<BandSummary>(
    populatedBands,
    (band) => band.count ?? 0,
    (band) => ({ ...band, count: null, sharePct: null, suppressed: true }),
  );
  const bands = bandOrder
    .map((label) => [...bandResult.groups, ...emptyBands].find((band) => band.label === label))
    .filter((band): band is BandSummary => Boolean(band));

  // ---- Per-track (partitions the cohort) ----------------------------------
  const byTrack = new Map<string, typeof scored>();
  for (const entry of scored) {
    const id = entry.track?.id ?? entry.student.targetCareer;
    byTrack.set(id, [...(byTrack.get(id) ?? []), entry]);
  }
  const rawTracks: TrackSummary[] = [...byTrack.entries()]
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
        suppressed: false,
      };
    })
    .sort((a, b) => (b.students ?? 0) - (a.students ?? 0));
  const trackResult = suppressPartition<TrackSummary>(
    rawTracks,
    (track) => track.students ?? 0,
    (track) => ({ ...track, students: null, averageScore: null, topGap: null, suppressed: true }),
  );

  // ---- Cohort-wide gaps (independent; a student can appear in many) --------
  function rollup(pick: (entry: (typeof scored)[number]) => string[]): GapSummary[] {
    const counts = new Map<string, number>();
    for (const entry of scored) {
      for (const name of new Set(pick(entry))) counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([name, students]) => ({
        name,
        students,
        sharePct: Math.round((students / scored.length) * 100),
        suppressed: false,
      }))
      .sort((a, b) => (b.students ?? 0) - (a.students ?? 0));
  }

  const gapResult = suppressIndependent<GapSummary>(
    rollup((entry) => entry.gaps.missingSkillNames),
    (gap) => gap.students ?? 0,
    (gap) => ({ ...gap, students: null, sharePct: null, suppressed: true }),
  );
  const certResult = suppressIndependent<GapSummary>(
    rollup((entry) => entry.gaps.missingCertNames),
    (gap) => gap.students ?? 0,
    (gap) => ({ ...gap, students: null, sharePct: null, suppressed: true }),
  );

  const suppressedGroupCount =
    bandResult.suppressedCount + trackResult.suppressedCount + gapResult.suppressedCount + certResult.suppressedCount;

  // The headline sentence may only quote a gap that survived suppression.
  const leadGap = gapResult.groups.find((gap) => !gap.suppressed);
  const readyBand = bands.find((band) => band.label === "Career Ready");
  const summary =
    `${cohort.length} students list ${institution}, averaging ${averageScore}/100 readiness` +
    (readyBand && !readyBand.suppressed ? `, with ${readyBand.sharePct}% already career ready.` : ".") +
    (leadGap
      ? ` The most widespread gap is ${leadGap.name}, missing for ${leadGap.students} student(s) (${leadGap.sharePct}%).`
      : ` No skill gap is shared by at least ${MIN_COHORT} students, so none can be reported.`) +
    (suppressedGroupCount > 0
      ? ` ${suppressedGroupCount} smaller group(s) are withheld because fewer than ${MIN_COHORT} students fall in them.`
      : "");

  return {
    reportable: true,
    students: cohort.length,
    averageScore,
    medianScore: median(scores),
    bands,
    tracks: trackResult.groups,
    gaps: gapResult.groups,
    certificationGaps: certResult.groups,
    suppressedGroupCount,
    summary,
  };
}
