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

/**
 * How recently someone must have graduated to count as a recent graduate.
 *
 * Stated as a number rather than left implicit because the student is shown the
 * rule that decides whether a role is flagged as welcoming them, and a rule a
 * person cannot see is one they cannot check. Someone still studying counts:
 * graduate schemes are applied to before graduation, not after.
 */
export const RECENT_GRADUATE_YEARS = 2;

/**
 * Whether a graduation year makes someone a recent graduate right now.
 *
 * Never inferred. It reads only the year the student typed on their own
 * passport, and returns false when they have not said, so an absent answer is
 * treated as unknown rather than as "no".
 */
export function isRecentGraduate(graduationYear: number | null | undefined, now = new Date()): boolean {
  if (!graduationYear || !Number.isFinite(graduationYear)) return false;
  const currentYear = now.getFullYear();
  // Still to graduate, or graduated within the window.
  return graduationYear >= currentYear - RECENT_GRADUATE_YEARS;
}
