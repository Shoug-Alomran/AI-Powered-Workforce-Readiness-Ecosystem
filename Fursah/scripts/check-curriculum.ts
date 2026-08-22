/** Prints the computed curriculum intelligence for every university, so the
 *  figures the page renders can be checked against the database directly. */

import { prisma } from "../src/lib/db";
import { computeCurriculumIntelligence } from "../src/lib/curriculum";

async function main() {
  const universities = await prisma.university.findMany();
  const [jobs, tracks, students, certifications] = await Promise.all([
    prisma.job.findMany({
      where: { status: "open", employer: { verificationStatus: "APPROVED" } },
      include: { requiredSkills: { include: { skill: true } }, requiredCerts: { include: { certification: true } } },
    }),
    prisma.careerTrack.findMany({ include: { trackSkills: { include: { skill: true } } } }),
    prisma.student.findMany({ select: { targetCareer: true, university: true } }),
    prisma.certification.findMany(),
  ]);

  for (const university of universities) {
    const offerings = await prisma.offering.findMany({
      where: { universityId: university.id },
      include: { skills: { include: { skill: true } }, certification: true },
    });
    const intel = computeCurriculumIntelligence({
      offerings,
      jobs,
      tracks,
      students,
      certifications,
      institution: university.institution,
    });

    console.log(`\n=== ${university.institution}`);
    console.log(`summary: ${intel.summary}`);
    console.log(`coverage: ${intel.coveragePct}%  counts:`, intel.counts, `students: ${intel.studentsAtInstitution}`);
    console.log(`top demand: ${intel.demandSkills.slice(0, 5).map((s) => `${s.name}(${Math.round(s.weight)}${s.covered ? "✓" : "✗"})`).join(", ")}`);
    console.log(`gaps: ${intel.gaps.slice(0, 4).map((g) => g.name).join(", ") || "none"}`);
    console.log(`categories:`, intel.byCategory);
    for (const insight of intel.offerings.slice(0, 3)) {
      console.log(`  · ${insight.offering.title} — alignment ${insight.alignmentPct}% | demand share ${insight.demandSharePct}% | students ${insight.studentsTargeting}`);
      console.log(`    tracks: ${insight.trackImpact.map((t) => `${t.label} ${t.coveragePct}%`).join(", ") || "none"}`);
      console.log(`    analysis: ${insight.analysis}`);
    }
    console.log(`certs: ${intel.certifications.slice(0, 4).map((c) => `${c.name}[${c.demandCount} roles,${c.offered ? "offered" : "gap"}]`).join(", ") || "none"}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
