import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/session";
import { captureMonitoringSnapshot } from "@/actions/governance";
import MonitoringCaptureForm from "@/components/MonitoringCaptureForm";

const STATUS_LABELS: Record<string, string> = {
  HEALTHY: "Healthy",
  WATCH: "Watch",
  PAUSED: "Paused",
  INSUFFICIENT_DATA: "Insufficient data",
};

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Riyadh",
});

function signed(value: number, suffix = "") {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}${suffix}`;
}

export default async function MonitoringPage() {
  const ctx = await getCurrentAdmin();
  if (!ctx) redirect("/login");

  const snapshots = await prisma.monitoringSnapshot.findMany({ orderBy: { createdAt: "desc" }, take: 12 });
  const latest = snapshots[0];

  return (
    <main className="page-shell">
      <div className="data-row" style={{ alignItems: "start" }}>
        <div>
          <span className="eyebrow">Model assurance</span>
          <h1 className="page-title">Fairness, drift and data sufficiency</h1>
        </div>
        <MonitoringCaptureForm action={captureMonitoringSnapshot} />
      </div>
      <p className="muted">Only final hiring decisions are eligible outcomes. At least 20 are required; watch at ±5 score points or ±8 percentage points outcome drift; pause at ±10 or ±15.</p>

      {latest ? <>
        <div className="grid-3" style={{ marginTop: 26 }}>
          <div className="card"><span className="muted">Monitoring status</span><div className="metric" style={{ fontSize: 24 }}>{STATUS_LABELS[latest.status] ?? latest.status}</div></div>
          <div className="card"><span className="muted">Eligible outcomes</span><div className="metric">{latest.sampleSize}</div><span className="muted">minimum 20 final decisions</span></div>
          <div className="card"><span className="muted">Model version</span><div className="metric" style={{ fontSize: 22 }}>{latest.modelVersion}</div><span className="muted">Captured {dateFormatter.format(latest.createdAt)} AST</span></div>
        </div>
        {latest.sampleSize < 20 && <div className="notice" style={{ marginTop: 18 }}><strong>Insufficient data:</strong> fairness and performance conclusions are suppressed. These records may be inspected, but must not justify a model or policy change.</div>}
        <section className="card" style={{ marginTop: 18 }}>
          <h2>Monitoring history</h2>
          {snapshots.map((snapshot, index) => <div className="data-row" key={snapshot.id} style={{ alignItems: "center" }}>
            <div>
              <strong>{STATUS_LABELS[snapshot.status] ?? snapshot.status}</strong>
              {index === 0 && <span className="pill status-approved" style={{ marginInlineStart: 8 }}>Current</span>}
              <div className="muted">{dateFormatter.format(snapshot.createdAt)} AST · {snapshot.sampleSize} eligible outcome{snapshot.sampleSize === 1 ? "" : "s"}</div>
              <div className="muted">Average score {snapshot.averageScore.toFixed(1)} · Hire rate {(snapshot.outcomeRate * 100).toFixed(1)}%</div>
            </div>
            <div className="muted" style={{ textAlign: "end" }}>
              {snapshots.length === 1 ? "Initial baseline" : <><span>Score drift {signed(snapshot.scoreDrift)}</span><br/><span>Hire-rate drift {signed(snapshot.outcomeDrift * 100, " pp")}</span></>}
            </div>
          </div>)}
        </section>
      </> : <div className="notice" style={{ marginTop: 26 }}>No baseline exists yet. Capture the first monitoring snapshot to begin tracking drift.</div>}

      <section className="card" style={{ marginTop: 18 }}>
        <h2>Fairness evaluation contract</h2>
        <div className="grid-3">
          <div><strong>Permitted grouping</strong><p className="muted">Only approved, aggregate evaluation groups with a documented fairness purpose.</p></div>
          <div><strong>Minimum group size</strong><p className="muted">No comparison or display for a group containing fewer than 20 final outcomes.</p></div>
          <div><strong>Response</strong><p className="muted">Material disparity pauses automated ranking and opens a human investigation.</p></div>
        </div>
      </section>
    </main>
  );
}
