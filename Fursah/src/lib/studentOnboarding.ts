import { prisma } from "./db";

/**
 * Where a student should land after signing in.
 *
 * A brand-new student has nothing to score yet, so sending them to the
 * dashboard shows an empty readiness ring and explains nothing. They go to the
 * Skills Passport first to enter their evidence, then choose a career
 * direction, and only then to the dashboard that scores one against the other.
 *
 * Every sign-in path (demo login, Firebase sign-in, account creation) resolves
 * its destination here so the three cannot drift apart.
 */
export async function studentLandingPath(studentId: string): Promise<string> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: {
      targetCareer: true,
      _count: { select: { skills: true, certifications: true, experiences: true, projects: true } },
    },
  });

  if (!student) return "/student/dashboard";

  const evidenceCount =
    student._count.skills + student._count.certifications + student._count.experiences + student._count.projects;

  if (evidenceCount === 0) return "/student/profile?setup=passport";
  if (student.targetCareer === "undecided") return "/student/interests?setup=career";
  return "/student/dashboard";
}
