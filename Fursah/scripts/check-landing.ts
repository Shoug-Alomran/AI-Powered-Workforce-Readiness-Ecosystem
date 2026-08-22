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
  const email = `landing-check-${Date.now()}@example.test`;
  const created = await prisma.user.create({
    data: { role: "STUDENT", name: "Brand New", email, student: { create: { targetCareer: "undecided" } } },
    include: { student: true },
  });
  const newPath = await studentLandingPath(created.student!.id);
  console.log(`\nBrand-new account            evidence= 0 track=undecided             → ${newPath}`);

  await prisma.user.delete({ where: { id: created.id } });
  console.log("(temporary account removed)");

  console.log(`\nExpected order: /student/profile?setup=passport → /student/interests?setup=career → /student/dashboard`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
