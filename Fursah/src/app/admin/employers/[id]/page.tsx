import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/session";
import { reviewEmployer } from "@/actions/admin";
import EmptyState from "@/components/EmptyState";

// Free-mail domains tell the reviewer nothing about a company, so an address at
// one of them is worth flagging. This is a prompt to look closer, never a
// verdict — the page labels it as such.
const GENERIC_EMAIL_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "outlook.com", "hotmail.com", "live.com",
  "yahoo.com", "icloud.com", "me.com", "proton.me", "protonmail.com", "aol.com",
]);

const STATUS_TONE: Record<string, string> = { APPROVED: "status-approved", REJECTED: "status-rejected", PENDING: "status-pending" };
const STATUS_LABEL: Record<string, string> = { APPROVED: "Approved", REJECTED: "Rejected", PENDING: "Pending" };

/** Whole days since a timestamp, read once per server render of this route. */
function daysSince(moment: Date) {
  return Math.floor((Date.now() - moment.getTime()) / 86_400_000);
}

const formatBytes = (bytes: number) => bytes >= 1_048_576 ? `${(bytes / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/** Loose containment check between the email domain and the company name. */
function domainMatchesCompany(domain: string, company: string) {
  const domainWord = domain.split(".")[0].replace(/[^a-z0-9]/g, "");
  const companyWord = company.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!domainWord || !companyWord) return false;
  return companyWord.includes(domainWord) || domainWord.includes(companyWord);
}

export default async function EmployerReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getCurrentAdmin(); if (!ctx) redirect("/login");
  const { id } = await params;

  const employer = await prisma.employer.findUnique({
    where: { id },
    include: {
      user: true,
      jobs: { orderBy: { createdAt: "desc" }, include: { _count: { select: { applications: true } } } },
    },
  });
  if (!employer) notFound();

  const [documents, auditEvents] = await Promise.all([
    prisma.evidenceDocument.findMany({ where: { ownerUserId: employer.userId }, orderBy: { createdAt: "desc" } }).catch(() => []),
    prisma.auditEvent.findMany({ where: { entityType: "EMPLOYER", entityId: employer.id }, orderBy: { createdAt: "desc" } }),
  ]);

  const actorIds = [...new Set([...auditEvents.map((event) => event.actorUserId), employer.reviewedBy as string | null].filter((value): value is string => Boolean(value)))];
  const actors = actorIds.length ? await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true } }) : [];
  const actorName = new Map(actors.map((actor) => [actor.id, actor.name]));

  const domain = employer.user.email.split("@")[1]?.toLowerCase() ?? "";
  const isGenericDomain = GENERIC_EMAIL_DOMAINS.has(domain);
  const accountAgeDays = daysSince(employer.createdAt);

  // Every check below is derived from data the platform already holds. None of
  // them verifies a company exists; they only tell the reviewer where to look.
  const checks: Array<{ label: string; value: string; tone: "ok" | "watch" | "neutral" }> = [
    isGenericDomain
      ? { label: "Email domain", value: `${domain} is a personal email provider, not a company domain`, tone: "watch" }
      : domainMatchesCompany(domain, employer.company)
        ? { label: "Email domain", value: `${domain} matches the company name given`, tone: "ok" }
        : { label: "Email domain", value: `${domain} does not obviously match "${employer.company}"`, tone: "watch" },
    { label: "Industry given", value: employer.industry?.trim() || "Left blank at sign-up", tone: employer.industry?.trim() ? "neutral" : "watch" },
    { label: "Account age", value: accountAgeDays === 0 ? "Created today" : `${accountAgeDays} day${accountAgeDays === 1 ? "" : "s"} old`, tone: "neutral" },
    { label: "Roles drafted", value: employer.jobs.length ? `${employer.jobs.length} role${employer.jobs.length === 1 ? "" : "s"} created before approval` : "None yet", tone: "neutral" },
    { label: "Documents uploaded", value: documents.length ? `${documents.length} file${documents.length === 1 ? "" : "s"} available below` : "None uploaded", tone: documents.length ? "ok" : "neutral" },
    { label: "Account status", value: employer.user.active ? "Active" : "Deactivated by an administrator", tone: employer.user.active ? "neutral" : "watch" },
  ];

  return <main className="page-shell">
    <Link className="link" href="/admin/dashboard#employer-verification">← Back to employer verification</Link>
    <span className="eyebrow" style={{ marginTop: 14, display: "block" }}>Employer verification</span>
    <div className="data-row" style={{ paddingTop: 4 }}>
      <div>
        <h1 className="page-title" style={{ margin: "6px 0" }}>{employer.company}</h1>
        <p className="muted" style={{ margin: 0 }}>{employer.user.name} · {employer.user.email}{employer.industry ? ` · ${employer.industry}` : ""} · signed up {employer.createdAt.toLocaleDateString()}</p>
      </div>
      <span className={`pill ${STATUS_TONE[employer.verificationStatus] ?? "status-pending"}`}>{STATUS_LABEL[employer.verificationStatus] ?? employer.verificationStatus}</span>
    </div>

    <section className="card" style={{ marginTop: 20 }}>
      <span className="eyebrow">What the platform knows</span>
      <h2>Automated checks</h2>
      <p className="muted">Signals derived from the account record. None of them confirms the company exists. They only show where a human should look before approving.</p>
      <div className="employer-check-grid">
        {checks.map((check) => <div className={`employer-check is-${check.tone}`} key={check.label}>
          <span>{check.label}</span>
          <strong>{check.value}</strong>
        </div>)}
      </div>
    </section>

    <section className="card" style={{ marginTop: 18 }}>
      <span className="eyebrow">Evidence</span>
      <h2>Documents uploaded by this account</h2>
      <p className="muted">Files this employer has attached anywhere on the platform. Opening one downloads it over the authenticated route; the download is recorded against your session.</p>
      <div className="stack" style={{ marginTop: 12 }}>
        {documents.length ? documents.map((document) => <div className="data-row" key={document.id}>
          <div>
            <strong>{document.originalName}</strong>
            <div className="muted">{document.purpose} · {document.contextType.toLowerCase().replace(/_/g, " ")} · {formatBytes(document.sizeBytes)} · uploaded {document.createdAt.toLocaleDateString()}</div>
          </div>
          <a className="button secondary" href={`/api/documents/${document.id}`}>Open file</a>
        </div>) : <EmptyState icon="⎙" title="No documents on file" body="This employer has not uploaded anything yet. Registration does not require a document, so an empty list is normal. Judge the account on the checks above and the roles it has drafted." />}
      </div>
    </section>

    <section className="card" style={{ marginTop: 18 }}>
      <span className="eyebrow">Intent</span>
      <h2>Roles this employer has created</h2>
      <p className="muted">Drafted before approval and invisible to students until the account is verified. What a company wants to hire for is often the clearest signal that it is genuine.</p>
      <div className="stack" style={{ marginTop: 12 }}>
        {employer.jobs.length ? employer.jobs.map((job) => <div className="data-row" key={job.id}>
          <div>
            <strong>{job.title}</strong>
            <div className="muted">{job.careerTrack} · {job.minExperience} months minimum experience · created {job.createdAt.toLocaleDateString()}{job._count.applications ? ` · ${job._count.applications} application${job._count.applications === 1 ? "" : "s"}` : ""}</div>
            {job.description ? <p className="muted" style={{ margin: "6px 0 0", maxWidth: "70ch" }}>{job.description}</p> : null}
          </div>
          <span className="pill">{job.status === "open" ? "Open" : "Closed"}</span>
        </div>) : <EmptyState icon="◍" title="No roles drafted" body="This account has not created a job yet. That is not a reason to reject it, but there is nothing here to corroborate what the company says it does." />}
      </div>
    </section>

    <section className="card" style={{ marginTop: 18 }}>
      <span className="eyebrow">Decision</span>
      <h2>Record your review</h2>
      <p className="muted">Approving unlocks role posting and candidate profiles for this account. The note is sent to the employer and written to the audit trail under your name.</p>
      {employer.verificationStatus !== "PENDING" ? <div className="notice" style={{ marginTop: 12 }}>
        Already {STATUS_LABEL[employer.verificationStatus]?.toLowerCase() ?? employer.verificationStatus.toLowerCase()}
        {employer.reviewedAt ? ` on ${employer.reviewedAt.toLocaleDateString()}` : ""}
        {employer.reviewedBy ? ` by ${actorName.get(employer.reviewedBy) ?? "a former administrator"}` : ""}
        {employer.reviewNote ? `: “${employer.reviewNote}”` : "."} Submitting again replaces that decision.
      </div> : null}
      <form action={reviewEmployer} className="form-grid" style={{ marginTop: 14 }}>
        <input type="hidden" name="employerId" value={employer.id} />
        <label>Review note<textarea className="input" name="reviewNote" defaultValue={employer.reviewNote ?? ""} placeholder="Required when rejecting; optional when approving." /></label>
        <div className="actions" style={{ margin: 0 }}>
          <button className="button primary" name="decision" value="APPROVED">Approve employer</button>
          <button className="button danger" name="decision" value="REJECTED">Reject employer</button>
        </div>
      </form>
    </section>

    <section className="card" style={{ marginTop: 18 }}>
      <span className="eyebrow">Traceability</span>
      <h2>Review history</h2>
      <div className="stack" style={{ marginTop: 12 }}>
        {auditEvents.length ? auditEvents.map((event) => <div className="data-row" key={event.id}>
          <div>
            <strong>{event.action.replace(/_/g, " ").toLowerCase()}</strong>
            <div className="muted">{event.explanation ?? "No note recorded"}</div>
          </div>
          <small className="muted">{(event.actorUserId ? actorName.get(event.actorUserId) : null) ?? "Unknown administrator"} · {event.createdAt.toLocaleDateString()}</small>
        </div>) : <p className="muted">No decision has been recorded against this account yet.</p>}
      </div>
    </section>
  </main>;
}
