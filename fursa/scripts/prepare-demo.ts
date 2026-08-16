/**
 * Demo readiness report.
 *
 * Students only ever see a job when it is `open` AND its employer is APPROVED
 * (see src/app/student/jobs/page.tsx). A freshly signed-up employer defaults to
 * PENDING, so their jobs stay invisible until an administrator approves them.
 * That is the intended human-oversight workflow — this script just reports on
 * it, and can apply the approval in bulk when preparing a demo environment.
 *
 *   npx tsx scripts/prepare-demo.ts            # report only, changes nothing
 *   npx tsx scripts/prepare-demo.ts --approve  # approve pending employers
 *
 * Runs against whatever DATABASE_URL / TURSO_AUTH_TOKEN are set, so double
 * check which database is configured before passing --approve.
 */

import { prisma } from "../src/lib/db";
import { computeJobMatch } from "../src/lib/ai";
import { MIN_COHORT } from "../src/lib/cohort";

const APPLY = process.argv.includes("--approve");
const SEED_COHORTS = process.argv.includes("--seed-cohorts");

/**
 * Cohort readiness is withheld below MIN_COHORT students so aggregates cannot
 * re-identify individuals. Demo data spread thinly across many institutions
 * leaves every registered university under that floor, so the page only ever
 * shows the suppression notice. This assigns enough students to each
 * registered university to exercise the real view.
 */
async function seedCohorts() {
  const universities = await prisma.university.findMany();
  if (!universities.length) {
    console.log("\nNo registered universities; nothing to balance.");
    return;
  }
  const students = await prisma.student.findMany({ select: { id: true, university: true } });
  console.log(`\nBalancing ${students.length} student(s) across ${universities.length} registered institution(s)`);

  for (const university of universities) {
    const already = students.filter((s) => (s.university ?? "").trim().toLowerCase() === university.institution.toLowerCase());
    const need = MIN_COHORT - already.length;
    if (need <= 0) {
      console.log(`  ${university.institution}: ${already.length} students, already at or above ${MIN_COHORT}`);
      continue;
    }
    // Recomputed each pass, so students reassigned above are already excluded.
    const reassignable = students.filter(
      (s) => !universities.some((u) => u.institution.toLowerCase() === (s.university ?? "").trim().toLowerCase()),
    );
    const taking = reassignable.slice(0, need).map((s) => s.id);
    const short = need - taking.length;
    if (taking.length) {
      await prisma.student.updateMany({ where: { id: { in: taking } }, data: { university: university.institution } });
      // keep the local snapshot in sync for the next institution's calculation
      for (const s of students) if (taking.includes(s.id)) s.university = university.institution;
    }
    console.log(
      `  ${university.institution}: ${already.length} -> ${already.length + taking.length} students` +
        (short > 0 ? ` (still ${short} short — not enough unassigned students)` : ""),
    );
  }
}

async function main() {
  const target = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  console.log(`Database: ${target.startsWith("file:") ? target : target.replace(/\/\/.*@/, "//<redacted>@")}`);
  console.log(APPLY ? "Mode: APPLY (will approve pending employers)\n" : "Mode: report only\n");

  const employers = await prisma.employer.findMany({
    include: { user: true, jobs: true },
    orderBy: { company: "asc" },
  });

  console.log("Employers");
  for (const employer of employers) {
    const open = employer.jobs.filter((job) => job.status === "open").length;
    const visible = employer.verificationStatus === "APPROVED" ? open : 0;
    console.log(
      `  ${employer.verificationStatus.padEnd(8)} ${employer.company.padEnd(28)} ${open} open job(s), ${visible} visible to students`,
    );
  }

  const pending = employers.filter((employer) => employer.verificationStatus !== "APPROVED");
  const hiddenJobs = pending.reduce((sum, employer) => sum + employer.jobs.filter((job) => job.status === "open").length, 0);

  if (pending.length) {
    console.log(
      `\n${pending.length} employer(s) are not approved, hiding ${hiddenJobs} open job(s) from every student.`,
    );
    if (APPLY) {
      const result = await prisma.employer.updateMany({
        where: { verificationStatus: { not: "APPROVED" } },
        data: { verificationStatus: "APPROVED" },
      });
      console.log(`Approved ${result.count} employer(s).`);
    } else {
      console.log("Re-run with --approve to approve them, or use /admin/dashboard → Pending employer accounts.");
    }
  } else {
    console.log("\nAll employers are approved; every open job is visible to students.");
  }

  // ---- Match spread ------------------------------------------------------
  const [students, jobs] = await Promise.all([
    prisma.student.findMany({
      include: {
        user: true,
        skills: { include: { skill: true } },
        certifications: { include: { certification: true } },
        experiences: true,
        projects: true,
      },
    }),
    prisma.job.findMany({
      where: { status: "open", ...(APPLY || !pending.length ? {} : { employer: { verificationStatus: "APPROVED" } }) },
      include: { requiredSkills: { include: { skill: true } }, requiredCerts: { include: { certification: true } } },
    }),
  ]);

  console.log(`\nMatch spread across ${students.length} student(s) and ${jobs.length} visible job(s)`);
  if (!jobs.length) {
    console.log("  No visible jobs — nothing to match against.");
  }
  for (const student of students.slice(0, 6)) {
    const scores = jobs
      .map((job) => computeJobMatch(student, job).score)
      .sort((a, b) => b - a);
    const best = scores[0] ?? 0;
    const flag = best >= 60 ? "strong" : best >= 30 ? "partial" : "weak";
    console.log(`  ${student.user.name.padEnd(24)} best ${String(best).padStart(3)}%  (${flag})  all: ${scores.join(", ") || "—"}`);
  }

  if (SEED_COHORTS) await seedCohorts();

  const offerings = await prisma.offering.count();
  const openRoles = await prisma.job.count({ where: { status: "open" } });
  console.log(`\nCurriculum inputs: ${offerings} offering(s), ${openRoles} open role(s) driving demand.`);
  if (!offerings) console.log("  Curriculum alignment will show an empty state until an offering exists.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
