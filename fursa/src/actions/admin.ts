"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/session";
import { getFirebaseAdminDb, firebaseAdminConfigured } from "@/lib/firebase-admin";
import { slugify } from "@/lib/careerTracks";

export async function reviewCertification(formData: FormData) {
  const ctx = await getCurrentAdmin();
  if (!ctx) throw new Error("Administrator access required");
  const id = String(formData.get("submissionId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const reviewNote = String(formData.get("reviewNote") ?? "").trim();
  if (!id || !["APPROVED", "REJECTED"].includes(decision)) throw new Error("Invalid review decision");
  if (decision === "REJECTED" && !reviewNote) throw new Error("A reason is required when rejecting evidence");

  const submission = await prisma.studentCertification.update({
    where: { id },
    data: { verificationStatus: decision, reviewNote: reviewNote || null, reviewedAt: new Date(), reviewedBy: ctx.user.id },
    include: { student: { include: { user: true } }, certification: true },
  });
  if (firebaseAdminConfigured) {
    try {
      await getFirebaseAdminDb().collection("users").doc(submission.student.user.id).collection("certifications").doc(id).set({
        verificationStatus: decision, reviewNote: reviewNote || null, reviewedAt: new Date().toISOString(), reviewedBy: ctx.user.id,
      }, { merge: true });
    } catch (error) {
      console.error("Firestore mirror of certification review failed", error);
    }
  }
  revalidatePath("/admin/dashboard"); revalidatePath("/student/profile"); revalidatePath("/student/dashboard");
}

export async function reviewEmployer(formData: FormData) {
  const ctx = await getCurrentAdmin();
  if (!ctx) throw new Error("Administrator access required");
  const employerId = String(formData.get("employerId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const reviewNote = String(formData.get("reviewNote") ?? "").trim();
  if (!employerId || !["APPROVED", "REJECTED"].includes(decision)) throw new Error("Invalid review decision");
  if (decision === "REJECTED" && !reviewNote) throw new Error("A reason is required when rejecting an employer");

  await prisma.employer.update({
    where: { id: employerId },
    data: { verificationStatus: decision, reviewNote: reviewNote || null, reviewedAt: new Date(), reviewedBy: ctx.user.id },
  });

  revalidatePath("/admin/dashboard");
  revalidatePath("/employer/dashboard");
}

export async function toggleUserActive(formData: FormData) {
  const ctx = await getCurrentAdmin();
  if (!ctx) throw new Error("Administrator access required");
  const userId = String(formData.get("userId") ?? "");
  if (!userId) return;
  if (userId === ctx.user.id) throw new Error("You cannot deactivate your own administrator account");

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  await prisma.user.update({ where: { id: userId }, data: { active: !user.active } });

  revalidatePath("/admin/dashboard");
}

// ---------------------------------------------------------------------------
// Career-track taxonomy management — lets an admin add tracks or adjust
// skill/certification weights without a code deploy.
// ---------------------------------------------------------------------------

export async function createCareerTrack(formData: FormData) {
  const ctx = await getCurrentAdmin();
  if (!ctx) throw new Error("Administrator access required");
  const label = String(formData.get("label") ?? "").trim();
  const recommendedExperienceMonths = Math.max(0, Number(formData.get("recommendedExperienceMonths") ?? 6));
  const skillsRaw = String(formData.get("skills") ?? ""); // "Name:weight:technical, Name2:weight2:soft"
  const certsRaw = String(formData.get("certifications") ?? "");
  if (!label) throw new Error("A track label is required");

  const id = slugify(label);
  const existing = await prisma.careerTrack.findUnique({ where: { id } });
  if (existing) throw new Error("A career track with this name already exists");

  const track = await prisma.careerTrack.create({
    data: { id, label, recommendedExperienceMonths },
  });

  for (const entry of skillsRaw.split(",").map((s) => s.trim()).filter(Boolean)) {
    const [name, weightPart, categoryPart] = entry.split(":").map((x) => x.trim());
    if (!name) continue;
    const weight = Math.min(3, Math.max(1, Number(weightPart) || 2));
    const category = categoryPart === "soft" ? "soft" : "technical";
    const skill = await prisma.skill.upsert({ where: { name }, update: {}, create: { name, category } });
    await prisma.careerTrackSkill.create({ data: { careerTrackId: track.id, skillId: skill.id, weight, category } });
  }

  for (const name of certsRaw.split(",").map((c) => c.trim()).filter(Boolean)) {
    const cert = await prisma.certification.upsert({ where: { name }, update: {}, create: { name } });
    await prisma.careerTrackCertification.create({ data: { careerTrackId: track.id, certificationId: cert.id } });
  }

  revalidatePath("/admin/career-tracks");
}

export async function updateCareerTrackSkillWeight(formData: FormData) {
  const ctx = await getCurrentAdmin();
  if (!ctx) throw new Error("Administrator access required");
  const trackSkillId = String(formData.get("trackSkillId") ?? "");
  const weight = Math.min(3, Math.max(1, Number(formData.get("weight") ?? 2)));
  if (!trackSkillId) return;
  await prisma.careerTrackSkill.update({ where: { id: trackSkillId }, data: { weight } });
  revalidatePath("/admin/career-tracks");
}

export async function removeCareerTrackSkill(formData: FormData) {
  const ctx = await getCurrentAdmin();
  if (!ctx) throw new Error("Administrator access required");
  const trackSkillId = String(formData.get("trackSkillId") ?? "");
  if (!trackSkillId) return;
  await prisma.careerTrackSkill.delete({ where: { id: trackSkillId } });
  revalidatePath("/admin/career-tracks");
}

export async function addCareerTrackSkill(formData: FormData) {
  const ctx = await getCurrentAdmin();
  if (!ctx) throw new Error("Administrator access required");
  const careerTrackId = String(formData.get("careerTrackId") ?? "");
  const name = String(formData.get("skillName") ?? "").trim();
  const category = String(formData.get("category") ?? "technical") === "soft" ? "soft" : "technical";
  const weight = Math.min(3, Math.max(1, Number(formData.get("weight") ?? 2)));
  if (!careerTrackId || !name) return;

  const skill = await prisma.skill.upsert({ where: { name }, update: {}, create: { name, category } });
  await prisma.careerTrackSkill.upsert({
    where: { careerTrackId_skillId: { careerTrackId, skillId: skill.id } },
    update: { weight, category },
    create: { careerTrackId, skillId: skill.id, weight, category },
  });
  revalidatePath("/admin/career-tracks");
}
