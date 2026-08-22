/** Prints the post-login destination for every student, plus a simulated
 *  brand-new account, so the onboarding order can be checked directly. */

import { prisma } from "../src/lib/db";
import { studentLandingPath } from "../src/lib/studentOnboarding";

async function main() {
  const students = await prisma.student.findMany({
    include: {
      user: true,
      _count: { select: { skills: true, certifications: true, experiences: true, projects: true } },
    },
  });

  console.log("Existing students");
  for (const student of students) {
    const evidence =
      student._count.skills + student._count.certifications + student._count.experiences + student._count.projects;
    const path = await studentLandingPath(student.id);
    console.log(
      `  ${student.user.name.padEnd(22)} evidence=${String(evidence).padStart(2)} track=${student.targetCareer.padEnd(22)} → ${path}`,
    );
  }

  // A brand-new account: no evidence, no career chosen.
  //
  // The removal is in a `finally` because this account is a fixture living in
  // the same database the university cohort figures are computed from: if the
  // check between creation and deletion ever threw, the fixture would survive
  // as a student listing no institution, and the next run would leave another.
  // Test data that outlives its test becomes somebody's analytics.
  const email = `landing-check-${Date.now()}@example.test`;
  const created = await prisma.user.create({
    data: { role: "STUDENT", name: "Brand New", email, student: { create: { targetCareer: "undecided" } } },
    include: { student: true },
  });

  try {
    const newPath = await studentLandingPath(created.student!.id);
    console.log(`\nBrand-new account            evidence= 0 track=undecided             → ${newPath}`);
  } finally {
    await prisma.user.delete({ where: { id: created.id } }).catch((error) => {
      console.error("Failed to remove the temporary account; remove it manually:", email, error);
    });
    console.log("(temporary account removed)");
  }

  console.log(`\nExpected order: /student/profile?setup=passport → /student/interests?setup=career → /student/dashboard`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
