"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import type { MonitoringCaptureResult } from "@/actions/governance";

type CaptureState = { result?: MonitoringCaptureResult; error?: string };

export default function MonitoringCaptureForm({ action }: { action: () => Promise<MonitoringCaptureResult> }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(async (): Promise<CaptureState> => {
    try {
      const result = await action();
      router.refresh();
      return { result };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "The snapshot could not be captured. Please try again." };
    }
  }, {});

  return (
    <form action={formAction} aria-busy={pending} style={{ display: "grid", gap: 8, justifyItems: "end" }}>
      <button className="button primary" disabled={pending} aria-describedby="monitoring-capture-status">
        {pending ? <><span className="submit-spinner" aria-hidden="true" />Capturing snapshot…</> : "Capture current snapshot"}
      </button>
      <div id="monitoring-capture-status" aria-live="polite">
        {!pending && state.result && <span className="auth-success" style={{ display: "block" }}>Snapshot captured: {state.result.sampleSize} eligible outcomes, {state.result.status.replaceAll("_", " ").toLowerCase()}.</span>}
        {!pending && state.error && <span className="auth-error" role="alert" style={{ display: "block", padding: "12px 14px", border: "1px solid" }}>{state.error}</span>}
      </div>
    </form>
  );
}
