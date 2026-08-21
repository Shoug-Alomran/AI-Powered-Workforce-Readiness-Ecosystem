import "server-only";

import type { AssistantContext, AssistantRole } from "./context";

/**
 * The assistant runs entirely on Cloudflare Workers AI, reached through the
 * Fursah assistant Worker. There is no paid AI API in this path and no
 * provider SDK: the app posts a prepared prompt to the Worker, the Worker
 * calls Workers AI, and the answer comes back.
 *
 * All grounding and privacy scoping live here and in ./context, next to the
 * deterministic intelligence layer that produces the facts. The Worker holds
 * no Fursah domain logic.
 */
export const ASSISTANT_VERSION = "fursah-assistant-v2-workers-ai";

/**
 * Free-plan default, mirrored from the Worker so the app can report which
 * model answered even when the Worker does not echo one back.
 */
export const DEFAULT_ASSISTANT_MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";

/** Short answers keep neuron spend low; this is a chat panel, not a report. */
const MAX_OUTPUT_TOKENS = 300;

/**
 * Character budget for the serialized facts. Roughly 6k tokens, which at the
 * default model's rate costs about 25 neurons of input per question. The
 * Worker enforces its own hard ceiling on top of this.
 */
const MAX_FACTS_CHARS = 12000;

/** How many prior turns of this page's conversation are replayed. */
export const MAX_HISTORY_TURNS = 6;

export type AssistantTurn = {
  role: "user" | "assistant";
  content: string;
};

/**
 * The assistant reuses the existing Fursah Worker credential by default, so the
 * only new setting is the URL of the Worker's /assistant route.
 * ASSISTANT_AI_SECRET is honoured first for anyone who wants a separate one.
 */
function assistantSecret() {
  return process.env.ASSISTANT_AI_SECRET || process.env.EVIDENCE_AI_SECRET || "";
}

export function assistantConfigured() {
  return Boolean(process.env.ASSISTANT_AI_URL && assistantSecret());
}

export const ROLE_BRIEF: Record<AssistantRole, string> = {
  STUDENT: `You are speaking to a student about their own Fursah profile. Help them understand their readiness score, what to work on next, why a career direction was suggested, and which roles they are closest to qualifying for. Fursah never changes a student's target career; if you mention a suggested direction, present it as an option they may decline.`,

  EMPLOYER: `You are speaking to an employer about their own job postings and the candidates who applied to them. Help them understand why a role is hard to fill, which requirement is shrinking their pool, what applicants commonly cannot evidence, and why an applicant matches a role. You must never recommend hiring, rejecting, or ranking a person as a decision - you provide decision support only, and the employer decides. Never mention or infer any characteristic unrelated to the job's stated requirements.`,

  UNIVERSITY: `You are speaking to a university about curriculum and workforce alignment. Help them decide which skill gap to prioritise, why a recommendation was produced, which offerings cover employer demand, and what action would address the largest gap. All student information you have is aggregate and privacy-suppressed. Never name, describe, or infer an individual student; if asked about one, say individual records stay inside the student's own account.`,
};

/**
 * Grounding contract.
 *
 * Written as short, numbered, imperative rules. Smaller open models follow
 * concrete prohibitions far more reliably than discursive guidance, and every
 * rule here is a hard requirement of the platform rather than a style note.
 */
// Exported so scripts/verify-assistant.ts can assert the grounding contract
// itself, rather than only asserting the data handed to it. The prohibitions
// in this prompt are the platform's behavioural guarantees, so a silent edit
// to one of them should fail a check.
export function systemPrompt(context: AssistantContext) {
  return `You are the Fursah assistant. Fursah is a workforce-readiness platform connecting students, universities, and employers using evidence-based career data.

${ROLE_BRIEF[context.role]}

RULES - follow every one:
1. A JSON object called FURSAH_DATA is given with the question. It is your ONLY source of facts.
2. Every number you state - scores, percentages, counts, months, role counts - must be copied from FURSAH_DATA. Never calculate, estimate, or guess a number.
3. Never invent skills, certifications, courses, jobs, employers, experience, projects, or people. If it is not in FURSAH_DATA, it does not exist.
4. Never describe a trend, growth, decline, forecast, or projection. Fursah stores no historical data, so change over time cannot be shown. Say that if asked.
5. If FURSAH_DATA does not contain the answer, say so plainly and say what is missing. Never fill the gap with a plausible number.
6. Only human-verified evidence counts as verified. Where FURSAH_DATA says pending or unverified, describe it that way.
7. Your answer is advisory. It supports a decision; it does not make one.

STYLE:
- Answer in at most 120 words. Lead with the answer.
- Quote the exact figures from FURSAH_DATA that support what you say.
- Plain text only. No markdown, no headings, no tables.

Calculation models behind this data: ${context.modelVersions.join(", ")}.`;
}

/**
 * Trims the grounding pack to the character budget.
 *
 * Array fields are shortened from the tail, longest first, because the
 * intelligence layer already returns them ranked - so the highest-priority
 * gap, match, or recommendation survives and only the long tail is dropped.
 * A truncation marker is left in place so the model can see, and say, that
 * the list was shortened rather than treating it as complete.
 */
export function capFacts(facts: Record<string, unknown>, budget = MAX_FACTS_CHARS) {
  const working: Record<string, unknown> = structuredClone(facts);

  const serialized = () => JSON.stringify(working);

  if (serialized().length <= budget) {
    return { facts: working, truncated: false };
  }

  // Longest array fields first.
  const arrayKeys = Object.entries(working)
    .filter((entry): entry is [string, unknown[]] => Array.isArray(entry[1]))
    .sort((a, b) => JSON.stringify(b[1]).length - JSON.stringify(a[1]).length)
    .map(([key]) => key);

  let truncated = false;

  for (const key of arrayKeys) {
    while (serialized().length > budget) {
      const value = working[key];
      if (!Array.isArray(value) || value.length <= 2) break;
      working[key] = value.slice(0, Math.max(2, Math.floor(value.length * 0.6)));
      truncated = true;
    }
    if (serialized().length <= budget) break;
  }

  if (truncated) {
    working._note = "Some lists were shortened to the highest-priority entries. Say so if the user asks for a complete list.";
  }

  return { facts: working, truncated };
}

export type AssistantAnswer = {
  answer: string;
  model: string;
  assistantVersion: string;
};

export class AssistantQuotaError extends Error {
  constructor() {
    super("Workers AI free allocation exhausted");
    this.name = "AssistantQuotaError";
  }
}

export class AssistantUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssistantUnavailableError";
  }
}

export async function askAssistant(input: {
  context: AssistantContext;
  question: string;
  history: AssistantTurn[];
}): Promise<AssistantAnswer> {
  const url = process.env.ASSISTANT_AI_URL;
  const secret = assistantSecret();

  if (!url || !secret) {
    throw new AssistantUnavailableError("Assistant Worker is not configured");
  }

  const { facts } = capFacts(input.context.facts);
  const history = input.history.slice(-MAX_HISTORY_TURNS);

  const messages = [
    ...history.map((turn) => ({ role: turn.role, content: turn.content })),
    {
      role: "user" as const,
      content: `FURSAH_DATA:\n${JSON.stringify(facts)}\n\nQuestion: ${input.question}`,
    },
  ];

  let response: Response;

  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // The secret stays on the server. It is never sent to the browser and
        // never appears in any response body.
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({
        system: systemPrompt(input.context),
        messages,
        maxTokens: MAX_OUTPUT_TOKENS,
      }),
      cache: "no-store",
    });
  } catch (error) {
    console.error("Assistant Worker unreachable", error);
    throw new AssistantUnavailableError("Assistant Worker unreachable");
  }

  const payload = (await response.json().catch(() => null)) as
    | { answer?: string; model?: string; error?: string; code?: string }
    | null;

  if (response.status === 429 || payload?.code === "QUOTA_EXHAUSTED") {
    throw new AssistantQuotaError();
  }

  if (!response.ok || !payload?.answer) {
    console.error("Assistant Worker error", response.status, payload?.error ?? "no body");
    throw new AssistantUnavailableError(payload?.error ?? `Worker responded ${response.status}`);
  }

  return {
    answer: payload.answer,
    model: payload.model ?? DEFAULT_ASSISTANT_MODEL,
    assistantVersion: ASSISTANT_VERSION,
  };
}
