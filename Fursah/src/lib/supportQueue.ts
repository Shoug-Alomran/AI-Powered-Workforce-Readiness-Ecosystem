import "server-only";

import { parseIssues } from "@/lib/governanceIssues";
import { BAND_RANK, inferTicketType, triageSupportTicket, type SupportTriage, type TicketType } from "@/lib/intelligence/triage";

export const TICKET_TYPE_LABEL: Record<string, string> = {
  QUESTION: "Question",
  COMPLAINT: "Complaint",
  REQUEST: "Request",
  BUG: "Problem report",
};

export const CATEGORY_LABEL: Record<string, string> = {
  SAFETY: "Safety",
  PRIVACY: "Privacy",
  AI_RESULT: "Automated result",
  ACCESSIBILITY: "Accessibility",
  EVIDENCE: "Evidence",
  APPLICATION: "Applications",
  ACCOUNT: "Account",
  GENERAL: "General",
};

export const STATUS_LABEL: Record<string, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
};

export type TicketRow = {
  id: string;
  name: string;
  email: string;
  category: string;
  type: string | null;
  subject: string;
  message: string;
  priority: string;
  status: string;
  resolution: string | null;
  assignedTo: string | null;
  severity: string | null;
  urgency: string | null;
  triageScore: number | null;
  triageReason: string | null;
  triageVersion: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
};

export type TriagedTicket<T extends TicketRow> = T & {
  ageDays: number;
  ticketType: TicketType;
  typeIsInferred: boolean;
  triage: SupportTriage;
  /** True when age or a re-run has moved the ticket since it was filed. */
  triageChanged: boolean;
};

const dayMs = 86_400_000;

/**
 * Re-runs triage over a stored ticket.
 *
 * The stored score is what the ticket looked like at intake. Urgency grows
 * while a ticket sits unanswered, so the queue re-derives it against the
 * ticket's current age rather than showing a number that stopped being true
 * the day after it was written. A resolved ticket stops ageing: its clock
 * ends when it was closed.
 */
export function withTriage<T extends TicketRow>(ticket: T, now = Date.now()): TriagedTicket<T> {
  const until = ticket.status === "RESOLVED" && ticket.resolvedAt ? ticket.resolvedAt.getTime() : now;
  const ageDays = Math.max(0, Math.floor((until - ticket.createdAt.getTime()) / dayMs));
  const triage = triageSupportTicket({
    category: ticket.category,
    subject: ticket.subject,
    message: ticket.message,
    ageDays: ticket.status === "RESOLVED" ? 0 : ageDays,
  });
  const stored = ticket.triageReason ? parseIssues(ticket.triageReason) : [];
  return {
    ...ticket,
    ageDays,
    ticketType: (ticket.type as TicketType | null) ?? inferTicketType(ticket.subject, ticket.message),
    typeIsInferred: !ticket.type,
    triage,
    triageChanged: stored.length > 0 && ticket.triageScore !== null && ticket.triageScore !== triage.score,
  };
}

/**
 * Queue order: unresolved before resolved, then a human URGENT flag, then the
 * triage score. The human flag outranks the model on purpose — someone who
 * marked a ticket urgent should not be overruled by a rule set.
 */
export function compareTickets(a: TriagedTicket<TicketRow>, b: TriagedTicket<TicketRow>) {
  const resolvedRank = (t: TriagedTicket<TicketRow>) => (t.status === "RESOLVED" ? 1 : 0);
  if (resolvedRank(a) !== resolvedRank(b)) return resolvedRank(a) - resolvedRank(b);
  const urgentRank = (t: TriagedTicket<TicketRow>) => (t.priority === "URGENT" ? 1 : 0);
  if (urgentRank(a) !== urgentRank(b)) return urgentRank(b) - urgentRank(a);
  if (a.triage.score !== b.triage.score) return b.triage.score - a.triage.score;
  if (BAND_RANK[a.triage.severity] !== BAND_RANK[b.triage.severity]) return BAND_RANK[b.triage.severity] - BAND_RANK[a.triage.severity];
  return b.createdAt.getTime() - a.createdAt.getTime();
}

export const bandTone = (value: string | null | undefined) =>
  value === "CRITICAL" ? "is-critical" : value === "HIGH" ? "is-high" : value === "MEDIUM" ? "is-medium" : "is-low";
