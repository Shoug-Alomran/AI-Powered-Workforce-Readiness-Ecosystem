"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentStudent } from "@/lib/session";
import { getFirebaseAdminDb } from "@/lib/firebase-admin";
import { redirect } from "next/navigation";
import { getCareerTrackAsync } from "@/lib/careerTracks.server";
import { computeReadinessScore } from "@/lib/ai";
import { storeEvidenceDocuments } from "@/lib/documents";

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

  const cert = await prisma.certification.upsert({
    where: { name },
    update: {},
    create: { name },
  });

  let evidencePath = "";
  try {
    const [document] = await storeEvidenceDocuments({ files:[evidence], ownerUserId:ctx.user.id, contextType:"CERTIFICATION", contextId:cert.id, purpose:"Certification verification" });
    evidencePath = document.storageKey;
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
  const ctx = await getCurrentStudent(); if (!ctx) throw new Error("Not signed in as a student");
  const student = ctx.student;
  const type = String(formData.get("type") ?? "internship");
  const title = String(formData.get("title") ?? "").trim();
  const org = String(formData.get("org") ?? "").trim();
  const months = Math.max(1, Number(formData.get("months") ?? 1));
  const evidenceUrl = String(formData.get("evidenceUrl") ?? "").trim();
  if (!title) return;

  const experience = await prisma.experience.create({
    data: { studentId: student.id, type, title, org: org || null, months, evidenceUrl: evidenceUrl || null, verificationStatus: evidenceUrl ? "PENDING" : "SELF_REPORTED" },
  });
  const files=formData.getAll("documents");
  if(files.some(file=>file instanceof File&&file.size>0)){
    await storeEvidenceDocuments({files,ownerUserId:ctx.user.id,contextType:"EXPERIENCE",contextId:experience.id,purpose:"Experience verification"});
    await prisma.experience.update({where:{id:experience.id},data:{verificationStatus:"PENDING"}});
  }

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
  const ctx = await getCurrentStudent(); if (!ctx) throw new Error("Not signed in as a student");
  const student = ctx.student;
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const evidenceUrl = String(formData.get("evidenceUrl") ?? "").trim();
  if (!title) return;

  const project = await prisma.project.create({
    data: { studentId: student.id, title, description: description || null, evidenceUrl: evidenceUrl || null, verificationStatus: evidenceUrl ? "PENDING" : "SELF_REPORTED" },
  });
  const files=formData.getAll("documents");
  if(files.some(file=>file instanceof File&&file.size>0)){
    await storeEvidenceDocuments({files,ownerUserId:ctx.user.id,contextType:"PROJECT",contextId:project.id,purpose:"Project verification"});
    await prisma.project.update({where:{id:project.id},data:{verificationStatus:"PENDING"}});
  }

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

  const application = await prisma.application.upsert({
    where: { studentId_jobId: { studentId: student.id, jobId } },
    update: { matchScore: match.score },
    create: { studentId: student.id, jobId, matchScore: match.score },
  });
  const files=formData.getAll("documents");
  if(files.some(file=>file instanceof File&&file.size>0)) await storeEvidenceDocuments({files,ownerUserId:student.userId,contextType:"APPLICATION",contextId:application.id,purpose:"Job application supporting document"});

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

export async function syncRoadmap() {
  const ctx = await getCurrentStudent();
  if (!ctx) throw new Error("Not signed in as a student");
  const student = await prisma.student.findUniqueOrThrow({
    where: { id: ctx.student.id },
    include: { skills: { include: { skill: true } }, certifications: { include: { certification: true } }, experiences: true, projects: true },
  });
  const track = await getCareerTrackAsync(student.targetCareer);
  const result = computeReadinessScore(student, track);
  const existing = await prisma.roadmapItem.findMany({ where: { studentId: student.id } });
  const activeTitles = new Set(existing.filter((item) => item.status !== "COMPLETED").map((item) => item.title));
  for (const [index, title] of result.nextActions.entries()) {
    if (!activeTitles.has(title)) {
      await prisma.roadmapItem.create({ data: { studentId: student.id, title, category: title.includes("certification") ? "CERTIFICATION" : title.includes("internship") ? "EXPERIENCE" : title.includes("project") ? "PORTFOLIO" : "SKILL", expectedImpact: Math.max(2, 8 - index) } });
    }
  }
  await prisma.auditEvent.create({ data: { actorUserId: ctx.user.id, action: "ROADMAP_SYNCED", entityType: "STUDENT", entityId: student.id, modelVersion: "readiness-rules-v1", explanation: `${result.nextActions.length} current recommendations evaluated` } });
  revalidatePath("/student/roadmap");
  revalidatePath("/student/dashboard");
}

export async function updateRoadmapItem(formData: FormData) {
  const ctx = await getCurrentStudent();
  if (!ctx) throw new Error("Not signed in as a student");
  const itemId = String(formData.get("itemId") ?? "");
  const status = String(formData.get("status") ?? "NOT_STARTED");
  const note = String(formData.get("note") ?? "").trim();
  const allowed = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "SKIPPED", "STRUGGLING"];
  if (!itemId || !allowed.includes(status)) return;
  const item = await prisma.roadmapItem.findFirst({ where: { id: itemId, studentId: ctx.student.id } });
  if (!item) throw new Error("Roadmap item not found");
  await prisma.roadmapItem.update({ where: { id: item.id }, data: { status, studentNote: note || null } });
  if (status === "STRUGGLING" || status === "SKIPPED") {
    const alternativeTitle = status === "STRUGGLING" ? `Take a foundational or mentored alternative for: ${item.title}` : `Choose an alternative route toward: ${item.title}`;
    await prisma.roadmapItem.create({ data: { studentId: ctx.student.id, title: alternativeTitle, category: item.category, source: "AI", expectedImpact: Math.max(1, item.expectedImpact - 1), alternativeForId: item.id } });
  }
  await prisma.auditEvent.create({ data: { actorUserId: ctx.user.id, action: `ROADMAP_${status}`, entityType: "ROADMAP_ITEM", entityId: item.id, explanation: note || null } });
  revalidatePath("/student/roadmap");
  revalidatePath("/student/dashboard");
}

export async function updateConsent(formData: FormData) {
  const ctx = await getCurrentStudent();
  if (!ctx) throw new Error("Not signed in as a student");
  const purpose = String(formData.get("purpose") ?? "");
  const granted = String(formData.get("granted") ?? "false") === "true";
  if (!purpose) return;
  await prisma.consentRecord.upsert({ where: { studentId_purpose: { studentId: ctx.student.id, purpose } }, update: { granted }, create: { studentId: ctx.student.id, purpose, granted } });
  await prisma.auditEvent.create({ data: { actorUserId: ctx.user.id, action: granted ? "CONSENT_GRANTED" : "CONSENT_WITHDRAWN", entityType: "CONSENT", entityId: purpose } });
  revalidatePath("/student/privacy");
}

export async function submitAppeal(formData: FormData) {
  const ctx = await getCurrentStudent();
  if (!ctx) throw new Error("Not signed in as a student");
  const subjectType = String(formData.get("subjectType") ?? "READINESS");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) throw new Error("Please explain what should be reviewed");
  await prisma.appeal.create({ data: { studentId: ctx.student.id, subjectType, subjectId: String(formData.get("subjectId") ?? "") || null, reason } });
  await prisma.notification.create({ data: { userId: ctx.user.id, type: "APPEAL", title: "Review request received", body: "Your request is in the human review queue." } });
  revalidatePath("/student/privacy");
  revalidatePath("/admin/governance");
}

export async function createPassportShare(formData: FormData) {
  const ctx = await getCurrentStudent();
  if (!ctx) throw new Error("Not signed in as a student");
  const days = Math.min(90, Math.max(1, Number(formData.get("days") ?? 14)));
  const label = String(formData.get("label") ?? "").trim();
  const token = randomUUID().replaceAll("-", "");
  await prisma.passportShare.create({ data: { studentId: ctx.student.id, token, label: label || null, expiresAt: new Date(Date.now() + days * 86400000) } });
  await prisma.auditEvent.create({ data: { actorUserId: ctx.user.id, action: "PASSPORT_SHARE_CREATED", entityType: "PASSPORT_SHARE", entityId: token, explanation: `Expires in ${days} day(s)` } });
  revalidatePath("/student/passport-sharing");
}

export async function revokePassportShare(formData: FormData) {
  const ctx = await getCurrentStudent();
  if (!ctx) throw new Error("Not signed in as a student");
  const id = String(formData.get("shareId") ?? "");
  await prisma.passportShare.updateMany({ where: { id, studentId: ctx.student.id, revokedAt: null }, data: { revokedAt: new Date() } });
  await prisma.auditEvent.create({ data: { actorUserId: ctx.user.id, action: "PASSPORT_SHARE_REVOKED", entityType: "PASSPORT_SHARE", entityId: id } });
  revalidatePath("/student/passport-sharing");
}

export async function submitDataRequest(formData: FormData) {
  const ctx = await getCurrentStudent();
  if (!ctx) throw new Error("Not signed in as a student");
  const type = String(formData.get("type") ?? "ACCESS");
  const details = String(formData.get("details") ?? "").trim();
  if (!["ACCESS", "DOWNLOAD", "CORRECTION", "DELETION"].includes(type)) throw new Error("Invalid request type");
  const request = await prisma.dataRequest.create({ data: { studentId: ctx.student.id, type, details: details || null } });
  await prisma.notification.create({ data: { userId: ctx.user.id, type: "DATA_REQUEST", title: `${type.toLowerCase()} request received`, body: "Your request is recorded and awaiting review." } });
  await prisma.auditEvent.create({ data: { actorUserId: ctx.user.id, action: `DATA_${type}_REQUESTED`, entityType: "DATA_REQUEST", entityId: request.id } });
  revalidatePath("/student/privacy");
  revalidatePath("/admin/governance");
}
