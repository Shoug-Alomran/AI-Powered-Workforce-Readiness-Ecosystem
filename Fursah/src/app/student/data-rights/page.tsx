import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentStudent } from "@/lib/session";
import { submitDataRequest } from "@/actions/student";
import EmptyState from "@/components/EmptyState";

export default async function DataRightsPage() {
  const ctx = await getCurrentStudent(); if (!ctx) redirect("/login");
  const requests = await prisma.dataRequest.findMany({ where: { studentId: ctx.student.id }, orderBy: { createdAt: "desc" } });
  return <main className="page-shell reading-page"><span className="eyebrow">Your information, your rights</span><h1 className="page-title">Data requests</h1><p className="muted">Request a copy, correction, access summary, or account-data deletion. Deletion requests are reviewed to protect records that must be retained lawfully.</p><div className="grid-2" style={{ marginTop: 26, alignItems: "start" }}><section className="card"><h2>New request</h2><form action={submitDataRequest} className="form-grid"><label>Request type<select className="input" name="type"><option value="ACCESS">Explain what data is held</option><option value="DOWNLOAD">Download my data</option><option value="CORRECTION">Correct my data</option><option value="DELETION">Delete my data</option></select></label><label>Details<textarea className="input" name="details" placeholder="Identify the information or correction involved."/></label><button className="button primary">Submit request</button></form></section><section className="card"><h2>Request history</h2>{requests.length ? requests.map(r => <div className="data-row" key={r.id}><div><strong>{r.type}</strong><div className="muted">{r.resolution ?? r.details ?? "Awaiting review"}</div></div><span className="pill">{r.status}</span></div>) : <EmptyState icon="⎙" title="No requests yet" body="Submit a request on the left and it will be tracked here with its status and the reviewer's written outcome." />}</section></div></main>;
}
