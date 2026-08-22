/* eslint-disable @next/next/no-img-element -- evidence is a private authenticated route, not a public optimizable asset */
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/session";
import { reviewCertification, reviewCurriculumCompletion, reviewEmployer, toggleUserActive } from "@/actions/admin";
import PageToc from "@/components/PageToc";
import AZStrip from "@/components/AZStrip";
import ActionQueue from "@/components/ActionQueue";
import CertificateReviewHistory from "@/components/CertificateReviewHistory";

const ROLE_LABEL: Record<string, string> = {
  STUDENT: "Students",
  EMPLOYER: "Employers",
  UNIVERSITY: "Universities",
  ADMIN: "Admins",
};

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; letter?: string }>;
}) {
  const ctx = await getCurrentAdmin();
  if (!ctx) redirect("/login");

  const { q = "", role = "", letter = "" } = await searchParams;

  const [submissions, employers, users, curriculumReviews, curriculumDocuments] = await Promise.all([
    prisma.studentCertification.findMany({
      include: { certification: true, student: { include: { user: true } } },
      orderBy: { earnedAt: "desc" },
    }),
    prisma.employer.findMany({
      include: { user: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({ orderBy: [{ name: "asc" }] }),
    prisma.curriculumAction.findMany({ where: { status: "AWAITING_HUMAN_REVIEW" }, include: { university: true }, orderBy: { createdAt: "asc" } }),
    prisma.evidenceDocument.findMany({ where: { contextType: "CURRICULUM_ACTION" }, orderBy: { createdAt: "asc" } }).catch((error) => {
      // Keep the governance dashboard available while a newly deployed
      // evidence-storage migration is still being applied to production.
      console.error("Unable to load curriculum evidence documents", error);
      return [];
    }),
  ]);

  const pendingCerts = submissions.filter((item) => item.verificationStatus === "PENDING" && item.evidencePath);
  const reviewedCerts = submissions.filter((item) => ["APPROVED", "REJECTED"].includes(item.verificationStatus));
  const pendingEmployers = employers.filter((e) => e.verificationStatus === "PENDING");
  const roleCounts = users.reduce<Record<string, number>>((acc, u) => {
    acc[u.role] = (acc[u.role] ?? 0) + 1;
    return acc;
  }, {});

  const availableLetters = new Set(users.map((u) => u.name.charAt(0).toUpperCase()).filter((c) => /[A-Z]/.test(c)));
  const qLower = q.trim().toLowerCase();
  const directory = users.filter((u) => {
    if (role && u.role !== role) return false;
    if (letter && u.name.charAt(0).toUpperCase() !== letter) return false;
    if (qLower && !(u.name.toLowerCase().includes(qLower) || u.email.toLowerCase().includes(qLower))) return false;
    return true;
  });

  function buildHref(overrides: { q?: string; role?: string; letter?: string | null }) {
    const params = new URLSearchParams();
    const nextQ = overrides.q ?? q;
    const nextRole = overrides.role ?? role;
    const nextLetter = overrides.letter === null ? "" : (overrides.letter ?? letter);
    if (nextQ) params.set("q", nextQ);
    if (nextRole) params.set("role", nextRole);
    if (nextLetter) params.set("letter", nextLetter);
    const qs = params.toString();
    return `/admin/dashboard${qs ? `?${qs}` : ""}#user-directory`;
  }

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

      <ActionQueue eyebrow="GOVERNANCE WORK QUEUE" title="Human decisions requiring attention" items={[
        ...(pendingEmployers.length ? [{ title: `Review ${pendingEmployers.length} employer account${pendingEmployers.length === 1 ? "" : "s"}`, reason: "Unverified employers cannot publish roles or inspect candidates.", href: "/admin/dashboard#employer-verification", action: "Open employer review", priority: "high" as const }] : []),
        ...(pendingCerts.length ? [{ title: `Decide ${pendingCerts.length} certificate submission${pendingCerts.length === 1 ? "" : "s"}`, reason: "Automated extraction remains advisory until a named reviewer records a decision.", href: "/admin/dashboard#certificate-review", action: "Open evidence review", priority: "high" as const }] : []),
        ...(curriculumReviews.length ? [{ title: `Verify ${curriculumReviews.length} curriculum completion${curriculumReviews.length === 1 ? "" : "s"}`, reason: "Completion claims require supporting evidence and a human outcome.", href: "/admin/dashboard#curriculum-review", action: "Review completion", priority: "medium" as const }] : []),
        { title: "Review enterprise control readiness", reason: "Inspect implemented, partial, and partner-dependent production controls before any pilot commitment.", href: "/admin/enterprise", action: "Open control register", priority: "low" as const },
      ].slice(0, 4)}/>

      <PageToc
        items={[
          { id: "employer-verification", label: `Employer verification (${pendingEmployers.length})` },
          { id: "certificate-review", label: `Certificate review (${pendingCerts.length})` },
          { id: "certificate-history", label: `Certificate history (${reviewedCerts.length})` },
          { id: "curriculum-review", label: `Curriculum completion (${curriculumReviews.length})` },
          { id: "user-directory", label: `User directory (${users.length})` },
        ]}
      />

      <div className="grid-3" style={{ marginTop: 26 }}>
        <div className="card"><span className="muted">Pending certificates</span><div className="metric">{pendingCerts.length}</div></div>
        <div className="card"><span className="muted">Pending employers</span><div className="metric">{pendingEmployers.length}</div></div>
        <div className="card"><span className="muted">Total users</span><div className="metric">{users.length}</div><span className="muted">{Object.entries(roleCounts).map(([r, c]) => `${c} ${r.toLowerCase()}`).join(" · ")}</span></div>
      </div>

      <section className="card" id="employer-verification" style={{ marginTop: 18, scrollMarginTop: 80 }}>
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
                  {/* Approving from here is a judgement made on two lines of
                      text. The dossier is where the account's documents, roles
                      and automated checks actually are. */}
                  <Link className="button secondary" href={`/admin/employers/${e.id}`}>View full details and evidence</Link>
                </div>
              </form>
            </article>
          )) : <div className="notice">No employer accounts awaiting review.</div>}
        </div>
      </section>

      <section className="card" id="certificate-review" style={{ marginTop: 18, scrollMarginTop: 80 }}>
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
                  <label>Human review note<textarea className="input" name="reviewNote" required placeholder="Record what you checked and why you approved or rejected this evidence." /></label>
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

      <CertificateReviewHistory
        items={reviewedCerts.map((item) => ({
          id: item.id,
          certification: item.certification.name,
          studentName: item.student.user.name,
          studentEmail: item.student.user.email,
          status: item.verificationStatus,
          reviewNote: item.reviewNote ?? "No review note recorded",
          reviewedAt: item.reviewedAt?.toISOString() ?? null,
          reviewerName: users.find((user) => user.id === item.reviewedBy)?.name ?? "Unknown reviewer",
          evidenceName: item.evidenceName,
          hasEvidence: Boolean(item.evidencePath),
        }))}
      />

      <section className="card" id="curriculum-review" style={{ marginTop: 18, scrollMarginTop: 80 }}>
        <span className="eyebrow">Human-in-the-loop review</span>
        <h2>Curriculum completion evidence</h2>
        <p className="muted">AI has checked these submissions for completeness only. Inspect the stated institutional evidence before recording the final human decision.</p>
        <div className="stack" style={{ marginTop: 12 }}>
          {curriculumReviews.length ? curriculumReviews.map((item) => (
            <article className="card" key={item.id} style={{ boxShadow: "none" }}>
              <div className="data-row"><div><strong>{item.title}</strong><div className="muted">{item.university.institution} · Owner: {item.owner ?? "Not assigned"}</div></div><span className="pill status-pending">AI checked · Human review required</span></div>
              <pre className="admin-evidence-note">{item.outcomeNote}</pre>
              {curriculumDocuments.filter((document) => document.contextId === item.id).map((document) => (
                <div className="data-row" key={document.id}>
                  <div><strong>{document.originalName}</strong><div className="muted">{document.purpose} · Automated screen: {document.aiStatus}</div></div>
                  <div className="actions"><span className={`pill status-${document.reviewStatus.toLowerCase()}`}>{document.reviewStatus}</span><a className="button secondary" href={`/api/documents/${document.id}`}>Inspect document</a></div>
                </div>
              ))}
              {curriculumDocuments.some((document) => document.contextId === item.id && document.reviewStatus !== "APPROVED") && <div className="notice">Approve each attached document in <Link className="link" href="/admin/evidence">Document review</Link> before verifying completion.</div>}
              <form action={reviewCurriculumCompletion} className="form-grid">
                <input type="hidden" name="actionId" value={item.id}/>
                <label>Human review note<textarea className="input" name="reviewNote" required placeholder="Record what you inspected and why the evidence is sufficient, or explain what must be corrected."/></label>
                <div className="actions" style={{ margin: 0 }}><button className="button primary" name="decision" value="APPROVED">Verify completion</button><button className="button danger" name="decision" value="CHANGES_REQUESTED">Request changes</button></div>
              </form>
            </article>
          )) : <div className="notice">No curriculum initiatives are awaiting human review.</div>}
        </div>
      </section>

      <section className="card" id="user-directory" style={{ marginTop: 18, scrollMarginTop: 80 }}>
        <span className="eyebrow">User directory</span>
        <h2>Phone book</h2>
        <p className="muted">Search by name or email, filter by role, or jump straight to a letter.</p>

        <form className="filter-bar" style={{ marginTop: 14 }}>
          <label>Search<input className="input" type="text" name="q" placeholder="Name or email" defaultValue={q} /></label>
          <label>
            Role
            <select className="input" name="role" defaultValue={role}>
              <option value="">All roles</option>
              <option value="STUDENT">Students</option>
              <option value="EMPLOYER">Employers</option>
              <option value="UNIVERSITY">Universities</option>
              <option value="ADMIN">Admins</option>
            </select>
          </label>
          {letter && <input type="hidden" name="letter" value={letter} />}
          <button className="button secondary" type="submit">Search</button>
          {(q || role || letter) && <a className="link" href="/admin/dashboard#user-directory" style={{ alignSelf: "center" }}>Clear</a>}
        </form>

        <AZStrip
          activeLetter={letter || null}
          availableLetters={availableLetters}
          buildHref={(l) => buildHref({ letter: l })}
        />

        <p className="muted" style={{ fontSize: 13 }}>
          {directory.length} of {users.length} account{users.length === 1 ? "" : "s"}
          {role ? ` · ${ROLE_LABEL[role] ?? role}` : ""}
          {letter ? ` · starting with "${letter}"` : ""}
        </p>

        <div className="stack" style={{ marginTop: 8 }}>
          {directory.length ? directory.map((u) => (
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
          )) : <div className="notice">No accounts match this search.</div>}
        </div>
      </section>
    </main>
  );
}
