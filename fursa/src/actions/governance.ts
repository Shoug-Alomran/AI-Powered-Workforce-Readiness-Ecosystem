"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/session";

function analyzeScenario(type: string, description: string) {
  const text = description.toLowerCase();
  const issues: string[] = [];
  let risk = "LOW";
  if (type === "AUTOMATED_HIRING" || text.includes("automatically reject")) {
    risk = "HIGH";
    issues.push("High-impact employment decision lacks mandatory human review", "Candidate needs an explanation and correction channel");
  }
  if (type === "DATA_SHARING" || text.includes("identifiable") || text.includes("share data")) {
    risk = "HIGH";
    issues.push("Purpose-specific consent and data minimization must be verified", "Aggregate or de-identify the data before disclosure");
  }
  if (type === "MODEL_DRIFT" || text.includes("bias") || text.includes("drift")) {
    risk = risk === "HIGH" ? risk : "MEDIUM";
    issues.push("Pause affected recommendations and compare outcome metrics", "Require review before promoting a new model version");
  }
  if (!issues.length) issues.push("No automatic blocking condition detected", "A responsible owner should still confirm the context");
  return { risk, issues, action: risk === "HIGH" ? "Block automation and route to a human reviewer." : risk === "MEDIUM" ? "Continue only in sandbox while the issue is evaluated." : "Allow with monitoring and a recorded decision owner." };
}

export async function createGovernanceScenario(formData: FormData) {
  const ctx = await getCurrentAdmin();
  if (!ctx) throw new Error("Administrator access required");
  const title = String(formData.get("title") ?? "").trim();
  const scenarioType = String(formData.get("scenarioType") ?? "OTHER");
  const description = String(formData.get("description") ?? "").trim();
  if (!title || !description) throw new Error("Title and scenario description are required");
  const result = analyzeScenario(scenarioType, description);
  const scenario = await prisma.governanceScenario.create({ data: { title, scenarioType, description, riskLevel: result.risk, detectedIssues: JSON.stringify(result.issues), proposedAction: result.action, createdBy: ctx.user.id } });
  await prisma.auditEvent.create({ data: { actorUserId: ctx.user.id, action: "SCENARIO_ANALYZED", entityType: "GOVERNANCE_SCENARIO", entityId: scenario.id, modelVersion: "scenario-rules-v1", explanation: `${result.risk} risk; ${result.issues.length} checks raised` } });
  revalidatePath("/admin/governance");
}

export async function decideGovernanceScenario(formData: FormData) {
  const ctx = await getCurrentAdmin();
  if (!ctx) throw new Error("Administrator access required");
  const id = String(formData.get("scenarioId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (!id || !["APPROVED", "OVERRIDDEN"].includes(decision) || !note) throw new Error("A decision and justification are required");
  await prisma.governanceScenario.update({ where: { id }, data: { humanDecision: decision, decisionNote: note, reviewedAt: new Date() } });
  await prisma.auditEvent.create({ data: { actorUserId: ctx.user.id, action: `SCENARIO_${decision}`, entityType: "GOVERNANCE_SCENARIO", entityId: id, explanation: note } });
  revalidatePath("/admin/governance");
}

export async function resolveAppeal(formData: FormData) {
  const ctx = await getCurrentAdmin();
  if (!ctx) throw new Error("Administrator access required");
  const id = String(formData.get("appealId") ?? "");
  const status = String(formData.get("status") ?? "RESOLVED");
  const resolution = String(formData.get("resolution") ?? "").trim();
  if (!id || !resolution) throw new Error("A resolution is required");
  const appeal = await prisma.appeal.update({ where: { id }, data: { status, resolution, reviewedBy: ctx.user.id, reviewedAt: new Date() }, include: { student: true } });
  await prisma.notification.create({ data: { userId: appeal.student.userId, type: "APPEAL", title: "Your review request was updated", body: resolution } });
  revalidatePath("/admin/governance");
  revalidatePath("/student/privacy");
}
