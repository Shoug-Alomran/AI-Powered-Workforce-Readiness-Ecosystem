"use client";

import { useActionState } from "react";
import type { ReactNode } from "react";

type SubmitState = { ok?: boolean; error?: string };

const initialState: SubmitState = {};

export default function SubmitStatusForm({
  action,
  submitLabel,
  pendingLabel = "Submitting…",
  successMessage,
  className = "form-grid",
  children,
}: {
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  pendingLabel?: string;
  successMessage: string;
  className?: string;
  children: ReactNode;
}) {
  const [state, formAction, pending] = useActionState(async (_prev: SubmitState, formData: FormData): Promise<SubmitState> => {
    try {
      await action(formData);
      return { ok: true };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Something went wrong. Please try again." };
    }
  }, initialState);

  return <form action={formAction} className={className} aria-busy={pending}>
    {children}
    {pending&&<div className="submit-status submit-status--pending" role="status"><span className="submit-spinner" aria-hidden="true"/>Uploading your submission and running automated checks…</div>}
    {!pending&&state.error&&<div className="auth-error" role="alert">{state.error}</div>}
    {!pending&&state.ok&&<div className="auth-success" role="status">{successMessage}</div>}
    <button className="button primary" disabled={pending}>{pending?<><span className="submit-spinner" aria-hidden="true"/>{pendingLabel}</>:submitLabel}</button>
  </form>;
}
