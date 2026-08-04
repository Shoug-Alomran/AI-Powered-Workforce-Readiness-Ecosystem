import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/session";
import { reviewPortfolioEvidence } from "@/actions/governance";

export default async function EvidencePage() {
  const ctx = await getCurrentAdmin(); if (!ctx) redirect("/login");
  const [projects, experiences] = await Promise.all([prisma.project.findMany({ where: { verificationStatus: "PENDING" }, include: { student: { include: { user: true } } } }), prisma.experience.findMany({ where: { verificationStatus: "PENDING" }, include: { student: { include: { user: true } } } })]);
  const items = [...projects.map(x => ({ ...x, entityType: "PROJECT" })), ...experiences.map(x => ({ ...x, entityType: "EXPERIENCE" }))];
  return <main className="page-shell"><span className="eyebrow">Evidence integrity</span><h1 className="page-title">Project and experience verification</h1><p className="muted">Review submitted portfolio, repository, research, employer, or event links before marking an item verified.</p><section className="card" style={{ marginTop: 26 }}>{items.length ? items.map(item => <form action={reviewPortfolioEvidence} className="data-row" key={`${item.entityType}-${item.id}`}><input type="hidden" name="entityType" value={item.entityType}/><input type="hidden" name="entityId" value={item.id}/><div style={{ flex: 1 }}><span className="pill">{item.entityType}</span><strong style={{ display: "block", marginTop: 8 }}>{item.title}</strong><div className="muted">{item.student.user.name}</div>{item.evidenceUrl && <a className="link" href={item.evidenceUrl} target="_blank" rel="noreferrer">Open submitted evidence</a>}<textarea className="input" name="note" placeholder="Review note; required when rejecting"/></div><button className="button primary" name="decision" value="APPROVED">Approve</button><button className="button danger" name="decision" value="REJECTED">Reject</button></form>) : <div className="notice">No project or experience evidence is waiting for review.</div>}</section></main>;
}
