"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { serializeIssues } from "@/lib/governanceIssues";
import { triageSupportTicket } from "@/lib/intelligence/triage";

export async function createSupportTicket(formData: FormData) {
  const user = await getCurrentUser();
  const name = String(formData.get("name") ?? user?.name ?? "").trim();
  const email = String(formData.get("email") ?? user?.email ?? "").trim();
  const category = String(formData.get("category") ?? "GENERAL");
  const rawType = String(formData.get("type") ?? "").trim().toUpperCase();
  const type = ["QUESTION", "COMPLAINT", "REQUEST", "BUG"].includes(rawType) ? rawType : null;
  const subject = String(formData.get("subject") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  if (!name || !email || !subject || !message) throw new Error("All support fields are required");
  const urgent = category === "PRIVACY" || category === "SAFETY";

  // Triage runs at intake so the queue is ordered the moment a ticket lands.
  // It is advisory: it never changes `priority`, which stays what the person
  // filing said and what an administrator can set by hand.
  const triage = triageSupportTicket({ category, subject, message });

  const ticket = await prisma.supportTicket.create({
    data: {
      userId: user?.id ?? null, name, email, category, type, subject, message,
      priority: urgent ? "URGENT" : "NORMAL",
      severity: triage.severity,
      urgency: triage.urgency,
      triageScore: triage.score,
      triageReason: serializeIssues(triage.reasons),
      triageVersion: triage.modelVersion,
      triagedAt: new Date(),
    },
  });
  if (user) {
    await prisma.auditEvent.create({ data: { actorUserId: user.id, action: "SUPPORT_TICKET_RAISED", entityType: "SUPPORT_TICKET", entityId: ticket.id, modelVersion: triage.modelVersion, explanation: `${category}: ${subject}` } });
  }
  revalidatePath("/admin/support");
  redirect("/support?submitted=1");
}
