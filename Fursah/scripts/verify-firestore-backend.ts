import "server-only";

import { prisma } from "../src/lib/db";

async function verify() {
  if (process.env.DATA_BACKEND !== "firestore") throw new Error("Set DATA_BACKEND=firestore for this verification");

  const [users, students, jobs, applications, tracks] = await Promise.all([
    prisma.user.findMany({ include: { student: true, employer: true, university: true } }),
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
      where: { status: "open" },
      include: {
        employer: true,
        requiredSkills: { include: { skill: true } },
        requiredCerts: { include: { certification: true } },
        applications: { include: { student: { include: { user: true } } } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.application.findMany({ include: { student: { include: { user: true } }, job: true } }),
    prisma.careerTrack.findMany({ include: { trackSkills: { include: { skill: true } }, trackCerts: { include: { certification: true } } } }),
  ]);

  const invalid = [
    users.some((user) => !user.id || !user.email),
    students.some((student) => !student.user || student.skills.some((entry) => !entry.skill)),
    jobs.some((job) => !job.employer || job.requiredSkills.some((entry) => !entry.skill)),
    applications.some((application) => !application.student.user || !application.job),
    tracks.some((track) => track.trackSkills.some((entry) => !entry.skill)),
  ].some(Boolean);

  console.log({
    users: users.length,
    students: students.length,
    openJobs: jobs.length,
    applications: applications.length,
    careerTracks: tracks.length,
  });
  if (invalid) throw new Error("Firestore relation hydration verification failed");
}

verify()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
