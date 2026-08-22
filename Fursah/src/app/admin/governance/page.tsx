import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/session";
import { createGovernanceScenario, decideGovernanceScenario, resolveAppeal } from "@/actions/governance";
import { READINESS_MODEL_VERSION, READINESS_WEIGHTS } from "@/lib/intelligence/readiness";
import { STUDENT_INTELLIGENCE_MODEL_VERSION } from "@/lib/intelligence/student";
import { EMPLOYER_INTELLIGENCE_MODEL_VERSION } from "@/lib/intelligence/employer";
import { UNIVERSITY_INTELLIGENCE_MODEL_VERSION } from "@/lib/intelligence/university";
import { ECOSYSTEM_INTELLIGENCE_MODEL_VERSION } from "@/lib/intelligence/ecosystem";
import { Y3172_EXTENSIONS, Y3172_NODES } from "@/lib/standards";
import { parseIssues } from "@/lib/governanceIssues";
import AdminAuditTrail from "@/components/AdminAuditTrail";

// The seven clause 8.1 nodes come from the shared registry so this page and
// the public figure on the Responsible AI policy page cannot describe the
// pipeline differently. The two entries after them are extensions from
// Y.3181 and Y.3176 rather than clause 8.1 nodes, and are labelled as such.
const PIPELINE: Array<[string, string, string]> = [
  ...Y3172_NODES.map((node): [string, string, string] => [`${node.id} · ${node.label}`, node.fursah, "ACTIVE"]),
  ...Y3172_EXTENSIONS.map((extension): [string, string, string] => [extension.label, `${extension.reference}: ${extension.fursah}`, extension.status === "Prototype" ? "PROTOTYPE" : "ACTIVE"]),
];

// The appeal row stores the subject as an enum. Printed raw beside a person's
// name it reads as shouting, so each one gets the words a reviewer would use.
const DECISION_LABEL: Record<string, string> = {
  APPROVED: "Control approved",
  OVERRIDDEN: "Overridden",
  PENDING: "Awaiting a decision",
};

const SUBJECT_LABEL: Record<string, string> = {
  READINESS: "Readiness score",
  CERTIFICATION: "Certification",
  APPLICATION: "Job application",
  MATCH: "Career match",
  ROADMAP: "Roadmap",
};

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

  // Each service is listed with a plain sentence saying what it does, so the
  // list is readable without expanding anything. The version string is the
  // audit identifier and belongs with the detail, not in the headline.
  const models: Array<[string, string, string, string]> = [
    ["Career readiness", READINESS_MODEL_VERSION, "Turns a student's evidence into a single readiness score.", `Single calculation shared by every surface. Weights: ${Object.entries(READINESS_WEIGHTS).map(([name, weight]) => `${name} ${Math.round(weight * 100)}%`).join(", ")}. Components a track does not define are excluded and the remaining weights renormalized.`],
    ["Student intelligence", STUDENT_INTELLIGENCE_MODEL_VERSION, "Suggests roadmap steps and career matches to students.", "Readiness, interest signals, career matching, adaptive roadmap, and career-direction suggestions. Never changes a student's target career; suggestions require several independent signals and can be dismissed."],
    ["Employer intelligence", EMPLOYER_INTELLIGENCE_MODEL_VERSION, "Ranks candidate fit and flags weak job requirements.", "Candidate fit, requirement quality, talent availability, recurring applicant gaps. Job-related evidence only; no protected characteristic participates. Decision support, never an automated hiring decision."],
    ["University intelligence", UNIVERSITY_INTELLIGENCE_MODEL_VERSION, "Shows demand coverage and curriculum gaps per programme.", "Demand coverage, curriculum gaps, and offering recommendations. Cohort figures are aggregate-only and suppressed below the minimum cohort size."],
    ["Ecosystem intelligence", ECOSYSTEM_INTELLIGENCE_MODEL_VERSION, "Aggregates supply and demand across the whole ecosystem.", "Shared demand, supply, and coverage signals. Publishes no trend, growth, or forecast figure because no historical series is stored."],
  ];
  // One sentence that answers the question the three counters below raise:
  // how much of what the system holds has actually been checked by a person.
  const totalDocuments = documentCounts.reduce((sum, row) => sum + row._count._all, 0);
  const evidenceSummary = totalDocuments === 0
    ? "No evidence document has been uploaded yet, so nothing is waiting on a reviewer."
    : `${humanApproved} of ${totalDocuments} uploaded document${totalDocuments === 1 ? "" : "s"} ${humanApproved === 1 ? "has" : "have"} been approved by a person${awaitingReview ? `, and ${awaitingReview} ${awaitingReview === 1 ? "is" : "are"} still waiting for review` : ""}.`;
  const statusLabel = (value: string) => value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, " ");
  const sourceLabel = (value: string) => value.toUpperCase() === "AI" ? "Suggested by AI" : `Added by ${value.toLowerCase()}`;
  // A decided scenario is a record, not a form. Splitting the two means an
  // already-approved control stops offering an Approve button and shows the
  // justification that was actually written instead.
  const pendingScenarios = scenarios.filter((scenario) => scenario.humanDecision === "PENDING");
  const decidedScenarios = scenarios.filter((scenario) => scenario.humanDecision !== "PENDING");
  const scenarioReviewerIds = [...new Set(decidedScenarios.map((scenario) => scenario.reviewedBy).filter((id): id is string => Boolean(id)))];
  const scenarioReviewers = scenarioReviewerIds.length ? await prisma.user.findMany({ where: { id: { in: scenarioReviewerIds } }, select: { id: true, name: true } }) : [];
  const reviewerName = new Map(scenarioReviewers.map((reviewer) => [reviewer.id, reviewer.name]));

  const auditItems = audits.map((audit, index) => ({
    id: audit.id,
    action: audit.action,
    entityType: audit.entityType,
    explanation: audit.explanation ?? "No additional note",
    modelVersion: audit.modelVersion,
    createdAt: audit.createdAt.toISOString(),
    recent: index < 5,
  }));
  return <main className="page-shell"><span className="eyebrow">Responsible AI operations</span><h1 className="page-title">Governance and human oversight</h1><p className="muted">Test high-impact situations, review automated recommendations and trace the ITU-T Y.3172-style pipeline.</p>
    <div className="grid-2" id="moderation-queue" style={{ marginTop: 26, alignItems: "start", scrollMarginTop: 90 }}><section className="card"><h2>Scenario simulator</h2><form action={createGovernanceScenario} className="form-grid"><label>Scenario title<input className="input" name="title" required/></label><label>Risk category<select className="input" name="scenarioType"><option value="AUTOMATED_HIRING">Automated hiring decision</option><option value="DATA_SHARING">Data sharing</option><option value="MODEL_DRIFT">Bias or model drift</option><option value="OTHER">Other</option></select></label><label>Description<textarea className="input" name="description" placeholder="Example: Automatically reject every candidate below a 70% match." required/></label><button className="button primary">Run sandbox checks</button></form></section><section className="card"><h2>Human review queue</h2><p className="muted">A student has asked for an automated result to be looked at by a person. Record what was checked and what changed.</p><div className="stack" style={{ marginTop: 14 }}>{appeals.length ? appeals.map(a => <form action={resolveAppeal} className="appeal-row" key={a.id}><input type="hidden" name="appealId" value={a.id}/>
      <header><strong>{a.student.user.name}</strong><span className="pill">{SUBJECT_LABEL[a.subjectType] ?? a.subjectType}</span></header>
      <p className="appeal-reason">{a.reason}</p>
      <label>Resolution and corrective action<textarea className="input" name="resolution" placeholder="What was checked, what was changed, and what the student was told." required/></label>
      <footer><label>Outcome<select className="input" name="status"><option value="RESOLVED">Resolve</option><option value="REJECTED">Reject</option><option value="UNDER_REVIEW">Keep reviewing</option></select></label><button className="button primary">Record</button></footer>
    </form>) : <div className="notice">No review requests.</div>}</div></section></div>
    <section className="card admin-scenarios" id="ai-governance" style={{ marginTop: 18, scrollMarginTop: 90 }}>
      <h2>Scenario results</h2>
      <p className="muted">Each scenario was checked against the rule set and given a proposed control. A person has to accept that control or override it, in writing, before the scenario counts as decided.</p>

      <h3 className="scenario-heading">Awaiting a decision<span>{pendingScenarios.length}</span></h3>
      <div className="stack" style={{ marginTop: 12 }}>
        {pendingScenarios.length ? pendingScenarios.map(s => { const issues = parseIssues(s.detectedIssues); return <form action={decideGovernanceScenario} className="admin-scenario-row" key={s.id}>
          <input type="hidden" name="scenarioId" value={s.id}/>
          <div className="admin-scenario-summary">
            <div><span className={`pill status-${s.riskLevel === "HIGH" ? "rejected" : s.riskLevel === "MEDIUM" ? "pending" : "approved"}`}>{s.riskLevel} RISK</span></div>
            <Link className="scenario-title-link" href={`/admin/governance/scenarios/${s.id}`}>{s.title}</Link>
            <p>{issues.join(" · ")}</p>
            <div className="notice">{s.proposedAction}</div>
          </div>
          <label className="admin-scenario-note"><span>Human justification</span><textarea className="input" name="note" placeholder="Explain the decision and any corrective action" required/></label>
          <div className="admin-scenario-actions">
            <button className="button primary" name="decision" value="APPROVED">Approve control</button>
            <button className="button danger" name="decision" value="OVERRIDDEN">Override</button>
          </div>
        </form>; }) : <div className="notice">Every scenario has been decided. New ones appear here as soon as the simulator runs.</div>}
      </div>

      <h3 className="scenario-heading">Decided<span>{decidedScenarios.length}</span></h3>
      <div className="stack" style={{ marginTop: 12 }}>
        {decidedScenarios.length ? decidedScenarios.map(s => { const issues = parseIssues(s.detectedIssues); return <article className={`scenario-decided is-${s.humanDecision.toLowerCase()}`} key={s.id}>
          <header>
            <div>
              <div className="scenario-pills"><span className={`pill status-${s.riskLevel === "HIGH" ? "rejected" : s.riskLevel === "MEDIUM" ? "pending" : "approved"}`}>{s.riskLevel} RISK</span><span className={`pill status-${s.humanDecision === "APPROVED" ? "approved" : "rejected"}`}>{DECISION_LABEL[s.humanDecision] ?? s.humanDecision}</span></div>
              <Link className="scenario-title-link" href={`/admin/governance/scenarios/${s.id}`}>{s.title}</Link>
              <p className="muted">{issues.join(" · ")}</p>
            </div>
          </header>
          <div className="notice">{s.proposedAction}</div>
          <div className="scenario-verdict">
            <span>{s.humanDecision === "APPROVED" ? "Control accepted" : "Control overridden"} by {(s.reviewedBy ? reviewerName.get(s.reviewedBy) : null) ?? "an administrator"}{s.reviewedAt ? ` on ${s.reviewedAt.toLocaleDateString()}` : ""}</span>
            <p>{s.decisionNote ?? "No justification was recorded."}</p>
          </div>
          <details className="scenario-revise">
            <summary>Revise this decision</summary>
            <form action={decideGovernanceScenario} className="scenario-revise-form">
              <input type="hidden" name="scenarioId" value={s.id}/>
              <label>New justification<textarea className="input" name="note" placeholder="Explain what changed and why the earlier decision no longer stands." required/></label>
              <div className="actions" style={{ margin: 0 }}>
                <button className="button primary" name="decision" value="APPROVED">Approve control</button>
                <button className="button danger" name="decision" value="OVERRIDDEN">Override</button>
              </div>
            </form>
          </details>
        </article>; }) : <div className="notice">No scenario has been decided yet.</div>}
      </div>
    </section>
    <section className="card admin-models" id="intelligence-transparency" style={{ marginTop: 18, scrollMarginTop: 90 }}><span className="eyebrow">Intelligence transparency</span><h2>What is calculated automatically, and what a person has checked</h2><p className="muted">Every figure in this section is produced by software, and none of it is a decision on its own. Evidence counts as verified only after a named reviewer approves it, so the counters below are the honest picture of how much has actually been checked.</p>

      <div className="transparency-block">
        <h3><span className="transparency-step">1</span>Evidence documents</h3>
        <p className="transparency-lede">{evidenceSummary}</p>
        <div className="transparency-stats">
          <div className="transparency-stat ai-box"><span>Analysed by AI</span><b>{aiAnalysed}</b><small>Automated extraction finished. Advisory only; confers no verified status.</small></div>
          <div className="transparency-stat"><span>Approved by a person</span><b>{humanApproved}</b><small>Signed off by a named reviewer. Only these count as verified evidence.</small></div>
          <div className="transparency-stat"><span>Waiting for a person</span><b>{awaitingReview}</b><small>In the review queue. Not scored until someone decides.</small></div>
        </div>
      </div>

      <div className="transparency-block">
        <h3><span className="transparency-step">2</span>Where automated output is already in use</h3>
        <p className="transparency-lede">Two places where a calculation has produced something a person can see. Both remain reversible.</p>
        <div className="transparency-panels">
          <div className="transparency-panel"><h4>Certifications by verification status</h4>{certificationCounts.map(row => <div className="data-row" key={row.verificationStatus}><span>{statusLabel(row.verificationStatus)}</span><b>{row._count._all}</b></div>)}{certificationCounts.length === 0 && <p className="muted">No certification submitted yet.</p>}<small>A certification is evidence only once it is approved.</small></div>
          <div className="transparency-panel"><h4>Roadmap items by who suggested them</h4>{roadmapCounts.map(row => <div className={`data-row${row.source.toUpperCase() === "AI" ? " ai-row" : ""}`} key={row.source}><span>{sourceLabel(row.source)}</span><b>{row._count._all}</b></div>)}{roadmapCounts.length === 0 && <p className="muted">No roadmap item generated yet.</p>}<small>AI-suggested steps are recommendations; the student chooses whether to keep them.</small></div>
        </div>
      </div>

      <div className="transparency-block">
        <h3><span className="transparency-step">3</span>The five calculation services</h3>
        <p className="transparency-lede">What each service does, in one line. Expand one only when you need its full scope and safeguards.</p>
        <div className="admin-model-list">{models.map(([name, version, purpose, explanation]) => <details className="ai-box" key={name}><summary><span><strong>{name}</strong><small>{purpose}</small></span><code className="transparency-version">{version}</code></summary><p>{explanation}</p></details>)}</div>
      </div>
    </section>

    <section className="card" style={{ marginTop: 18 }}><span className="eyebrow">ITU-T Y.3172 traceability</span><h2>Operational pipeline map</h2><div className="grid-2">{PIPELINE.map(([name, implementation, status]) => <div className="data-row" key={name}><div><strong>{name}</strong><div className="muted">{implementation}</div></div><span className="pill">{status}</span></div>)}</div></section>
    <AdminAuditTrail items={auditItems}/>
  </main>;
}
