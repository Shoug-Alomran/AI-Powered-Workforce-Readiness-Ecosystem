import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/session";
import { updateSupportTicket } from "@/actions/governance";
import { SUPPORT_TRIAGE_MODEL_VERSION } from "@/lib/intelligence/triage";
import { CATEGORY_LABEL, STATUS_LABEL, TICKET_TYPE_LABEL, bandTone, withTriage } from "@/lib/supportQueue";

export default async function SupportTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getCurrentAdmin(); if (!ctx) redirect("/login");
  const { id } = await params;

  const row = await prisma.supportTicket.findUnique({ where: { id }, include: { user: true } });
  if (!row) notFound();
  const ticket = withTriage(row);

  // Everything that has happened to this ticket, plus anything else the same
  // person has raised — a third ticket about the same problem is the strongest
  // signal that the first two were not actually answered.
  const [events, alsoRaised] = await Promise.all([
    prisma.auditEvent.findMany({ where: { entityType: "SUPPORT_TICKET", entityId: ticket.id }, orderBy: { createdAt: "desc" } }),
    prisma.supportTicket.findMany({ where: { email: ticket.email, NOT: { id: ticket.id } }, orderBy: { createdAt: "desc" }, take: 5 }),
  ]);
  const actorIds = [...new Set(events.map((event) => event.actorUserId).filter((value): value is string => Boolean(value)))];
  const actors = actorIds.length ? await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true } }) : [];
  const actorName = new Map(actors.map((actor) => [actor.id, actor.name]));

  return <main className="page-shell">
    <Link className="link" href="/admin/support">← Back to the support queue</Link>
    <span className="eyebrow" style={{ marginTop: 14, display: "block" }}>Support ticket</span>
    <h1 className="page-title" style={{ margin: "6px 0" }}>{ticket.subject}</h1>
    <div className="ticket-card-pills" style={{ marginBottom: 6 }}>
      <span className="pill">{TICKET_TYPE_LABEL[ticket.ticketType]}{ticket.typeIsInferred ? " (inferred)" : ""}</span>
      <span className="pill">{CATEGORY_LABEL[ticket.category] ?? ticket.category}</span>
      {ticket.priority === "URGENT" && <span className="pill status-rejected">Marked urgent</span>}
      <span className={`pill status-${ticket.status === "RESOLVED" ? "approved" : "pending"}`}>{STATUS_LABEL[ticket.status] ?? ticket.status}</span>
    </div>
    <p className="muted">Raised by {ticket.name} · {ticket.email}{ticket.user ? ` · ${ticket.user.role.toLowerCase()} account` : " · no account on file"} · {ticket.createdAt.toLocaleString()}</p>

    <section className="card" style={{ marginTop: 18 }}>
      <span className="eyebrow">What they wrote</span>
      <h2>The full message</h2>
      <p className="ticket-message">{ticket.message}</p>
      {ticket.typeIsInferred && <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>This ticket was filed before people were asked what kind of request they were making. &ldquo;{TICKET_TYPE_LABEL[ticket.ticketType]}&rdquo; is inferred from the wording above, not what the person selected.</p>}
    </section>

    <section className="card" style={{ marginTop: 18 }}>
      <span className="eyebrow">Automated triage · {ticket.triageVersion ?? SUPPORT_TRIAGE_MODEL_VERSION}</span>
      <h2>Why this ticket sits where it does</h2>
      <p className="muted">Severity is how bad this is if it is true. Urgency is how soon it stops mattering whether we answer. Both are produced by a fixed rule set, they order the queue and nothing else, and you can overrule them below.</p>
      <div className="ticket-band-row">
        <span className={`ticket-band ${bandTone(ticket.triage.severity)}`}><small>Severity</small>{ticket.triage.severity}</span>
        <span className={`ticket-band ${bandTone(ticket.triage.urgency)}`}><small>Urgency</small>{ticket.triage.urgency}</span>
        <span className="ticket-band is-low"><small>Queue rank</small>{ticket.triage.score}</span>
      </div>
      <ul className="ticket-reasons">{ticket.triage.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
      {ticket.triageChanged && <div className="notice" style={{ marginTop: 12 }}>This ticket scored {ticket.triageScore} when it arrived and {ticket.triage.score} now. Only the time it has been waiting has changed; the wording is the same.</div>}
    </section>

    <section className="card" style={{ marginTop: 18 }}>
      <span className="eyebrow">Decision</span>
      <h2>Record what was done</h2>
      <p className="muted">The resolution text is sent to the person who raised the ticket, and the change is written to the audit trail under your name. A ticket cannot be closed without one.</p>
      <form action={updateSupportTicket} className="form-grid" style={{ marginTop: 14 }}>
        <input type="hidden" name="ticketId" value={ticket.id} />
        <label>Resolution or next action<textarea className="input" name="resolution" defaultValue={ticket.resolution ?? ""} placeholder="What was checked, what was changed, and what the person was told." /></label>
        <div className="ticket-decision-row">
          <label>Status<select className="input" name="status" defaultValue={ticket.status === "OPEN" ? "IN_PROGRESS" : ticket.status}><option value="OPEN">Open</option><option value="IN_PROGRESS">In progress</option><option value="RESOLVED">Resolved</option></select></label>
          <label>Priority<select className="input" name="priority" defaultValue={ticket.priority}><option value="NORMAL">Normal</option><option value="URGENT">Urgent</option></select></label>
          <button className="button primary">Save ticket</button>
        </div>
      </form>
      {ticket.assignedTo && <p className="muted" style={{ marginTop: 12, fontSize: 12 }}>Last handled by {ticket.assignedTo}{ticket.resolvedAt ? ` · closed ${ticket.resolvedAt.toLocaleString()}` : ""}.</p>}
    </section>

    {alsoRaised.length > 0 && <section className="card" style={{ marginTop: 18 }}>
      <span className="eyebrow">Same person</span>
      <h2>Other tickets from this email</h2>
      <p className="muted">Someone raising the same thing repeatedly usually means the earlier answer did not land.</p>
      <div className="stack" style={{ marginTop: 12 }}>
        {alsoRaised.map((other) => <Link className="data-row" href={`/admin/support/${other.id}`} key={other.id}>
          <div><strong>{other.subject}</strong><div className="muted">{CATEGORY_LABEL[other.category] ?? other.category} · {other.createdAt.toLocaleDateString()}</div></div>
          <span className={`pill status-${other.status === "RESOLVED" ? "approved" : "pending"}`}>{STATUS_LABEL[other.status] ?? other.status}</span>
        </Link>)}
      </div>
    </section>}

    <section className="card" style={{ marginTop: 18 }}>
      <span className="eyebrow">Traceability</span>
      <h2>Everything that has happened to this ticket</h2>
      <div className="stack" style={{ marginTop: 12 }}>
        {events.length ? events.map((event) => <div className="data-row" key={event.id}>
          <div><strong>{event.action.replace(/^SUPPORT_TICKET_/, "").replace(/_/g, " ").toLowerCase()}</strong><div className="muted">{event.explanation ?? "No note recorded"}</div></div>
          <small className="muted">{(event.actorUserId ? actorName.get(event.actorUserId) : null) ?? "Unknown"} · {event.createdAt.toLocaleDateString()}</small>
        </div>) : <p className="muted">Nothing has been recorded against this ticket yet. It was raised before the audit trail covered support, or by someone who was not signed in.</p>}
      </div>
    </section>
  </main>;
}
