/**
 * Support ticket triage.
 *
 * Two separate questions, deliberately kept apart because they answer different
 * things and a queue sorted on either one alone is wrong:
 *
 *   - Severity: how bad is this if it is true?
 *   - Urgency:  how soon does it stop mattering whether we answer?
 *
 * A misfiled certificate is severe but not urgent. A student locked out the day
 * an application closes is urgent but not severe. Both belong near the top, for
 * different reasons, and the reader is told which reason applies.
 *
 * The rules are deterministic and the matched phrases are returned, so a person
 * reading the queue can see exactly why a ticket was ranked where it was and
 * disagree with it. Nothing here decides anything: the queue order is advisory
 * and the human-set `priority` field always wins.
 */

export const SUPPORT_TRIAGE_MODEL_VERSION = "support-triage-v1";

export type TriageBand = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export type SupportTriage = {
  severity: TriageBand;
  urgency: TriageBand;
  /** 0-100 rank used only to order the queue. */
  score: number;
  /** Plain sentences naming what was matched, shown to the reviewer. */
  reasons: string[];
  modelVersion: string;
};

/**
 * What each category is worth before the text is read. A complaint about an
 * automated result outranks a general question because getting it wrong has a
 * consequence for someone's record.
 */
const CATEGORY_SEVERITY: Record<string, { score: number; because: string }> = {
  SAFETY: { score: 90, because: "Filed under Safety, which can involve harm to a person" },
  PRIVACY: { score: 85, because: "Filed under Privacy, which can involve someone's personal data" },
  AI_RESULT: { score: 65, because: "Disputes an automated result, which affects the person's record" },
  ACCESSIBILITY: { score: 60, because: "Reports a barrier to using the platform at all" },
  EVIDENCE: { score: 55, because: "Concerns submitted evidence, which feeds verified status" },
  APPLICATION: { score: 50, because: "Concerns a job application already in progress" },
  ACCOUNT: { score: 45, because: "Concerns account access or settings" },
  GENERAL: { score: 30, because: "General enquiry with no category-specific risk" },
};

/** Phrases that raise how bad the problem is, independent of category. */
const SEVERITY_SIGNALS: Array<{ pattern: RegExp; weight: number; because: string }> = [
  { pattern: /discriminat|biased?|unfair(ly)?|prejudic/, weight: 25, because: "Alleges unfair or discriminatory treatment" },
  { pattern: /harass|abus(e|ive)|threat/, weight: 30, because: "Describes harassment, abuse or a threat" },
  { pattern: /breach|leak(ed)?|expos(ed|ure)|someone else'?s? (data|record)/, weight: 30, because: "Describes data being exposed or shown to the wrong person" },
  { pattern: /not my (data|record|certificate)|isn'?t mine|wrong (person|student|account)/, weight: 25, because: "Reports records attached to the wrong person" },
  { pattern: /rejected (me|my|because)|turned down|auto[- ]?reject/, weight: 15, because: "Concerns a rejection the person believes was automated" },
  { pattern: /delete (my|all)|erase my|remove my data/, weight: 15, because: "Raises a deletion request, which carries a legal duty" },
  { pattern: /can'?t (log ?in|access|sign in)|locked out|no access/, weight: 15, because: "Reports being unable to get into the account" },
];

/** Phrases that raise how soon an answer is needed. */
const URGENCY_SIGNALS: Array<{ pattern: RegExp; weight: number; because: string }> = [
  { pattern: /urgent|asap|immediately|right away|emergency/, weight: 30, because: "States the matter is urgent" },
  { pattern: /deadline|clos(es|ing)|expir(es|ing|ed)|last day|cut ?off/, weight: 30, because: "Names a deadline that is approaching or passed" },
  { pattern: /today|tonight|tomorrow|this (morning|afternoon|week)/, weight: 20, because: "Names a time within the next few days" },
  { pattern: /still (waiting|no|not)|no (reply|response|answer)|weeks? ago|months? ago/, weight: 25, because: "Says an earlier contact went unanswered" },
  { pattern: /\bagain\b|second time|third time|multiple times|repeatedly/, weight: 20, because: "Says the person has raised this before" },
  { pattern: /interview|start date|offer|onboarding/, weight: 15, because: "Tied to a hiring step already in motion" },
  // Being locked out is time-critical as well as serious: the person cannot do
  // anything on the platform until it is fixed, including chasing this ticket.
  { pattern: /can'?t (log ?in|access|sign in)|locked out|no access/, weight: 20, because: "The person cannot get into their account right now" },
];

const CATEGORY_URGENCY_FLOOR: Record<string, number> = {
  SAFETY: 70,
  PRIVACY: 50,
  ACCESSIBILITY: 45,
};

function band(score: number): TriageBand {
  if (score >= 80) return "CRITICAL";
  if (score >= 60) return "HIGH";
  if (score >= 40) return "MEDIUM";
  return "LOW";
}

const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

/**
 * Scores one ticket from the text the person wrote.
 *
 * `ageDays` is passed in rather than read from the clock so the function stays
 * pure and testable, and so a stored triage can be re-derived identically. Age
 * only ever escalates an unanswered ticket; it never lowers a score.
 */
export function triageSupportTicket(input: {
  category: string;
  subject: string;
  message: string;
  ageDays?: number;
}): SupportTriage {
  const text = `${input.subject} ${input.message}`.toLowerCase();
  const reasons: string[] = [];

  const categoryRule = CATEGORY_SEVERITY[input.category.toUpperCase()] ?? CATEGORY_SEVERITY.GENERAL;
  let severity = categoryRule.score;
  reasons.push(categoryRule.because);

  for (const signal of SEVERITY_SIGNALS) {
    if (signal.pattern.test(text)) {
      severity += signal.weight;
      reasons.push(signal.because);
    }
  }

  let urgency = CATEGORY_URGENCY_FLOOR[input.category.toUpperCase()] ?? 20;
  for (const signal of URGENCY_SIGNALS) {
    if (signal.pattern.test(text)) {
      urgency += signal.weight;
      reasons.push(signal.because);
    }
  }

  // An unanswered ticket becomes more urgent by sitting there. This is the one
  // input that changes after the ticket is written, so it is applied at read
  // time rather than frozen into the stored score.
  const ageDays = Math.max(0, Math.floor(input.ageDays ?? 0));
  if (ageDays >= 14) {
    urgency += 25;
    reasons.push(`Unanswered for ${ageDays} days`);
  } else if (ageDays >= 7) {
    urgency += 15;
    reasons.push(`Unanswered for ${ageDays} days`);
  } else if (ageDays >= 3) {
    urgency += 8;
    reasons.push(`Unanswered for ${ageDays} days`);
  }

  severity = clampScore(severity);
  urgency = clampScore(urgency);

  return {
    severity: band(severity),
    urgency: band(urgency),
    // Severity is weighted higher: answering a trivial question quickly is
    // worth less than answering a serious one at all.
    score: clampScore(severity * 0.6 + urgency * 0.4),
    reasons,
    modelVersion: SUPPORT_TRIAGE_MODEL_VERSION,
  };
}

/** Order used everywhere the queue is displayed. */
export const BAND_RANK: Record<TriageBand, number> = { CRITICAL: 3, HIGH: 2, MEDIUM: 1, LOW: 0 };

export type TicketType = "QUESTION" | "COMPLAINT" | "REQUEST" | "BUG";

const TYPE_SIGNALS: Array<{ type: TicketType; pattern: RegExp }> = [
  { type: "COMPLAINT", pattern: /complain|unfair|unacceptable|disappoint|wrong|should not have|discriminat|rude|harass|abus(e|ive)|reporting (a|an|it|this|them)|keeps? (messaging|contacting)/ },
  { type: "BUG", pattern: /error|broken|does ?n'?t work|not working|bug|crash|blank|fail(ed|s|ing)?|stuck|can'?t (log ?in|upload|submit)/ },
  { type: "REQUEST", pattern: /please (add|change|remove|delete|update)|can you (add|change|remove)|i want|i need|request(ing)?|delete my|export my/ },
  { type: "QUESTION", pattern: /\?|how do i|how can i|what is|when will|where do i|why (is|does|am)/ },
];

/**
 * Best guess at what a ticket is asking for, used only when the person was
 * never given the field to answer. Always presented as inferred: a guess about
 * someone's intent is not the same as their own words, and mislabelling a
 * complaint as a question is exactly the failure this queue exists to avoid.
 */
export function inferTicketType(subject: string, message: string): TicketType {
  const text = `${subject} ${message}`.toLowerCase();
  for (const signal of TYPE_SIGNALS) {
    if (signal.pattern.test(text)) return signal.type;
  }
  return "QUESTION";
}
