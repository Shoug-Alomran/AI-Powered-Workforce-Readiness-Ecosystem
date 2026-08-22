import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/session";
import EmptyState from "@/components/EmptyState";
import { SUPPORT_TRIAGE_MODEL_VERSION } from "@/lib/intelligence/triage";
import { CATEGORY_LABEL, STATUS_LABEL, TICKET_TYPE_LABEL, bandTone, compareTickets, withTriage } from "@/lib/supportQueue";

const TYPE_ORDER = ["COMPLAINT", "BUG", "REQUEST", "QUESTION"];

export default async function SupportAdminPage({ searchParams }: { searchParams: Promise<{ type?: string; category?: string; state?: string }> }) {
  const ctx = await getCurrentAdmin(); if (!ctx) redirect("/login");
  const { type = "", category = "", state = "open" } = await searchParams;

  const tickets = (await prisma.supportTicket.findMany({ orderBy: { createdAt: "desc" } })).map((ticket) => withTriage(ticket));
  const openTickets = tickets.filter((ticket) => ticket.status !== "RESOLVED");

  const visible = tickets
    .filter((ticket) => state === "all" || (state === "resolved" ? ticket.status === "RESOLVED" : ticket.status !== "RESOLVED"))
    .filter((ticket) => !type || ticket.ticketType === type)
    .filter((ticket) => !category || ticket.category === category)
    .sort(compareTickets);

  const countBy = (predicate: (t: (typeof tickets)[number]) => boolean) => tickets.filter((t) => t.status !== "RESOLVED" && predicate(t)).length;
  const categoriesPresent = [...new Set(tickets.map((ticket) => ticket.category))].sort((a, b) => (CATEGORY_LABEL[a] ?? a).localeCompare(CATEGORY_LABEL[b] ?? b));

  const href = (next: { type?: string; category?: string; state?: string }) => {
    const params = new URLSearchParams();
    const nextType = next.type ?? type, nextCategory = next.category ?? category, nextState = next.state ?? state;
    if (nextType) params.set("type", nextType);
    if (nextCategory) params.set("category", nextCategory);
    if (nextState && nextState !== "open") params.set("state", nextState);
    const qs = params.toString();
    return `/admin/support${qs ? `?${qs}` : ""}`;
  };

  return <main className="page-shell"><span className="eyebrow">Customer operations</span><h1 className="page-title">Support queue</h1>
    <p className="muted">Every enquiry and complaint raised from any portal. Ordered by an automated read of how serious and how time-critical each one is. It is advisory only, and every ticket says why it was ranked where it is.</p>

    <div className="dsr-summary">
      <div className={`dsr-summary-tile${openTickets.length ? " is-active" : ""}`}><span>Open</span><b>{openTickets.length}</b></div>
      <div className={`dsr-summary-tile${countBy((t) => t.triage.severity === "CRITICAL") ? " is-overdue" : ""}`}><span>Critical severity</span><b>{countBy((t) => t.triage.severity === "CRITICAL")}</b></div>
      <div className="dsr-summary-tile"><span>Complaints open</span><b>{countBy((t) => t.ticketType === "COMPLAINT")}</b></div>
      <div className="dsr-summary-tile"><span>Resolved</span><b>{tickets.filter((t) => t.status === "RESOLVED").length}</b></div>
    </div>

    <div className="ticket-filters">
      <div className="ticket-filter-group" role="group" aria-label="Filter by what the person wants">
        <span>Type</span>
        <Link className={!type ? "is-active" : ""} href={href({ type: "" })}>All</Link>
        {TYPE_ORDER.map((value) => <Link key={value} className={type === value ? "is-active" : ""} href={href({ type: value })}>{TICKET_TYPE_LABEL[value]} <b>{countBy((t) => t.ticketType === value)}</b></Link>)}
      </div>
      <div className="ticket-filter-group" role="group" aria-label="Filter by topic">
        <span>Topic</span>
        <Link className={!category ? "is-active" : ""} href={href({ category: "" })}>All</Link>
        {categoriesPresent.map((value) => <Link key={value} className={category === value ? "is-active" : ""} href={href({ category: value })}>{CATEGORY_LABEL[value] ?? value} <b>{countBy((t) => t.category === value)}</b></Link>)}
      </div>
      <div className="ticket-filter-group" role="group" aria-label="Filter by state">
        <span>State</span>
        <Link className={state === "open" ? "is-active" : ""} href={href({ state: "open" })}>Unresolved</Link>
        <Link className={state === "resolved" ? "is-active" : ""} href={href({ state: "resolved" })}>Resolved</Link>
        <Link className={state === "all" ? "is-active" : ""} href={href({ state: "all" })}>All</Link>
      </div>
    </div>

    <section className="card" style={{ marginTop: 18 }}>
      <div className="data-row" style={{ paddingTop: 0 }}>
        <h2 style={{ margin: 0 }}>{visible.length} ticket{visible.length === 1 ? "" : "s"}</h2>
        <small className="muted">Ranked by {SUPPORT_TRIAGE_MODEL_VERSION}</small>
      </div>
      <div className="stack" style={{ marginTop: 14 }}>
        {visible.length ? visible.map((ticket) => <Link className="ticket-card" href={`/admin/support/${ticket.id}`} key={ticket.id}>
          <div className="ticket-card-bands">
            <span className={`ticket-band ${bandTone(ticket.triage.severity)}`}><small>Severity</small>{ticket.triage.severity}</span>
            <span className={`ticket-band ${bandTone(ticket.triage.urgency)}`}><small>Urgency</small>{ticket.triage.urgency}</span>
          </div>
          <div className="ticket-card-body">
            <div className="ticket-card-pills">
              <span className="pill">{TICKET_TYPE_LABEL[ticket.ticketType]}{ticket.typeIsInferred ? " (inferred)" : ""}</span>
              <span className="pill">{CATEGORY_LABEL[ticket.category] ?? ticket.category}</span>
              {ticket.priority === "URGENT" && <span className="pill status-rejected">Marked urgent</span>}
              <span className={`pill status-${ticket.status === "RESOLVED" ? "approved" : "pending"}`}>{STATUS_LABEL[ticket.status] ?? ticket.status}</span>
            </div>
            <strong>{ticket.subject}</strong>
            <p>{ticket.message}</p>
            <small className="muted">{ticket.name} · {ticket.email} · {ticket.status === "RESOLVED" && ticket.resolvedAt ? `closed ${ticket.resolvedAt.toLocaleDateString()}` : ticket.ageDays === 0 ? "raised today" : `open ${ticket.ageDays} day${ticket.ageDays === 1 ? "" : "s"}`}</small>
          </div>
          <span className="ticket-card-open" aria-hidden="true">→</span>
        </Link>) : <EmptyState tone="clear" icon="✓" title="Nothing matches this filter" body="Tickets raised from any portal arrive here and are ranked automatically. Widen the filters above to see resolved tickets and other categories." />}
      </div>
    </section>
  </main>;
}
