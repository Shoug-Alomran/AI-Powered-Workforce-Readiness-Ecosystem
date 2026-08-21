import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/session";
import { resolveDataRequest } from "@/actions/governance";
import EmptyState from "@/components/EmptyState";

export default async function DataRequestsAdmin() {
  const ctx = await getCurrentAdmin(); if (!ctx) redirect("/login");
  const requests = await prisma.dataRequest.findMany({ include: { student: { include: { user: true } } }, orderBy: { createdAt: "desc" } });
  return <main className="page-shell"><span className="eyebrow">Privacy operations</span><h1 className="page-title">Data-rights requests</h1><section className="card" style={{ marginTop: 26 }}>{requests.length ? requests.map(r => <form action={resolveDataRequest} className="data-row" key={r.id}><input type="hidden" name="requestId" value={r.id}/><div style={{ flex: 1 }}><strong>{r.student.user.name} · {r.type}</strong><div className="muted">{r.details ?? "No additional details"}</div><textarea className="input" name="resolution" defaultValue={r.resolution ?? ""} placeholder="Action taken, export location, correction, or lawful retention reason" required/></div><select className="input" name="status" defaultValue={r.status}><option value="PROCESSING">Processing</option><option value="COMPLETED">Completed</option><option value="REJECTED">Rejected</option></select><button className="button secondary">Record outcome</button></form>) : <EmptyState tone="clear" icon="✓" title="No requests waiting" body="Access, download, correction and deletion requests appear here the moment a user submits one from their Data rights page. Nothing is outstanding." />}</section></main>;
}
