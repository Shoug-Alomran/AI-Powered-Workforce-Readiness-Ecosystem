"use server";

import { revalidatePath, updateTag } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/session";
import { getFirebaseAdminDb, firebaseAdminConfigured } from "@/lib/firebase-admin";
import { slugify } from "@/lib/careerTracks";
import { CAREER_TRACKS_TAG } from "@/lib/careerTracks.server";

export async function reviewCertification(formData: FormData) {
  const ctx = await getCurrentAdmin();
  if (!ctx) throw new Error("Administrator access required");
  const id = String(formData.get("submissionId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const reviewNote = String(formData.get("reviewNote") ?? "").trim();
  if (!id || !["APPROVED", "REJECTED"].includes(decision)) throw new Error("Invalid review decision");
  if (!reviewNote) throw new Error("A human review note is required");

  const submission = await prisma.studentCertification.update({
    where: { id },
    data: { verificationStatus: decision, reviewNote: reviewNote || null, reviewedAt: new Date(), reviewedBy: ctx.user.id },
    include: { student: { include: { user: true } }, certification: true },
  });
  await prisma.evidenceDocument.updateMany({
    where: { ownerUserId: submission.student.user.id, contextType: "CERTIFICATION", contextId: submission.certificationId },
    data: { reviewStatus: decision, reviewNote, reviewedAt: new Date(), reviewedBy: ctx.user.id },
  });
  await prisma.auditEvent.create({
    data: {
      actorUserId: ctx.user.id,
      action: `CERTIFICATE_${decision}`,
      entityType: "STUDENT_CERTIFICATION",
      entityId: submission.id,
      explanation: `${submission.certification.name} for ${submission.student.user.name}: ${reviewNote}`,
    },
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
  // The document-review path already notified the owner; this one recorded the
  // decision and told nobody, so a student whose certificate was decided from
  // the dashboard queue learned about it only by re-reading their passport.
  await prisma.notification.create({
    data: {
      userId: submission.student.user.id,
      type: "EVIDENCE_REVIEW",
      title: decision === "APPROVED" ? "Certificate verified" : "Certificate not verified",
      body: `${submission.certification.name}: ${reviewNote}`,
    },
  });
  revalidatePath("/admin/dashboard"); revalidatePath("/admin/evidence"); revalidatePath("/admin/governance");
  revalidatePath("/student/profile"); revalidatePath("/student/dashboard"); revalidatePath("/student/evidence");
  revalidatePath("/student/roadmap"); revalidatePath("/workforce-intelligence");
}

export async function reviewEmployer(formData: FormData) {
  const ctx = await getCurrentAdmin();
  if (!ctx) throw new Error("Administrator access required");
  const employerId = String(formData.get("employerId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const reviewNote = String(formData.get("reviewNote") ?? "").trim();
  if (!employerId || !["APPROVED", "REJECTED"].includes(decision)) throw new Error("Invalid review decision");
  if (decision === "REJECTED" && !reviewNote) throw new Error("A reason is required when rejecting an employer");

  const employer = await prisma.employer.update({
    where: { id: employerId },
    data: { verificationStatus: decision, reviewNote: reviewNote || null, reviewedAt: new Date(), reviewedBy: ctx.user.id },
    include: { user: true },
  });

  // Approving an employer unlocks candidate data, so it is exactly the kind of
  // decision the audit trail exists for. It was the only review action here
  // that recorded nothing, and the employer was never told the outcome.
  await prisma.auditEvent.create({
    data: {
      actorUserId: ctx.user.id,
      action: `EMPLOYER_${decision}`,
      entityType: "EMPLOYER",
      entityId: employer.id,
      explanation: `${employer.company}${reviewNote ? `: ${reviewNote}` : ""}`,
    },
  });
  await prisma.notification.create({
    data: {
      userId: employer.userId,
      type: "EMPLOYER_VERIFICATION",
      title: decision === "APPROVED" ? "Your employer account is verified" : "Your employer account was not approved",
      body: reviewNote || (decision === "APPROVED" ? "You can now post roles and see candidates." : "Contact the platform team for the reason."),
    },
  });

  revalidatePath("/admin/dashboard");
  revalidatePath(`/admin/employers/${employer.id}`);
  revalidatePath("/employer/dashboard");
}

export async function reviewCurriculumCompletion(formData: FormData) {
  const ctx = await getCurrentAdmin();
  if (!ctx) throw new Error("Administrator access required");
  const actionId = String(formData.get("actionId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const reviewNote = String(formData.get("reviewNote") ?? "").trim();
  if (!actionId || !["APPROVED", "CHANGES_REQUESTED"].includes(decision)) throw new Error("Invalid completion decision");
  if (!reviewNote) throw new Error("A human review note is required");

  const item = await prisma.curriculumAction.findUniqueOrThrow({ where: { id: actionId }, include: { university: { include: { user: true } } } });
  if (item.status !== "AWAITING_HUMAN_REVIEW") throw new Error("This initiative is not awaiting human review");
  const documents = await prisma.evidenceDocument.findMany({ where: { contextType: "CURRICULUM_ACTION", contextId: actionId } });
  if (decision === "APPROVED" && documents.some((document) => document.reviewStatus !== "APPROVED")) {
    throw new Error("Review and approve every attached document before verifying completion");
  }
  const status = decision === "APPROVED" ? "COMPLETED" : "CHANGES_REQUESTED";
  const outcomeNote = `${item.outcomeNote ?? ""}\n\nHuman review by ${ctx.user.name}:\n${reviewNote}`.trim();

  await prisma.$transaction([
    prisma.curriculumAction.update({ where: { id: actionId }, data: { status, outcomeNote } }),
    prisma.auditEvent.create({ data: { actorUserId: ctx.user.id, action: decision === "APPROVED" ? "CURRICULUM_COMPLETION_VERIFIED" : "CURRICULUM_CHANGES_REQUESTED", entityType: "CurriculumAction", entityId: actionId, explanation: reviewNote } }),
    prisma.notification.create({ data: { userId: item.university.userId, type: "CURRICULUM_REVIEW", title: decision === "APPROVED" ? "Initiative completion verified" : "Changes requested for initiative", body: `${item.title}: ${reviewNote}` } }),
  ]);
  revalidatePath("/admin/dashboard");
  revalidatePath("/university/actions");
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
// Career-track taxonomy management, lets an admin add tracks or adjust
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
  // The taxonomy is cached across requests for every portal that reads it, so
  // an edit here has to drop that cache as well as this page.
  updateTag(CAREER_TRACKS_TAG);
}

export async function updateCareerTrackSkillWeight(formData: FormData) {
  const ctx = await getCurrentAdmin();
  if (!ctx) throw new Error("Administrator access required");
  const trackSkillId = String(formData.get("trackSkillId") ?? "");
  const weight = Math.min(3, Math.max(1, Number(formData.get("weight") ?? 2)));
  if (!trackSkillId) return;
  await prisma.careerTrackSkill.update({ where: { id: trackSkillId }, data: { weight } });
  revalidatePath("/admin/career-tracks");
  // The taxonomy is cached across requests for every portal that reads it, so
  // an edit here has to drop that cache as well as this page.
  updateTag(CAREER_TRACKS_TAG);
}

export async function removeCareerTrackSkill(formData: FormData) {
  const ctx = await getCurrentAdmin();
  if (!ctx) throw new Error("Administrator access required");
  const trackSkillId = String(formData.get("trackSkillId") ?? "");
  if (!trackSkillId) return;
  await prisma.careerTrackSkill.delete({ where: { id: trackSkillId } });
  revalidatePath("/admin/career-tracks");
  // The taxonomy is cached across requests for every portal that reads it, so
  // an edit here has to drop that cache as well as this page.
  updateTag(CAREER_TRACKS_TAG);
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
  // The taxonomy is cached across requests for every portal that reads it, so
  // an edit here has to drop that cache as well as this page.
  updateTag(CAREER_TRACKS_TAG);
}
