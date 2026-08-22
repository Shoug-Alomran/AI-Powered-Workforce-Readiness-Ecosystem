import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/session";
import { resolveDataRequest } from "@/actions/governance";
import EmptyState from "@/components/EmptyState";

// A data-rights request carries a statutory clock. The queue is useless to the
// person answerable for it unless it says which requests are still owed a
// decision and how long each has been waiting, so both are derived here rather
// than left for the reader to work out from a timestamp.
const RESPONSE_WINDOW_DAYS = 30;

const TYPE_LABEL: Record<string, string> = {
  ACCESS: "Explain what data is held",
  DOWNLOAD: "Download their data",
  CORRECTION: "Correct their data",
  DELETION: "Delete their data",
};

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Not started",
  PROCESSING: "In progress",
  COMPLETED: "Completed",
  REJECTED: "Refused",
};

const STATUS_TONE: Record<string, string> = {
  OPEN: "status-pending",
  PROCESSING: "status-pending",
  COMPLETED: "status-approved",
  REJECTED: "status-rejected",
};

const dayOfWindow = (createdAt: Date) => Math.floor((Date.now() - createdAt.getTime()) / 86_400_000);

export default async function DataRequestsAdmin() {
  const ctx = await getCurrentAdmin(); if (!ctx) redirect("/login");
  const requests = await prisma.dataRequest.findMany({ include: { student: { include: { user: true } } }, orderBy: { createdAt: "asc" } });

  // reviewedBy stores a user id. Resolving the names in one query keeps the
  // history readable without an id-to-name lookup on every row.
  const reviewerIds = [...new Set(requests.map((request) => request.reviewedBy).filter((id): id is string => Boolean(id)))];
  const reviewers = reviewerIds.length ? await prisma.user.findMany({ where: { id: { in: reviewerIds } }, select: { id: true, name: true } }) : [];
  const reviewerName = new Map(reviewers.map((reviewer) => [reviewer.id, reviewer.name]));

  const outstanding = requests.filter((request) => ["OPEN", "PROCESSING"].includes(request.status));
  const handled = requests.filter((request) => !["OPEN", "PROCESSING"].includes(request.status)).reverse();
  const overdue = outstanding.filter((request) => dayOfWindow(request.createdAt) >= RESPONSE_WINDOW_DAYS);

  return <main className="page-shell"><span className="eyebrow">Privacy operations</span><h1 className="page-title">Data-rights requests</h1>
    <p className="muted">Access, download, correction and deletion requests submitted by users. Each one needs a written outcome, and the person who records it is named in the audit trail.</p>

    <div className="dsr-summary">
      <div className={`dsr-summary-tile${outstanding.length ? " is-active" : ""}`}><span>Awaiting a decision</span><b>{outstanding.length}</b></div>
      <div className={`dsr-summary-tile${overdue.length ? " is-overdue" : ""}`}><span>Past {RESPONSE_WINDOW_DAYS} days</span><b>{overdue.length}</b></div>
      <div className="dsr-summary-tile"><span>Completed</span><b>{requests.filter((request) => request.status === "COMPLETED").length}</b></div>
      <div className="dsr-summary-tile"><span>Refused</span><b>{requests.filter((request) => request.status === "REJECTED").length}</b></div>
    </div>

    <section className="card" style={{ marginTop: 18 }}>
      <h2>Awaiting a decision</h2>
      <p className="muted">Record what was actually done: where an export was sent, what was corrected, or the lawful reason a deletion is refused. The user receives this text.</p>
      <div className="stack" style={{ marginTop: 14 }}>
        {outstanding.length ? outstanding.map((request) => {
          const age = dayOfWindow(request.createdAt);
          const isOverdue = age >= RESPONSE_WINDOW_DAYS;
          return <article className="dsr-request" key={request.id}>
            <header>
              <div>
                <strong>{TYPE_LABEL[request.type] ?? request.type}</strong>
                <div className="muted">{request.student.user.name} · {request.student.user.email}</div>
              </div>
              <div className="dsr-request-meta">
                <span className={`pill ${STATUS_TONE[request.status] ?? "status-pending"}`}>{STATUS_LABEL[request.status] ?? request.status}</span>
                <small className={isOverdue ? "is-overdue" : undefined}>Day {age} of {RESPONSE_WINDOW_DAYS} · submitted {request.createdAt.toLocaleDateString()}</small>
              </div>
            </header>
            <p className="dsr-request-detail">{request.details?.trim() || "The user gave no further detail."}</p>
            <form action={resolveDataRequest} className="dsr-request-form">
              <input type="hidden" name="requestId" value={request.id} />
              <label>Outcome<textarea className="input" name="resolution" defaultValue={request.resolution ?? ""} placeholder="Action taken, export location, correction made, or the lawful retention reason for a refusal." required /></label>
              <div className="dsr-request-actions">
                <label>Status<select className="input" name="status" defaultValue={request.status === "OPEN" ? "PROCESSING" : request.status}><option value="PROCESSING">In progress</option><option value="COMPLETED">Completed</option><option value="REJECTED">Refused</option></select></label>
                <button className="button primary">Record outcome</button>
              </div>
            </form>
          </article>;
        }) : <EmptyState tone="clear" icon="✓" title="No requests waiting" body="Access, download, correction and deletion requests appear here the moment a user submits one from their Data rights page. Nothing is outstanding." />}
      </div>
    </section>

    <section className="card" style={{ marginTop: 18 }}>
      <h2>Decision history</h2>
      <p className="muted">Every request already answered, with the outcome the user was sent and the administrator who recorded it.</p>
      <div className="stack" style={{ marginTop: 14 }}>
        {handled.length ? handled.map((request) => <article className="dsr-handled" key={request.id}>
          <div className="data-row">
            <div>
              <strong>{TYPE_LABEL[request.type] ?? request.type}</strong>
              <div className="muted">{request.student.user.name} · submitted {request.createdAt.toLocaleDateString()}{request.reviewedAt ? ` · answered ${request.reviewedAt.toLocaleDateString()}` : ""}{request.reviewedBy ? ` by ${reviewerName.get(request.reviewedBy) ?? "a former administrator"}` : ""}</div>
            </div>
            <span className={`pill ${STATUS_TONE[request.status] ?? "status-pending"}`}>{STATUS_LABEL[request.status] ?? request.status}</span>
          </div>
          <p>{request.resolution ?? "No outcome was recorded."}</p>
        </article>) : <EmptyState icon="⎙" title="Nothing answered yet" body="Once a request is given a written outcome it moves here, so the full history of privacy decisions stays on one page." />}
      </div>
    </section>
  </main>;
}
