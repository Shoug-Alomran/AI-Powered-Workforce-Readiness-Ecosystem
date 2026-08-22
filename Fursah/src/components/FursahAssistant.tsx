"use client";

import { useEffect, useRef, useState } from "react";

type Turn = { role: "user" | "assistant"; content: string };

/**
 * The conversational Fursah assistant.
 *
 * Sends the question to the authenticated server route, which assembles the
 * role's authorized data from the deterministic intelligence layer and calls
 * the model. No API key, no secret, and no other user's data ever reaches this
 * component — it receives only the finished answer.
 *
 * Conversation history is per page/session and held in component state only.
 */
export default function FursahAssistant({
  eyebrow = "FURSAH ASSISTANT",
  heading = "Ask about your data",
  intro,
  suggestions = [],
}: {
  eyebrow?: string;
  heading?: string;
  intro: string;
  /** Starting points only. Each one is sent as a real question. */
  suggestions?: string[];
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [question, setQuestion] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set when the server reports this account has hit its own limit. The input
  // is closed rather than left inviting a question that cannot be answered.
  const [limited, setLimited] = useState(false);
  const [meta, setMeta] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, pending]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || pending || limited) return;

    setError(null);
    setQuestion("");

    // History sent is what preceded this question, so the server replays the
    // same thread the user can see.
    const history = turns;
    setTurns((current) => [...current, { role: "user", content: trimmed }]);
    setPending(true);

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed, history }),
      });

      const data = (await response.json()) as {
        answer?: string;
        error?: string;
        model?: string;
        groundedIn?: string[];
      };

      if (!response.ok || !data.answer) {
        setError(data.error ?? "The assistant could not answer just now.");
        // 429 covers both this account's own limit and the shared free
        // allocation being spent. Either way no further question can succeed
        // right now, so the composer closes instead of failing repeatedly.
        if (response.status === 429) setLimited(true);
        return;
      }

      setTurns((current) => [...current, { role: "assistant", content: data.answer as string }]);
      setMeta(data.model ? `${data.model} · grounded in ${(data.groundedIn ?? []).join(", ")}` : null);
    } catch {
      setError("Could not reach the assistant. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="card" id="fursah-assistant" style={{ scrollMarginTop: 80 }}>
      <span className="eyebrow">{eyebrow}</span>
      <h2>{heading}</h2>
      <p className="muted">{intro}</p>

      {turns.length === 0 && suggestions.length > 0 && !limited && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              className="button secondary"
              disabled={pending}
              onClick={() => send(suggestion)}
              style={{ fontSize: 12 }}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {turns.length > 0 && (
        <div
          ref={threadRef}
          style={{ marginTop: 14, maxHeight: 380, overflowY: "auto", display: "grid", gap: 10 }}
          aria-live="polite"
        >
          {turns.map((turn, index) => (
            <div
              key={`${turn.role}-${index}`}
              className={turn.role === "assistant" ? "notice" : undefined}
              style={
                turn.role === "user"
                  ? { fontWeight: 650, fontSize: 14 }
                  : { whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.6 }
              }
            >
              {turn.role === "user" && <span className="pill">You</span>}{" "}
              {turn.content}
            </div>
          ))}

          {pending && (
            <div className="muted" style={{ fontSize: 13 }}>
              Reading your Fursah data…
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="notice" style={{ marginTop: 12 }} role="alert">
          {error}
        </div>
      )}

      {limited ? (
        <p className="muted" style={{ fontSize: 13, marginTop: 14 }}>
          The assistant is paused for this account. Everything it reports is already on this page. The assistant
          explains those figures, it does not produce them.
        </p>
      ) : (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void send(question);
        }}
        style={{ display: "flex", gap: 8, marginTop: 14, alignItems: "flex-end" }}
      >
        <label style={{ flex: 1 }}>
          <span className="sr-only">Ask the Fursah assistant</span>
          <input
            className="input"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask a question about your Fursah data…"
            disabled={pending}
            maxLength={1000}
          />
        </label>
        <button className="button primary" type="submit" disabled={pending || !question.trim()}>
          {pending ? "Thinking…" : "Ask"}
        </button>
      </form>
      )}

      <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
        Answers are generated from your authorized Fursah data and are advisory only. Every figure comes from the
        platform&apos;s deterministic intelligence layer, not from the model.
        {meta ? ` (${meta})` : ""}
      </p>
    </section>
  );
}
