/* eslint-disable @next/next/no-img-element -- evidence is a private authenticated route, not a public optimizable asset */
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/session";
import { reviewCertification, reviewEmployer, toggleUserActive } from "@/actions/admin";

export default async function AdminDashboard() {
  const ctx = await getCurrentAdmin();
  if (!ctx) redirect("/login");

  const [submissions, employers, users] = await Promise.all([
    prisma.studentCertification.findMany({
      include: { certification: true, student: { include: { user: true } } },
      orderBy: { earnedAt: "desc" },
    }),
    prisma.employer.findMany({
      include: { user: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({ orderBy: [{ role: "asc" }, { createdAt: "desc" }] }),
  ]);

  const pendingCerts = submissions.filter((item) => item.verificationStatus === "PENDING" && item.evidencePath);
  const pendingEmployers = employers.filter((e) => e.verificationStatus === "PENDING");
  const roleCounts = users.reduce<Record<string, number>>((acc, u) => {
    acc[u.role] = (acc[u.role] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <main className="page-shell">
      <div className="data-row">
        <div>
          <span className="eyebrow">Verification administration</span>
          <h1 className="page-title">Trust & governance</h1>
        </div>
        <Link className="button secondary" href="/admin/career-tracks">Manage career taxonomy</Link>
      </div>
      <p className="muted">Review submitted evidence, approve employer accounts, and manage user access.</p>

      <div className="grid-3" style={{ marginTop: 26 }}>
        <div className="card"><span className="muted">Pending certificates</span><div className="metric">{pendingCerts.length}</div></div>
        <div className="card"><span className="muted">Pending employers</span><div className="metric">{pendingEmployers.length}</div></div>
        <div className="card"><span className="muted">Total users</span><div className="metric">{users.length}</div><span className="muted">{Object.entries(roleCounts).map(([r, c]) => `${c} ${r.toLowerCase()}`).join(" · ")}</span></div>
      </div>

      <section className="card" style={{ marginTop: 18 }}>
        <span className="eyebrow">Employer verification</span>
        <h2>Pending employer accounts</h2>
        <p className="muted">Employers can browse the portal immediately, but can&apos;t post roles or see candidates until approved here.</p>
        <div className="stack" style={{ marginTop: 12 }}>
          {pendingEmployers.length ? pendingEmployers.map((e) => (
            <article className="card" key={e.id} style={{ boxShadow: "none", border: "1px solid #e0e7e3" }}>
              <div className="data-row">
                <div>
                  <strong>{e.company}</strong>
                  <div className="muted">{e.user.name} · {e.user.email}{e.industry ? ` · ${e.industry}` : ""}</div>
                </div>
                <span className="pill status-pending">Pending</span>
              </div>
              <form action={reviewEmployer} className="form-grid">
                <input type="hidden" name="employerId" value={e.id} />
                <label>Review note<textarea className="input" name="reviewNote" placeholder="Required when rejecting; optional when approving." /></label>
                <div className="actions" style={{ margin: 0 }}>
                  <button className="button primary" name="decision" value="APPROVED">Approve employer</button>
                  <button className="button danger" name="decision" value="REJECTED">Reject employer</button>
                </div>
              </form>
            </article>
          )) : <div className="notice">No employer accounts awaiting review.</div>}
        </div>
      </section>

      <section className="card" style={{ marginTop: 18 }}>
        <span className="eyebrow">Certificate evidence review</span>
        <h2>Pending certificate submissions</h2>
        <p className="muted">Review the submitted image, compare it with the student&apos;s claim, and record a human decision.</p>
        <div className="stack" style={{ marginTop: 12 }}>
          {pendingCerts.length ? pendingCerts.map((item) => (
            <article className="card review-card" key={item.id}>
              <div><img className="certificate-preview" src={`/api/certificates/${item.id}/image`} alt={`Certificate submitted by ${item.student.user.name}`} /></div>
              <div>
                <span className="pill">Pending</span>
                <h2>{item.certification.name}</h2>
                <p><strong>{item.student.user.name}</strong><br /><span className="muted">{item.student.user.email} · submitted {item.earnedAt.toLocaleDateString()}</span></p>
                <form action={reviewCertification} className="form-grid">
                  <input type="hidden" name="submissionId" value={item.id} />
                  <label>Review note<textarea className="input" name="reviewNote" placeholder="Required when rejecting; optional when approving." /></label>
                  <div className="actions" style={{ margin: 0 }}>
                    <button className="button primary" name="decision" value="APPROVED">Approve evidence</button>
                    <button className="button danger" name="decision" value="REJECTED">Reject evidence</button>
                  </div>
                </form>
              </div>
            </article>
          )) : <div className="notice">There are no pending certificate submissions.</div>}
        </div>
      </section>

      <section className="card" style={{ marginTop: 18 }}>
        <span className="eyebrow">User management</span>
        <h2>All accounts</h2>
        <div className="stack" style={{ marginTop: 12 }}>
          {users.map((u) => (
            <div className="data-row" key={u.id}>
              <div>
                <strong>{u.name}</strong>
                <div className="muted">{u.email} · {u.role.toLowerCase()} · joined {u.createdAt.toLocaleDateString()}</div>
              </div>
              <div className="actions">
                <span className={`pill ${u.active ? "status-approved" : "status-rejected"}`}>{u.active ? "Active" : "Deactivated"}</span>
                {u.id !== ctx.user.id && (
                  <form action={toggleUserActive}>
                    <input type="hidden" name="userId" value={u.id} />
                    <button className={`button ${u.active ? "danger" : "secondary"}`}>{u.active ? "Deactivate" : "Reactivate"}</button>
                  </form>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
