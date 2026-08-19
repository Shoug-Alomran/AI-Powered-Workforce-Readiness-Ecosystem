import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/session";
import { createGovernanceScenario, decideGovernanceScenario, resolveAppeal } from "@/actions/governance";
import { READINESS_MODEL_VERSION, READINESS_WEIGHTS } from "@/lib/intelligence/readiness";
import { STUDENT_INTELLIGENCE_MODEL_VERSION } from "@/lib/intelligence/student";
import { EMPLOYER_INTELLIGENCE_MODEL_VERSION } from "@/lib/intelligence/employer";
import { UNIVERSITY_INTELLIGENCE_MODEL_VERSION } from "@/lib/intelligence/university";
import { ECOSYSTEM_INTELLIGENCE_MODEL_VERSION } from "@/lib/intelligence/ecosystem";

const PIPELINE = [
  ["Source", "Profiles, jobs, offerings and outcomes", "ACTIVE"], ["Collector", "Validated role-based inputs", "ACTIVE"], ["Preprocessor", "Normalization and data minimization", "ACTIVE"], ["Model", "Readiness, matching and recommendation rules", "ACTIVE"], ["Policy", "Consent, review thresholds and safeguards", "ACTIVE"], ["Distributor", "Role-authorized recommendations", "ACTIVE"], ["Inference target", "Student, employer and university workflows", "ACTIVE"], ["Sandbox", "Scenario evaluation before activation", "PROTOTYPE"], ["Orchestrator", "Version, approval, audit and rollback controls", "PROTOTYPE"], ["Sink", "Dashboards, notifications and exports", "ACTIVE"],
];

export default async function GovernancePage() {
  const ctx = await getCurrentAdmin(); if (!ctx) redirect("/login");
  const [scenarios, appeals, audits, documentCounts, certificationCounts, roadmapCounts] = await Promise.all([
    prisma.governanceScenario.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.appeal.findMany({ include: { student: { include: { user: true } } }, orderBy: { createdAt: "desc" } }),
    prisma.auditEvent.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.evidenceDocument.groupBy({ by: ["aiStatus", "reviewStatus"], _count: { _all: true } }).catch(() => []),
    prisma.studentCertification.groupBy({ by: ["verificationStatus"], _count: { _all: true } }),
    prisma.roadmapItem.groupBy({ by: ["source"], _count: { _all: true } }),
  ]);

  // Evidence that an automated extraction has run is never the same thing as
  // verified evidence. This surface reports both counts side by side so the
  // distinction stays visible to whoever is accountable for it.
  const aiAnalysed = documentCounts.filter((row) => row.aiStatus === "COMPLETED").reduce((sum, row) => sum + row._count._all, 0);
  const humanApproved = documentCounts.filter((row) => row.reviewStatus === "APPROVED").reduce((sum, row) => sum + row._count._all, 0);
  const awaitingReview = documentCounts.filter((row) => row.reviewStatus === "PENDING").reduce((sum, row) => sum + row._count._all, 0);

  const models: Array<[string, string, string]> = [
    ["Career readiness", READINESS_MODEL_VERSION, `Single calculation shared by every surface. Weights: ${Object.entries(READINESS_WEIGHTS).map(([name, weight]) => `${name} ${Math.round(weight * 100)}%`).join(", ")}. Components a track does not define are excluded and the remaining weights renormalized.`],
    ["Student intelligence", STUDENT_INTELLIGENCE_MODEL_VERSION, "Readiness, interest signals, career matching, adaptive roadmap, and career-direction suggestions. Never changes a student's target career; suggestions require several independent signals and can be dismissed."],
    ["Employer intelligence", EMPLOYER_INTELLIGENCE_MODEL_VERSION, "Candidate fit, requirement quality, talent availability, recurring applicant gaps. Job-related evidence only; no protected characteristic participates. Decision support, never an automated hiring decision."],
    ["University intelligence", UNIVERSITY_INTELLIGENCE_MODEL_VERSION, "Demand coverage, curriculum gaps, and offering recommendations. Cohort figures are aggregate-only and suppressed below the minimum cohort size."],
    ["Ecosystem intelligence", ECOSYSTEM_INTELLIGENCE_MODEL_VERSION, "Shared demand, supply, and coverage signals. Publishes no trend, growth, or forecast figure because no historical series is stored."],
  ];
  return <main className="page-shell"><span className="eyebrow">Responsible AI operations</span><h1 className="page-title">Governance and human oversight</h1><p className="muted">Test high-impact situations, review automated recommendations and trace the ITU-T Y.3172-style pipeline.</p>
    <div className="grid-2" id="moderation-queue" style={{ marginTop: 26, alignItems: "start", scrollMarginTop: 90 }}><section className="card"><h2>Scenario simulator</h2><form action={createGovernanceScenario} className="form-grid"><label>Scenario title<input className="input" name="title" required/></label><label>Risk category<select className="input" name="scenarioType"><option value="AUTOMATED_HIRING">Automated hiring decision</option><option value="DATA_SHARING">Data sharing</option><option value="MODEL_DRIFT">Bias or model drift</option><option value="OTHER">Other</option></select></label><label>Description<textarea className="input" name="description" placeholder="Example: Automatically reject every candidate below a 70% match." required/></label><button className="button primary">Run sandbox checks</button></form></section><section className="card"><h2>Human review queue</h2>{appeals.length ? appeals.map(a => <form action={resolveAppeal} className="data-row" key={a.id}><input type="hidden" name="appealId" value={a.id}/><div style={{ flex: 1 }}><strong>{a.student.user.name} · {a.subjectType}</strong><div className="muted">{a.reason}</div><textarea className="input" name="resolution" placeholder="Resolution and corrective action" required/></div><select className="input" name="status"><option value="RESOLVED">Resolve</option><option value="REJECTED">Reject</option><option value="UNDER_REVIEW">Keep reviewing</option></select><button className="button secondary">Record</button></form>) : <div className="notice">No review requests.</div>}</section></div>
    <section className="card" id="ai-governance" style={{ marginTop: 18, scrollMarginTop: 90 }}><h2>Scenario results</h2>{scenarios.map(s => { const issues = JSON.parse(s.detectedIssues) as string[]; return <form action={decideGovernanceScenario} className="data-row" key={s.id} style={{ alignItems: "end" }}><input type="hidden" name="scenarioId" value={s.id}/><div style={{ flex: 1 }}><div><span className={`pill status-${s.riskLevel === "HIGH" ? "rejected" : "pending"}`}>{s.riskLevel} RISK</span> <span className="pill">{s.humanDecision}</span></div><strong style={{ display: "block", marginTop: 8 }}>{s.title}</strong><div className="muted">{issues.join(" · ")}</div><div className="notice" style={{ marginTop: 8 }}>{s.proposedAction}</div></div><textarea className="input" name="note" placeholder="Required human justification" required/><button className="button secondary" name="decision" value="APPROVED">Approve control</button><button className="button danger" name="decision" value="OVERRIDDEN">Override</button></form>; })}</section>
    <section className="card" id="intelligence-transparency" style={{ marginTop: 18, scrollMarginTop: 90 }}><span className="eyebrow">Intelligence transparency</span><h2>Calculations currently in use</h2><p className="muted">Every recommendation surface records its model version on the audit trail below. These are the versions running now.</p>
      {models.map(([name, version, explanation]) => <div className="data-row" key={name}><div style={{ flex: 1 }}><strong>{name}</strong><div className="muted">{explanation}</div></div><span className="pill">{version}</span></div>)}
      <h3 style={{ marginTop: 20 }}>Evidence: automated analysis versus human verification</h3>
      <div className="grid-3">
        <div><div className="data-row"><strong>AI-analysed documents</strong><b>{aiAnalysed}</b></div><p className="muted" style={{ fontSize: 12 }}>Automated extraction completed. Advisory only; confers no verified status.</p></div>
        <div><div className="data-row"><strong>Human-approved documents</strong><b>{humanApproved}</b></div><p className="muted" style={{ fontSize: 12 }}>Approved by a named reviewer. Only these count as verified evidence.</p></div>
        <div><div className="data-row"><strong>Awaiting human review</strong><b>{awaitingReview}</b></div><p className="muted" style={{ fontSize: 12 }}>In the review queue. Not scored until a person decides.</p></div>
      </div>
      <div className="grid-2" style={{ marginTop: 16 }}>
        <div><strong>Certifications by verification status</strong>{certificationCounts.map(row => <div className="data-row" key={row.verificationStatus}><span>{row.verificationStatus}</span><b>{row._count._all}</b></div>)}{certificationCounts.length === 0 && <p className="muted">No certification submitted yet.</p>}</div>
        <div><strong>Roadmap recommendations by source</strong>{roadmapCounts.map(row => <div className="data-row" key={row.source}><span>{row.source}</span><b>{row._count._all}</b></div>)}{roadmapCounts.length === 0 && <p className="muted">No roadmap item generated yet.</p>}</div>
      </div>
    </section>

    <section className="card" style={{ marginTop: 18 }}><span className="eyebrow">ITU-T Y.3172 traceability</span><h2>Operational pipeline map</h2><div className="grid-2">{PIPELINE.map(([name, implementation, status]) => <div className="data-row" key={name}><div><strong>{name}</strong><div className="muted">{implementation}</div></div><span className="pill">{status}</span></div>)}</div></section>
    <section className="card" id="audit-logs" style={{ marginTop: 18, scrollMarginTop: 90 }}><h2>Decision audit trail</h2>{audits.map(a => <div className="data-row" key={a.id}><div><strong>{a.action}</strong><div className="muted">{a.entityType} · {a.explanation ?? "No additional note"}</div></div><div className="muted">{a.modelVersion ?? "human"}<br/>{a.createdAt.toLocaleString()}</div></div>)}</section>
  </main>;
}
