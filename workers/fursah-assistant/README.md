# Fursah Assistant — Workers AI

Runs the Fursah conversational assistant entirely on **Cloudflare Workers AI**.
No paid AI API, no provider SDK, no `ANTHROPIC_API_KEY`.

- **Model:** `@cf/meta/llama-3.1-8b-instruct-fast` — the same free-plan text
  model the evidence-analysis handler already uses on this account.
- **Cost:** the Workers Free plan includes **10,000 neurons/day**. With the caps
  below one answer costs roughly **35 neurons**, so the free allocation covers
  on the order of **280 answers per day** at zero cost.
- **Paid-only models are avoided.** Those are `@cf/moonshotai/kimi-k2.6`,
  `@cf/moonshotai/kimi-k2.7-code`, `@cf/zai-org/glm-5.2`,
  `@cf/deepseek-ai/deepseek-v4-flash-0731`, `@cf/deepseek-ai/deepseek-v4-pro-0813`.

## Recommended: merge into the existing `fursah-evidence-ai` Worker

The assistant reuses the two bindings that Worker already has — `env.AI` and
`env.FURSAH_WORKER_SECRET` — so there is **no new binding, secret, or Worker**.

**Step 1.** Paste the `handleAssistant` function (and its two helpers, `json`
and `secretMatches`) from `src/index.js` into your existing Worker file.

**Step 2.** Add a path check as the first lines of the existing `fetch`, before
the current `Authorization` check:

```js
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // NEW: conversational assistant. Evidence analysis is untouched below.
    if (url.pathname === "/assistant") {
      return handleAssistant(request, env);
    }

    const authHeader = request.headers.get("Authorization");
    // ... the rest of the existing evidence-analysis handler, unchanged
  },
};
```

That is the entire change. Evidence analysis keeps its exact contract, its own
auth check, and its own error handling.

**Step 3.** Redeploy:

```bash
npx wrangler deploy
```

## Alternative: deploy standalone

```bash
cd workers/fursah-assistant
npx wrangler secret put ASSISTANT_AI_SECRET
npx wrangler deploy
```

## Worker configuration

| Binding / var | Required | Notes |
|---|---|---|
| `AI` | yes | Workers AI binding. Already present in `fursah-evidence-ai`. |
| `FURSAH_WORKER_SECRET` | yes* | Existing secret; the assistant reuses it. |
| `ASSISTANT_AI_SECRET` | optional | Overrides the above if you want a separate credential. |
| `ASSISTANT_AI_MODEL` | optional | Any non-paid model, e.g. `@cf/meta/llama-3.3-70b-instruct-fp8-fast` for higher quality at ~6x the neuron cost. |

## Request contract

```
POST /assistant
Authorization: Bearer <secret>

{ "system": "...", "messages": [{ "role": "user", "content": "..." }], "maxTokens": 300 }
→ 200 { "answer": "...", "model": "@cf/..." }
→ 401 { "error": "Unauthorized" }
→ 413 { "error": "Context too large", "code": "CONTEXT_TOO_LARGE" }
→ 429 { "code": "QUOTA_EXHAUSTED" }   // free daily allocation used up
→ 502 { "code": "INFERENCE_FAILED" }
```

Limits enforced here: **400 output tokens**, **24,000 prompt characters**.
Fursah applies its own tighter caps (300 output tokens, 12,000 chars of facts)
plus per-user and per-environment rate limiting before calling this at all.
