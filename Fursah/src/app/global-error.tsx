"use client";

// global-error replaces the root layout entirely when a render fails above it,
// so it has to supply its own <html>/<body>. Defining it here also keeps the
// error document free of the session lookup the real navbar performs, which is
// what stopped Next from prerendering this route.
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "var(--font-sans)", background: "var(--color-background)", color: "var(--color-text)" }}>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "48px 20px" }}>
          <div style={{ maxWidth: 520, textAlign: "center" }}>
            <h1 style={{ fontSize: 32, letterSpacing: "-0.03em", margin: "0 0 12px" }}>Something went wrong</h1>
            <p style={{ color: "var(--color-muted)", lineHeight: 1.6, margin: "0 0 24px" }}>
              An unexpected error interrupted this page. Your data has not been affected.
            </p>
            <button
              onClick={reset}
              style={{ padding: "12px 20px", borderRadius: 999, border: 0, background: "var(--color-accent)", color: "var(--color-surface)", fontWeight: 700, fontSize: 15, cursor: "pointer" }}
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
