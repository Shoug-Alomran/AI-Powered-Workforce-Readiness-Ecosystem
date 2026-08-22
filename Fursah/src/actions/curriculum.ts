"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUniversity } from "@/lib/session";
import { storeEvidenceDocuments } from "@/lib/documents";

export async function createCurriculumAction(formData: FormData) {
  const ctx = await getCurrentUniversity();
  if (!ctx) throw new Error("University access required");
  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("Action title is required");
  const objective = String(formData.get("objective") ?? "").trim();
  const expectedOutcome = String(formData.get("expectedOutcome") ?? "").trim();
  const affectedCourses = String(formData.get("affectedCourses") ?? "").trim();
  const skill = String(formData.get("skill") ?? "").trim();
  const owner = String(formData.get("owner") ?? "").trim();
  const status = String(formData.get("status") ?? "PROPOSED");
  const dueRaw = String(formData.get("dueDate") ?? "");
  if (formData.get("returnTo") && (!objective || !skill || !owner || !dueRaw)) throw new Error("Complete all required action-plan fields");
  const dueDate = dueRaw ? new Date(`${dueRaw}T12:00:00`) : null;
  const details = [objective, expectedOutcome ? `Expected outcome: ${expectedOutcome}` : ""].filter(Boolean).join("\n\n") || null;
  const item = await prisma.curriculumAction.create({ data: { universityId: ctx.university.id, title, skill: affectedCourses ? `${skill} · ${affectedCourses}` : skill || null, owner: owner || null, status, dueDate, outcomeNote: details } });
  const files=formData.getAll("documents");
  if(files.some(file=>file instanceof File&&file.size>0)) await storeEvidenceDocuments({files,ownerUserId:ctx.user.id,contextType:"CURRICULUM_ACTION",contextId:item.id,purpose:"Curriculum action planning evidence"});
  revalidatePath("/university/actions");
  if (formData.get("returnTo")) redirect("/university/actions#initiative-tracker");
}

export async function updateCurriculumAction(formData: FormData) {
  const ctx = await getCurrentUniversity();
  if (!ctx) throw new Error("University access required");
  const id = String(formData.get("actionId") ?? "");
  const status = String(formData.get("status") ?? "PROPOSED");
  const outcomeNote = String(formData.get("outcomeNote") ?? "").trim();
  await prisma.curriculumAction.updateMany({ where: { id, universityId: ctx.university.id }, data: { status, outcomeNote: outcomeNote || null } });
  revalidatePath("/university/actions");
}

export async function submitCurriculumActionForReview(formData: FormData) {
  const ctx = await getCurrentUniversity();
  if (!ctx) throw new Error("University access required");
  const id = String(formData.get("actionId") ?? "");
  const evidence = String(formData.get("evidence") ?? "").trim();
  if (!id) throw new Error("Initiative is required");
  if (evidence.length < 40) throw new Error("Add enough evidence for a reviewer to verify the work");

  const item = await prisma.curriculumAction.findFirst({ where: { id, universityId: ctx.university.id } });
  if (!item) throw new Error("Initiative not found");
  if (item.status === "COMPLETED") throw new Error("This initiative has already been verified");

  // Initial automated gate only checks submission completeness. It does not approve completion.
  const checks = [
    evidence.length >= 80,
    /implemented|delivered|approved|completed|launched|evidence|report|minutes|syllabus|assessment/i.test(evidence),
  ];
  const passed = checks.every(Boolean);
  const aiNote = passed
    ? "AI initial check passed: the submission contains sufficient detail and an implementation/evidence reference. Human verification is required."
    : "AI initial check needs more detail: describe what was implemented and identify the document, report, minutes, syllabus, or assessment a reviewer can inspect.";
  const nextStatus = passed ? "AWAITING_HUMAN_REVIEW" : "CHANGES_REQUESTED";

  await prisma.$transaction([
    prisma.curriculumAction.update({ where: { id }, data: { status: nextStatus, outcomeNote: `${aiNote}\n\nSubmitted evidence:\n${evidence}` } }),
    prisma.auditEvent.create({ data: { actorUserId: ctx.user.id, action: "CURRICULUM_COMPLETION_SUBMITTED", entityType: "CurriculumAction", entityId: id, modelVersion: "completion-gate-v1", explanation: aiNote } }),
  ]);
  const files=formData.getAll("documents");
  if(files.some(file=>file instanceof File&&file.size>0)) await storeEvidenceDocuments({files,ownerUserId:ctx.user.id,contextType:"CURRICULUM_ACTION",contextId:id,purpose:"Curriculum completion verification"});
  revalidatePath("/university/actions");
  revalidatePath("/admin/dashboard");
}
