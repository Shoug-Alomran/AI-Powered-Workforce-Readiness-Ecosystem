import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/session";
import { updateSupportTicket } from "@/actions/governance";

export default async function SupportAdminPage() {
  const ctx = await getCurrentAdmin(); if (!ctx) redirect("/login");
  const tickets = await prisma.supportTicket.findMany({ orderBy: [{ priority: "desc" }, { createdAt: "desc" }] });
  return <main className="page-shell"><span className="eyebrow">Customer operations</span><h1 className="page-title">Support queue</h1><p className="muted">Urgent privacy and safety tickets are prioritized and every resolution remains trackable.</p><section className="card" style={{ marginTop: 26 }}>{tickets.length ? tickets.map(t => <form action={updateSupportTicket} className="data-row" key={t.id}><input type="hidden" name="ticketId" value={t.id}/><div style={{ flex: 1 }}><div><span className="pill">{t.priority}</span> <span className="pill">{t.category}</span></div><strong style={{ display: "block", marginTop: 8 }}>{t.subject}</strong><div className="muted">{t.name} · {t.email}</div><p className="muted">{t.message}</p><textarea className="input" name="resolution" defaultValue={t.resolution ?? ""} placeholder="Resolution or next action"/></div><select className="input" name="status" defaultValue={t.status}><option value="OPEN">Open</option><option value="IN_PROGRESS">In progress</option><option value="RESOLVED">Resolved</option></select><button className="button secondary">Save</button></form>) : <div className="notice">No support tickets.</div>}</section></main>;
}
