"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { serializeIssues } from "@/lib/governanceIssues";
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
  const scenario = await prisma.governanceScenario.create({ data: { title, scenarioType, description, riskLevel: result.risk, detectedIssues: serializeIssues(result.issues), proposedAction: result.action, createdBy: ctx.user.id } });
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

export async function reviewPortfolioEvidence(formData: FormData) {
  const ctx = await getCurrentAdmin();
  if (!ctx) throw new Error("Administrator access required");
  const entityType = String(formData.get("entityType") ?? "");
  const id = String(formData.get("entityId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (!id || !["APPROVED", "REJECTED"].includes(decision)) throw new Error("Invalid evidence decision");
  if (decision === "REJECTED" && !note) throw new Error("A rejection reason is required");
  const data = { verificationStatus: decision, reviewNote: note || null, reviewedAt: new Date(), reviewedBy: ctx.user.id };
  if (entityType === "PROJECT") await prisma.project.update({ where: { id }, data });
  else if (entityType === "EXPERIENCE") await prisma.experience.update({ where: { id }, data });
  else throw new Error("Unsupported evidence type");
  await prisma.auditEvent.create({ data: { actorUserId: ctx.user.id, action: `EVIDENCE_${decision}`, entityType, entityId: id, explanation: note || null } });
  revalidatePath("/admin/governance"); revalidatePath("/student/profile");
}

export async function resolveDataRequest(formData: FormData) {
  const ctx = await getCurrentAdmin();
  if (!ctx) throw new Error("Administrator access required");
  const id = String(formData.get("requestId") ?? "");
  const status = String(formData.get("status") ?? "COMPLETED");
  const resolution = String(formData.get("resolution") ?? "").trim();
  if (!id || !resolution) throw new Error("A resolution is required");
  const request = await prisma.dataRequest.update({ where: { id }, data: { status, resolution, reviewedBy: ctx.user.id, reviewedAt: new Date() }, include: { student: true } });
  await prisma.notification.create({ data: { userId: request.student.userId, type: "DATA_REQUEST", title: `Data request ${status.toLowerCase()}`, body: resolution } });
  revalidatePath("/admin/governance"); revalidatePath("/student/privacy");
}

export type MonitoringCaptureResult = {
  ok: true;
  snapshotId: string;
  status: string;
  sampleSize: number;
  capturedAt: string;
};

export async function captureMonitoringSnapshot(): Promise<MonitoringCaptureResult> {
  const ctx = await getCurrentAdmin();
  if (!ctx) throw new Error("Administrator access required");
  const applications = await prisma.application.findMany();
  const previous = await prisma.monitoringSnapshot.findFirst({ orderBy: { createdAt: "desc" } });
  // Only final employer decisions are outcomes. Counting active applications here
  // would make the minimum sample threshold look safer than it really is.
  const eligibleApplications = applications.filter((application) => ["hired", "rejected"].includes(application.status));
  const sampleSize = eligibleApplications.length;
  const averageScore = sampleSize ? eligibleApplications.reduce((n, a) => n + a.matchScore, 0) / sampleSize : 0;
  const outcomeRate = sampleSize ? eligibleApplications.filter(a => a.status === "hired").length / sampleSize : 0;
  const scoreDrift = previous ? averageScore - previous.averageScore : 0;
  const outcomeDrift = previous ? outcomeRate - previous.outcomeRate : 0;
  const status = sampleSize < 20 ? "INSUFFICIENT_DATA" : Math.abs(scoreDrift) >= 10 || Math.abs(outcomeDrift) >= .15 ? "PAUSED" : Math.abs(scoreDrift) >= 5 || Math.abs(outcomeDrift) >= .08 ? "WATCH" : "HEALTHY";
  const snapshot = await prisma.monitoringSnapshot.create({ data: { modelVersion: "match-rules-v1", sampleSize, averageScore, outcomeRate, scoreDrift, outcomeDrift, status, notes: sampleSize < 20 ? "Metrics suppressed for decision-making until the minimum sample size of 20 is reached." : null } });
  await prisma.auditEvent.create({ data: { actorUserId: ctx.user.id, action: "MONITORING_SNAPSHOT_CAPTURED", entityType: "MONITORING_SNAPSHOT", entityId: snapshot.id, modelVersion: snapshot.modelVersion, explanation: `${status}; ${sampleSize} eligible final outcomes` } });
  revalidatePath("/admin/monitoring");
  return { ok: true, snapshotId: snapshot.id, status, sampleSize, capturedAt: snapshot.createdAt.toISOString() };
}

export async function updateSupportTicket(formData: FormData) {
  const ctx = await getCurrentAdmin();
  if (!ctx) throw new Error("Administrator access required");
  const id = String(formData.get("ticketId") ?? "");
  const status = String(formData.get("status") ?? "IN_PROGRESS");
  const resolution = String(formData.get("resolution") ?? "").trim();
  await prisma.supportTicket.update({ where: { id }, data: { status, resolution: resolution || null, assignedTo: ctx.user.name } });
  revalidatePath("/admin/support");
}
