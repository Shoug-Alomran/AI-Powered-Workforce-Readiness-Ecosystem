"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentStudent } from "@/lib/session";
import { getFirebaseAdminDb } from "@/lib/firebase-admin";
import { uploadPrivateCertificate } from "@/lib/r2";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";

async function requireStudent() {
  const ctx = await getCurrentStudent();
  if (!ctx) throw new Error("Not signed in as a student");
  return ctx.student;
}

export async function updateStudentProfile(formData: FormData) {
  const student = await requireStudent();
  const targetCareer = String(formData.get("targetCareer") ?? student.targetCareer);
  const university = String(formData.get("university") ?? "").trim();
  const degree = String(formData.get("degree") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();

  await prisma.student.update({
    where: { id: student.id },
    data: {
      targetCareer,
      university: university || null,
      degree: degree || null,
      bio: bio || null,
    },
  });

  revalidatePath("/student/dashboard");
  revalidatePath("/student/profile");
}

export async function addOrUpdateSkill(formData: FormData) {
  const student = await requireStudent();
  const skillName = String(formData.get("skillName") ?? "").trim();
  const category = String(formData.get("category") ?? "technical");
  const level = Math.min(5, Math.max(1, Number(formData.get("level") ?? 3)));
  if (!skillName) return;

  const skill = await prisma.skill.upsert({
    where: { name: skillName },
    update: {},
    create: { name: skillName, category },
  });

  await prisma.studentSkill.upsert({
    where: { studentId_skillId: { studentId: student.id, skillId: skill.id } },
    update: { level },
    create: { studentId: student.id, skillId: skill.id, level },
  });

  revalidatePath("/student/dashboard");
  revalidatePath("/student/profile");
}

export async function removeSkill(formData: FormData) {
  const student = await requireStudent();
  const skillId = String(formData.get("skillId") ?? "");
  if (!skillId) return;
  await prisma.studentSkill.deleteMany({ where: { studentId: student.id, skillId } });
  revalidatePath("/student/profile");
  revalidatePath("/student/dashboard");
}

export async function addCertification(formData: FormData) {
  const ctx = await getCurrentStudent();
  if (!ctx) throw new Error("Not signed in as a student");
  const student = ctx.student;
  const name = String(formData.get("certName") ?? "").trim();
  const evidence = formData.get("evidence");
  if (!name) throw new Error("Certification name is required");
  if (!(evidence instanceof File) || evidence.size === 0) throw new Error("A certificate image is required");
  const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
  if (!allowedTypes.has(evidence.type)) throw new Error("Upload a JPG, PNG, or WebP image");
  if (evidence.size > 5 * 1024 * 1024) throw new Error("Certificate image must be 5 MB or smaller");

  const cert = await prisma.certification.upsert({
    where: { name },
    update: {},
    create: { name },
  });

  const extension = evidence.type === "image/png" ? "png" : evidence.type === "image/webp" ? "webp" : "jpg";
  const evidencePath = `certificate-evidence/${ctx.user.id}/${randomUUID()}.${extension}`;
  try {
    await uploadPrivateCertificate(evidencePath, new Uint8Array(await evidence.arrayBuffer()), evidence.type);
  } catch (error) {
    console.error("Certificate evidence upload failed", error);
    redirect("/student/profile?upload=storage-unavailable");
  }

  const submission = await prisma.studentCertification.upsert({
    where: { studentId_certificationId: { studentId: student.id, certificationId: cert.id } },
    update: { evidencePath, evidenceName: evidence.name, evidenceType: evidence.type, verificationStatus: "PENDING", reviewNote: null, reviewedAt: null, reviewedBy: null },
    create: { studentId: student.id, certificationId: cert.id, evidencePath, evidenceName: evidence.name, evidenceType: evidence.type, verificationStatus: "PENDING" },
  });
  await getFirebaseAdminDb().collection("users").doc(ctx.user.id).collection("certifications").doc(submission.id).set({
    id: submission.id, certificationId: cert.id, name, evidencePath, evidenceName: evidence.name,
    verificationStatus: "PENDING", submittedAt: new Date().toISOString(),
  }, { merge: true });

  revalidatePath("/student/dashboard");
  revalidatePath("/student/profile");
}

export async function removeCertification(formData: FormData) {
  const student = await requireStudent();
  const certificationId = String(formData.get("certificationId") ?? "");
  if (!certificationId) return;
  await prisma.studentCertification.deleteMany({
    where: { studentId: student.id, certificationId },
  });
  revalidatePath("/student/profile");
  revalidatePath("/student/dashboard");
}

export async function addExperience(formData: FormData) {
  const student = await requireStudent();
  const type = String(formData.get("type") ?? "internship");
  const title = String(formData.get("title") ?? "").trim();
  const org = String(formData.get("org") ?? "").trim();
  const months = Math.max(1, Number(formData.get("months") ?? 1));
  if (!title) return;

  await prisma.experience.create({
    data: { studentId: student.id, type, title, org: org || null, months },
  });

  revalidatePath("/student/dashboard");
  revalidatePath("/student/profile");
}

export async function removeExperience(formData: FormData) {
  const student = await requireStudent();
  const id = String(formData.get("experienceId") ?? "");
  if (!id) return;
  await prisma.experience.deleteMany({ where: { id, studentId: student.id } });
  revalidatePath("/student/profile");
  revalidatePath("/student/dashboard");
}

export async function addProject(formData: FormData) {
  const student = await requireStudent();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!title) return;

  await prisma.project.create({
    data: { studentId: student.id, title, description: description || null },
  });

  revalidatePath("/student/dashboard");
  revalidatePath("/student/profile");
}

export async function removeProject(formData: FormData) {
  const student = await requireStudent();
  const id = String(formData.get("projectId") ?? "");
  if (!id) return;
  await prisma.project.deleteMany({ where: { id, studentId: student.id } });
  revalidatePath("/student/profile");
  revalidatePath("/student/dashboard");
}

export async function applyToJob(formData: FormData) {
  const student = await requireStudent();
  const jobId = String(formData.get("jobId") ?? "");
  if (!jobId) return;

  const { computeJobMatch } = await import("@/lib/ai");
  const [studentFull, job] = await Promise.all([
    prisma.student.findUniqueOrThrow({
      where: { id: student.id },
      include: {
        skills: { include: { skill: true } },
        certifications: { include: { certification: true } },
        experiences: true,
        projects: true,
      },
    }),
    prisma.job.findUniqueOrThrow({
      where: { id: jobId },
      include: { requiredSkills: { include: { skill: true } }, requiredCerts: { include: { certification: true } } },
    }),
  ]);

  const match = computeJobMatch(studentFull, job);

  await prisma.application.upsert({
    where: { studentId_jobId: { studentId: student.id, jobId } },
    update: { matchScore: match.score },
    create: { studentId: student.id, jobId, matchScore: match.score },
  });

  revalidatePath("/student/jobs");
  revalidatePath(`/student/jobs/${jobId}`);
  revalidatePath(`/employer/jobs/${jobId}`);
}

export async function toggleBookmark(formData: FormData) {
  const student = await requireStudent();
  const jobId = String(formData.get("jobId") ?? "");
  if (!jobId) return;

  const existing = await prisma.bookmarkedJob.findUnique({
    where: { studentId_jobId: { studentId: student.id, jobId } },
  });

  if (existing) {
    await prisma.bookmarkedJob.delete({ where: { id: existing.id } });
  } else {
    await prisma.bookmarkedJob.create({ data: { studentId: student.id, jobId } });
  }

  revalidatePath("/student/jobs");
  revalidatePath(`/student/jobs/${jobId}`);
  revalidatePath("/student/dashboard");
}

export async function toggleFavoriteCompany(formData: FormData) {
  const student = await requireStudent();
  const employerId = String(formData.get("employerId") ?? "");
  if (!employerId) return;

  const existing = await prisma.favoriteCompany.findUnique({
    where: { studentId_employerId: { studentId: student.id, employerId } },
  });

  if (existing) {
    await prisma.favoriteCompany.delete({ where: { id: existing.id } });
  } else {
    await prisma.favoriteCompany.create({ data: { studentId: student.id, employerId } });
  }

  revalidatePath("/student/interests");
  revalidatePath("/student/dashboard");
}

export async function toggleFavoriteCareerTrack(formData: FormData) {
  const student = await requireStudent();
  const careerTrackId = String(formData.get("careerTrackId") ?? "");
  if (!careerTrackId) return;

  const existing = await prisma.favoriteCareerTrack.findUnique({
    where: { studentId_careerTrackId: { studentId: student.id, careerTrackId } },
  });

  if (existing) {
    await prisma.favoriteCareerTrack.delete({ where: { id: existing.id } });
  } else {
    await prisma.favoriteCareerTrack.create({ data: { studentId: student.id, careerTrackId } });
  }

  revalidatePath("/student/interests");
  revalidatePath("/student/dashboard");
}
