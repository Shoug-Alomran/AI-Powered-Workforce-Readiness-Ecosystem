import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentStudent } from "@/lib/session";
import { syncRoadmap, updateRoadmapItem } from "@/actions/student";

const LABEL: Record<string, string> = { NOT_STARTED: "Not started", IN_PROGRESS: "In progress", COMPLETED: "Completed", SKIPPED: "Skipped", STRUGGLING: "Needs an alternative" };

export default async function RoadmapPage() {
  const ctx = await getCurrentStudent();
  if (!ctx) redirect("/login");
  const items = await prisma.roadmapItem.findMany({ where: { studentId: ctx.student.id }, orderBy: [{ status: "asc" }, { createdAt: "desc" }] });
  const completed = items.filter((item) => item.status === "COMPLETED").length;
  return <main className="page-shell">
    <div className="data-row"><div><span className="eyebrow">Adaptive learning plan</span><h1 className="page-title">Your living roadmap</h1></div><form action={syncRoadmap}><button className="button primary">Refresh recommendations</button></form></div>
    <p className="muted">Progress is saved. Marking an action as difficult or skipped creates a different route toward the same career goal.</p>
    <div className="grid-3" style={{ marginTop: 26 }}><div className="card"><span className="muted">Milestones</span><div className="metric">{items.length}</div></div><div className="card"><span className="muted">Completed</span><div className="metric">{completed}</div></div><div className="card"><span className="muted">Potential readiness gain</span><div className="metric">+{items.filter(i => i.status !== "COMPLETED").reduce((n, i) => n + i.expectedImpact, 0)}</div></div></div>
    <section className="card" style={{ marginTop: 18 }}><h2>Milestones and alternatives</h2>{items.length ? items.map(item => <form action={updateRoadmapItem} className="data-row" key={item.id} style={{ alignItems: "end" }}><input type="hidden" name="itemId" value={item.id}/><div style={{ flex: 1 }}><div><span className="pill">{item.category}</span> <span className="pill">{item.source}</span></div><strong style={{ display: "block", marginTop: 8 }}>{item.title}</strong><div className="muted">Expected impact: +{item.expectedImpact} · {LABEL[item.status] ?? item.status}</div><input className="input" name="note" defaultValue={item.studentNote ?? ""} placeholder="Optional progress note" style={{ marginTop: 8 }}/></div><select className="input" name="status" defaultValue={item.status}>{Object.entries(LABEL).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><button className="button secondary">Save</button></form>) : <div className="notice">Refresh recommendations to create your first persistent roadmap.</div>}</section>
  </main>;
}
