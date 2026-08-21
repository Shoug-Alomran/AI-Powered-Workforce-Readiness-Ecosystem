/**
 * Cohort suppression verification.
 *
 * Asserts that no university-facing reporting group publishes a statistic when
 * fewer than MIN_COHORT students fall in it, and that suppression is visible
 * rather than silent. Read-only.
 *
 *   npx tsx --require ./scripts/allow-server-only.cjs scripts/verify-privacy.ts
 *
 * The properties under test:
 *
 *   1. A cohort below the floor publishes nothing at all.
 *   2. Every band, track, skill gap and certification gap that survives is at
 *      or above the floor.
 *   3. Every suppressed group carries null statistics — not zero, which would
 *      be a false claim rather than a withheld one.
 *   4. Suppressed groups are still returned, so the interface can show that a
 *      figure was withheld instead of quietly shortening a list.
 *   5. A partition never leaves exactly one group suppressed, because its
 *      value would be recoverable by subtracting the published groups.
 *   6. The narrative summary quotes no suppressed figure.
 */
import { prisma } from "../src/lib/db";
import { computeCohortReadiness, MIN_COHORT, type CohortReadiness } from "../src/lib/cohort";
import { CAREER_TRACKS, type CareerTrack } from "../src/lib/careerTracks";
import { buildUniversityContext } from "../src/lib/assistant/context";

let failures = 0;
function check(label: string, condition: boolean, detail: string) {
  console.log(`${condition ? "  PASS" : "  FAIL"}  ${label} — ${detail}`);
  if (!condition) failures += 1;
}

type Group = { suppressed: boolean };

function auditGroups<T extends Group>(
  name: string,
  groups: T[],
  countOf: (group: T) => number | null,
  statsOf: (group: T) => (number | null)[],
) {
  const published = groups.filter(group => !group.suppressed);
  const withheld = groups.filter(group => group.suppressed);

  const tooSmall = published.filter(group => (countOf(group) ?? 0) < MIN_COHORT && (countOf(group) ?? 0) > 0);
  check(
    `${name}: nothing published below ${MIN_COHORT}`,
    tooSmall.length === 0,
    tooSmall.length ? `LEAKED ${tooSmall.length} group(s)` : `${published.length} published, all >= ${MIN_COHORT} or empty`,
  );

  const leakyNulls = withheld.filter(group => statsOf(group).some(value => value !== null));
  check(
    `${name}: withheld groups carry no statistics`,
    leakyNulls.length === 0,
    leakyNulls.length ? `${leakyNulls.length} withheld group(s) still expose a value` : `${withheld.length} withheld, all null`,
  );
}

async function auditInstitution(institution: string, cohort: CohortReadiness) {
  console.log(`\n=== ${institution} — ${cohort.students} student(s) ===`);

  if (!cohort.reportable) {
    check(
      "below-floor cohort publishes nothing",
      cohort.bands.length === 0 && cohort.tracks.length === 0 && cohort.gaps.length === 0 && cohort.averageScore === null,
      cohort.summary,
    );
    return;
  }

  console.log(`  average ${cohort.averageScore}/100 · ${cohort.suppressedGroupCount} group(s) withheld`);

  auditGroups("bands", cohort.bands, band => band.count, band => [band.count, band.sharePct]);
  auditGroups("tracks", cohort.tracks, track => track.students, track => [track.students, track.averageScore]);
  auditGroups("skill gaps", cohort.gaps, gap => gap.students, gap => [gap.students, gap.sharePct]);
  auditGroups("certification gaps", cohort.certificationGaps, gap => gap.students, gap => [gap.students, gap.sharePct]);

  // Secondary suppression: a partition with exactly one withheld group leaks it.
  for (const [name, groups] of [
    ["bands", cohort.bands.filter(band => band.count !== 0)],
    ["tracks", cohort.tracks],
  ] as const) {
    const withheld = groups.filter(group => group.suppressed).length;
    check(
      `${name}: no partition leaves exactly one group withheld`,
      withheld !== 1,
      withheld === 1 ? "single withheld group is recoverable by subtraction" : `${withheld} withheld of ${groups.length}`,
    );
  }

  // Suppression has to be visible, not a shorter list.
  const hasWithheld = cohort.suppressedGroupCount > 0;
  check(
    "withheld groups are still returned for the interface to label",
    !hasWithheld ||
      cohort.bands.some(b => b.suppressed) ||
      cohort.tracks.some(t => t.suppressed) ||
      cohort.gaps.some(g => g.suppressed) ||
      cohort.certificationGaps.some(g => g.suppressed),
    hasWithheld ? `${cohort.suppressedGroupCount} withheld group(s) present in the payload` : "nothing withheld here",
  );

  // The summary sentence must not quote a figure that was withheld.
  const suppressedNames = [...cohort.tracks, ...cohort.gaps.map(g => ({ label: g.name, suppressed: g.suppressed }))]
    .filter(group => group.suppressed)
    .map(group => ("label" in group ? group.label : ""))
    .filter(Boolean);
  const quoted = suppressedNames.filter(name => cohort.summary.includes(name));
  check(
    "summary quotes no withheld group",
    quoted.length === 0,
    quoted.length ? `quotes ${quoted.join(", ")}` : "summary references reportable figures only",
  );
}

/**
 * The taxonomy, read straight from the database.
 *
 * `getAllCareerTracksAsync` wraps the same query in `unstable_cache`, which
 * needs a Next request context and throws outside one. This script runs under
 * plain tsx, so it reads the rows directly and falls back to the seed
 * constant, which is what that helper does anyway.
 */
async function loadTracks(): Promise<CareerTrack[]> {
  const rows = await prisma.careerTrack.findMany({
    include: { trackSkills: { include: { skill: true } }, trackCerts: { include: { certification: true } } },
    orderBy: { label: "asc" },
  });
  if (!rows.length) return CAREER_TRACKS;
  return rows.map(row => ({
    id: row.id,
    label: row.label,
    recommendedExperienceMonths: row.recommendedExperienceMonths,
    technicalSkills: row.trackSkills
      .filter(entry => entry.category === "technical")
      .map(entry => ({ name: entry.skill.name, weight: Math.min(3, Math.max(1, entry.weight)) as 1 | 2 | 3 })),
    softSkills: row.trackSkills
      .filter(entry => entry.category === "soft")
      .map(entry => ({ name: entry.skill.name, weight: Math.min(3, Math.max(1, entry.weight)) as 1 | 2 | 3 })),
    certifications: row.trackCerts.map(entry => entry.certification.name),
  }));
}

async function main() {
  const [students, universities, tracks] = await Promise.all([
    prisma.student.findMany({
      select: {
        targetCareer: true,
        university: true,
        skills: { include: { skill: true } },
        certifications: { include: { certification: true } },
        experiences: true,
        projects: true,
      },
    }),
    prisma.university.findMany(),
    loadTracks(),
  ]);

  console.log(`Suppression floor: ${MIN_COHORT} students per reporting group`);

  for (const university of universities) {
    const cohort = computeCohortReadiness({ students, tracks, institution: university.institution });
    await auditInstitution(university.institution, cohort);
  }

  // A synthetic institution that cannot possibly clear the floor.
  const tiny = computeCohortReadiness({ students, tracks, institution: "Institution With No Students" });
  await auditInstitution("Institution With No Students (control)", tiny);

  // The assistant must receive the same withheld markers, never raw numbers.
  console.log("\n=== assistant grounding pack ===");
  for (const university of universities) {
    const context = await buildUniversityContext(university.id);
    const blob = JSON.stringify(context.facts);
    const cohort = computeCohortReadiness({ students, tracks, institution: university.institution });

    const suppressedTracks = cohort.tracks.filter(track => track.suppressed);
    const leaked = suppressedTracks.filter(track => {
      const marker = `"careerTrack":"${track.label}"`;
      const at = blob.indexOf(marker);
      if (at === -1) return false;
      return !blob.slice(at, at + 220).includes('"withheld":true');
    });
    check(
      `${university.institution}: withheld tracks reach the model as {withheld:true}`,
      leaked.length === 0,
      leaked.length ? `LEAKED ${leaked.map(t => t.label).join(", ")}` : `${suppressedTracks.length} withheld track(s) marked`,
    );

    const named = students
      .map(student => student.university)
      .filter(Boolean)
      .length;
    void named;
  }

  console.log(`\n${failures === 0 ? "ALL PRIVACY CHECKS PASSED" : `${failures} PRIVACY CHECK(S) FAILED`}`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main()
  .catch(error => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
