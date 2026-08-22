import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/session";
import { decideGovernanceScenario } from "@/actions/governance";
import { parseIssues } from "@/lib/governanceIssues";

const DECISION_LABEL: Record<string, string> = { APPROVED: "Control approved", OVERRIDDEN: "Overridden", PENDING: "Awaiting a decision" };
const riskTone = (risk: string) => risk === "HIGH" ? "rejected" : risk === "MEDIUM" ? "pending" : "approved";

export default async function ScenarioDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getCurrentAdmin(); if (!ctx) redirect("/login");
  const { id } = await params;

  const scenario = await prisma.governanceScenario.findUnique({ where: { id } });
  if (!scenario) notFound();

  const events = await prisma.auditEvent.findMany({ where: { entityType: "GOVERNANCE_SCENARIO", entityId: scenario.id }, orderBy: { createdAt: "desc" } });
  const actorIds = [...new Set([...events.map((event) => event.actorUserId), scenario.reviewedBy as string | null, scenario.createdBy].filter((value): value is string => Boolean(value)))];
  const actors = actorIds.length ? await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true } }) : [];
  const actorName = new Map(actors.map((actor) => [actor.id, actor.name]));
  const issues = parseIssues(scenario.detectedIssues);
  const decided = scenario.humanDecision !== "PENDING";

  return <main className="page-shell">
    <Link className="link" href="/admin/governance#ai-governance">← Back to scenario results</Link>
    <span className="eyebrow" style={{ marginTop: 14, display: "block" }}>Governance scenario</span>
    <h1 className="page-title" style={{ margin: "6px 0" }}>{scenario.title}</h1>
    <div className="scenario-pills"><span className={`pill status-${riskTone(scenario.riskLevel)}`}>{scenario.riskLevel} RISK</span><span className={`pill status-${scenario.humanDecision === "APPROVED" ? "approved" : scenario.humanDecision === "OVERRIDDEN" ? "rejected" : "pending"}`}>{DECISION_LABEL[scenario.humanDecision] ?? scenario.humanDecision}</span></div>
    <p className="muted">Raised by {actorName.get(scenario.createdBy) ?? "an administrator"} on {scenario.createdAt.toLocaleString()} · {scenario.scenarioType.replace(/_/g, " ").toLowerCase()}</p>

    <section className="card" style={{ marginTop: 18 }}>
      <span className="eyebrow">The scenario as written</span>
      <h2>What was proposed</h2>
      <p className="ticket-message">{scenario.description}</p>
    </section>

    <section className="card" style={{ marginTop: 18 }}>
      <span className="eyebrow">Automated check · scenario-rules-v1</span>
      <h2>What the rule set raised</h2>
      <p className="muted">A fixed rule set read the description and matched it against the platform&apos;s standing controls. It proposes; it does not decide.</p>
      <ul className="ticket-reasons">{issues.map((issue) => <li key={issue}>{issue}</li>)}</ul>
      <div className="notice" style={{ marginTop: 14 }}>{scenario.proposedAction}</div>
    </section>

    <section className="card" style={{ marginTop: 18 }}>
      <span className="eyebrow">Decision</span>
      <h2>{decided ? "The recorded decision" : "Record a decision"}</h2>
      {decided ? <>
        <div className="scenario-verdict">
          <span>{scenario.humanDecision === "APPROVED" ? "Control accepted" : "Control overridden"} by {(scenario.reviewedBy ? actorName.get(scenario.reviewedBy) : null) ?? "an administrator"}{scenario.reviewedAt ? ` on ${scenario.reviewedAt.toLocaleString()}` : ""}</span>
          <p>{scenario.decisionNote ?? "No justification was recorded."}</p>
        </div>
        <details className="scenario-revise" style={{ marginTop: 14 }}>
          <summary>Revise this decision</summary>
          <form action={decideGovernanceScenario} className="scenario-revise-form">
            <input type="hidden" name="scenarioId" value={scenario.id} />
            <label>New justification<textarea className="input" name="note" placeholder="Explain what changed and why the earlier decision no longer stands." required /></label>
            <div className="actions" style={{ margin: 0 }}>
              <button className="button primary" name="decision" value="APPROVED">Approve control</button>
              <button className="button danger" name="decision" value="OVERRIDDEN">Override</button>
            </div>
          </form>
        </details>
      </> : <form action={decideGovernanceScenario} className="scenario-revise-form" style={{ marginTop: 14 }}>
        <input type="hidden" name="scenarioId" value={scenario.id} />
        <label>Human justification<textarea className="input" name="note" placeholder="Explain the decision and any corrective action." required /></label>
        <div className="actions" style={{ margin: 0 }}>
          <button className="button primary" name="decision" value="APPROVED">Approve control</button>
          <button className="button danger" name="decision" value="OVERRIDDEN">Override</button>
        </div>
      </form>}
    </section>

    <section className="card" style={{ marginTop: 18 }}>
      <span className="eyebrow">Traceability</span>
      <h2>Everything recorded against this scenario</h2>
      <div className="stack" style={{ marginTop: 12 }}>
        {events.length ? events.map((event) => <div className="data-row" key={event.id}>
          <div><strong>{event.action.replace(/^SCENARIO_/, "").replace(/_/g, " ").toLowerCase()}</strong><div className="muted">{event.explanation ?? "No note recorded"}</div></div>
          <small className="muted">{(event.actorUserId ? actorName.get(event.actorUserId) : null) ?? "Unknown"} · {event.createdAt.toLocaleDateString()}{event.modelVersion ? ` · ${event.modelVersion}` : ""}</small>
        </div>) : <p className="muted">Nothing has been recorded against this scenario yet.</p>}
      </div>
    </section>
  </main>;
}
