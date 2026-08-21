"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/session";

export async function reviewEvidenceDocument(formData: FormData) {
  const ctx = await getCurrentAdmin();
  if (!ctx) throw new Error("Administrator access required");
  const documentId = String(formData.get("documentId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const reviewNote = String(formData.get("reviewNote") ?? "").trim();
  if (!documentId || !["APPROVED", "REJECTED"].includes(decision)) throw new Error("Invalid document decision");
  if (!reviewNote) throw new Error("Record a human review note");
  const document = await prisma.evidenceDocument.update({ where: { id: documentId }, data: { reviewStatus: decision, reviewNote, reviewedBy: ctx.user.id, reviewedAt: new Date() } });
  if (document.contextType === "PROJECT") await prisma.project.updateMany({ where: { id: document.contextId }, data: { verificationStatus: decision, reviewNote, reviewedBy: ctx.user.id, reviewedAt: new Date() } });
  if (document.contextType === "EXPERIENCE") await prisma.experience.updateMany({ where: { id: document.contextId }, data: { verificationStatus: decision, reviewNote, reviewedBy: ctx.user.id, reviewedAt: new Date() } });
  if (document.contextType === "CERTIFICATION") {
    const student=await prisma.student.findUnique({where:{userId:document.ownerUserId}});
    if(student) await prisma.studentCertification.updateMany({where:{studentId:student.id,certificationId:document.contextId},data:{verificationStatus:decision,reviewNote,reviewedBy:ctx.user.id,reviewedAt:new Date()}});
  }
  await prisma.auditEvent.create({ data: { actorUserId: ctx.user.id, action: `DOCUMENT_${decision}`, entityType: document.contextType, entityId: document.contextId, explanation: `${document.originalName}: ${reviewNote}` } });
  await prisma.notification.create({ data: { userId: document.ownerUserId, type: "EVIDENCE_REVIEW", title: `Document ${decision.toLowerCase()}`, body: `${document.originalName}: ${reviewNote}` } });
  revalidatePath("/admin/evidence");
  revalidatePath("/admin/dashboard");
  revalidatePath("/student/evidence");
  revalidatePath("/student/profile");
  revalidatePath("/university/actions");
}
