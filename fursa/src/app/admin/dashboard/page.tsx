/* eslint-disable @next/next/no-img-element -- evidence is a private authenticated route, not a public optimizable asset */
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/session";
import { reviewCertification } from "@/actions/admin";

export default async function AdminDashboard() {
  const ctx = await getCurrentAdmin();
  if (!ctx) redirect("/login");
  const submissions = await prisma.studentCertification.findMany({
    include: { certification: true, student: { include: { user: true } } },
    orderBy: { earnedAt: "desc" },
  });
  const pending = submissions.filter(item => item.verificationStatus === "PENDING" && item.evidencePath);
  return <main className="page-shell"><span className="eyebrow">Verification administration</span><h1 className="page-title">Certificate evidence review</h1><p className="muted">Review the submitted image, compare it with the student’s claim, and record a human decision.</p>
    <div className="grid-3" style={{marginTop:26}}><div className="card"><span className="muted">Pending review</span><div className="metric">{pending.length}</div></div><div className="card"><span className="muted">Approved</span><div className="metric">{submissions.filter(x=>x.verificationStatus==="APPROVED").length}</div></div><div className="card"><span className="muted">Rejected</span><div className="metric">{submissions.filter(x=>x.verificationStatus==="REJECTED").length}</div></div></div>
    <div className="stack" style={{marginTop:18}}>{pending.length ? pending.map(item => <article className="card review-card" key={item.id}><div><img className="certificate-preview" src={`/api/certificates/${item.id}/image`} alt={`Certificate submitted by ${item.student.user.name}`} /></div><div><span className="pill">Pending</span><h2>{item.certification.name}</h2><p><strong>{item.student.user.name}</strong><br/><span className="muted">{item.student.user.email} · submitted {item.earnedAt.toLocaleDateString()}</span></p><form action={reviewCertification} className="form-grid"><input type="hidden" name="submissionId" value={item.id}/><label>Review note<textarea className="input" name="reviewNote" placeholder="Required when rejecting; optional when approving."/></label><div className="actions" style={{margin:0}}><button className="button primary" name="decision" value="APPROVED">Approve evidence</button><button className="button danger" name="decision" value="REJECTED">Reject evidence</button></div></form></div></article>) : <div className="notice">There are no pending certificate submissions.</div>}</div>
  </main>;
}
