"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/session";
import { getFirebaseAdminDb } from "@/lib/firebase-admin";

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
  await getFirebaseAdminDb().collection("users").doc(submission.student.user.id).collection("certifications").doc(id).set({
    verificationStatus: decision, reviewNote: reviewNote || null, reviewedAt: new Date().toISOString(), reviewedBy: ctx.user.id,
  }, { merge: true });
  revalidatePath("/admin/dashboard"); revalidatePath("/student/profile"); revalidatePath("/student/dashboard");
}
