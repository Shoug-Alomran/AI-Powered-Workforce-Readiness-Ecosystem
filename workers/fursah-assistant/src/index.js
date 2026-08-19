/**
 * Fursah Assistant — Workers AI handler
 * =====================================
 *
 *   Fursah (Next.js, authenticated)
 *     -> role-aware structured context assembled server-side
 *     -> THIS HANDLER
 *     -> Workers AI
 *     -> grounded answer
 *
 * DESIGNED TO DROP INTO THE EXISTING fursah-evidence-ai WORKER.
 * It reuses the two bindings that Worker already has — `env.AI` and
 * `env.FURSAH_WORKER_SECRET` — so no new binding, secret, or deployment is
 * required. See README.md for the two-line edit.
 *
 * The evidence-analysis contract is deliberately left alone. Evidence analysis
 * is fileKey + contextType -> structured extraction from R2; this is prepared
 * messages -> prose. Path routing keeps them separate rather than overloading
 * a contract that is already deployed and working.
 *
 * No Fursah domain logic lives here. Grounding, privacy scoping, and prompt
 * construction all happen in the Fursah app next to the deterministic
 * intelligence layer that produces the facts. This handler only authenticates,
 * enforces hard limits, invokes the model, and maps quota errors.
 */

/**
 * Free-plan model. This is the same text model the evidence-analysis handler
 * already uses successfully on this account, so it is known-good here.
 *
 * The only models that require Workers Paid are @cf/moonshotai/kimi-k2.6,
 * @cf/moonshotai/kimi-k2.7-code, @cf/zai-org/glm-5.2,
 * @cf/deepseek-ai/deepseek-v4-flash-0731 and @cf/deepseek-ai/deepseek-v4-pro-0813.
 * None of them is used.
 *
 * Free allocation is 10,000 neurons/day. With the caps below one answer costs
 * roughly 35 neurons, so the free tier supports on the order of 280 answers
 * per day at no cost.
 */
const DEFAULT_MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";

/** Hard ceilings. A caller may ask for less, never for more. */
const MAX_OUTPUT_TOKENS = 400;
const MAX_PROMPT_CHARS = 24000;

function json(body, status = 200) {
  return Response.json(body, { status });
}

/**
 * Length-checked, constant-time-ish comparison so the shared secret cannot be
 * recovered by timing the response.
 */
function secretMatches(provided, expected) {
  if (typeof provided !== "string" || typeof expected !== "string") return false;
  if (provided.length !== expected.length) return false;

  let mismatch = 0;
  for (let index = 0; index < provided.length; index += 1) {
    mismatch |= provided.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return mismatch === 0;
}

export async function handleAssistant(request, env) {
  // Reuses the existing Worker secret. ASSISTANT_AI_SECRET is honoured first
  // for anyone who prefers a separate credential for this route.
  const secret = env.ASSISTANT_AI_SECRET || env.FURSAH_WORKER_SECRET;

  if (!secret) {
    return json({ error: "Assistant secret is not configured on the Worker" }, 500);
  }

  const authorization = request.headers.get("Authorization") || "";
  const presented = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";

  if (!secretMatches(presented, secret)) {
    return json({ error: "Unauthorized" }, 401);
  }

  if (request.method !== "POST") {
    return json({ error: "Use POST" }, 405);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const { system, messages, maxTokens } = payload || {};

  if (typeof system !== "string" || !system.trim()) {
    return json({ error: "A system prompt is required" }, 400);
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return json({ error: "At least one message is required" }, 400);
  }

  const normalized = [];
  for (const message of messages) {
    if (!message || typeof message.content !== "string") {
      return json({ error: "Every message needs string content" }, 400);
    }
    if (message.role !== "user" && message.role !== "assistant") {
      return json({ error: "Message roles must be user or assistant" }, 400);
    }
    normalized.push({ role: message.role, content: message.content });
  }

  // Size cap. Protects the free allocation from an oversized context and keeps
  // the request inside the model's window.
  const totalChars = system.length + normalized.reduce((sum, message) => sum + message.content.length, 0);

  if (totalChars > MAX_PROMPT_CHARS) {
    return json(
      { error: "Context too large", code: "CONTEXT_TOO_LARGE", limit: MAX_PROMPT_CHARS, received: totalChars },
      413,
    );
  }

  const model = env.ASSISTANT_AI_MODEL || DEFAULT_MODEL;

  const requestedTokens = Number.isFinite(maxTokens) ? Math.floor(maxTokens) : MAX_OUTPUT_TOKENS;
  const cappedTokens = Math.max(64, Math.min(MAX_OUTPUT_TOKENS, requestedTokens));

  try {
    const result = await env.AI.run(model, {
      messages: [{ role: "system", content: system }, ...normalized],
      max_tokens: cappedTokens,
      // Low temperature: grounded question answering over supplied facts, not
      // creative writing. Less room to drift away from the context.
      temperature: 0.2,
    });

    const raw = result?.response ?? result?.result ?? result;
    const answer = typeof raw === "string" ? raw.trim() : "";

    if (!answer) {
      return json({ error: "The model returned an empty response", code: "EMPTY_RESPONSE" }, 502);
    }

    return json({ answer, model });
  } catch (error) {
    const message = String((error && error.message) || error || "");

    // Cloudflare signals an exhausted free allocation through these shapes.
    // Surfaced as a distinct code so Fursah can show a friendly message rather
    // than a generic failure.
    const quotaExhausted =
      /quota|neuron|limit exceeded|out of credit|capacity|3040/i.test(message) || (error && error.status === 429);

    if (quotaExhausted) {
      return json({ error: "The daily Workers AI free allocation has been used up.", code: "QUOTA_EXHAUSTED" }, 429);
    }

    console.error("Fursah assistant inference failed", message);
    return json({ error: "The model could not be reached", code: "INFERENCE_FAILED" }, 502);
  }
}

/**
 * Standalone entry point.
 *
 * Only used if this is deployed as its own Worker. When merged into
 * fursah-evidence-ai, that Worker's own `fetch` routes to `handleAssistant`
 * instead and this export is unused.
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/assistant" || url.pathname === "/assistant/") {
      return handleAssistant(request, env);
    }

    if (url.pathname === "/health") {
      return json({ ok: true, service: "fursah-assistant" });
    }

    return json({ error: "Not found" }, 404);
  },
};
