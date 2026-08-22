"use client";

import { useActionState, useState } from "react";
import { deleteJob, type JobDeleteState } from "@/actions/employer";

const initialState: JobDeleteState = {};

export default function JobDeleteControl({ jobId, jobTitle, applicantCount }: { jobId: string; jobTitle: string; applicantCount: number }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [state, formAction, pending] = useActionState(deleteJob, initialState);
  const matches = typed.trim().toLowerCase() === jobTitle.trim().toLowerCase();

  function close() {
    if (pending) return;
    setOpen(false);
    setTyped("");
  }

  return <>
    <button type="button" className="button danger" onClick={() => setOpen(true)}>Delete role</button>
    {open && <div className="pjob-preview-backdrop" role="presentation" onMouseDown={close}>
      <section className="pjob-preview job-delete-dialog" role="dialog" aria-modal="true" aria-labelledby="job-delete-title" onMouseDown={(event) => event.stopPropagation()}>
        <header><span>DELETE OPPORTUNITY</span><button type="button" onClick={close} aria-label="Cancel deletion">×</button></header>
        <h2 id="job-delete-title">Delete “{jobTitle}”?</h2>
        <p className="muted">This permanently removes the role, its requirements, and any uploaded requirement documents{applicantCount > 0 ? <>, along with <strong>{applicantCount} candidate application{applicantCount === 1 ? "" : "s"}</strong> and their match history</> : null}. This cannot be undone. Close the role instead if you only want to stop receiving applications.</p>
        <form action={formAction}>
          <input type="hidden" name="jobId" value={jobId} />
          <label className="job-delete-confirm">Type <strong>{jobTitle}</strong> to confirm
            <input className="input" name="confirmTitle" value={typed} onChange={(event) => setTyped(event.target.value)} autoComplete="off" autoFocus placeholder={jobTitle} disabled={pending} />
          </label>
          {state.error && <div className="auth-error" role="alert">{state.error}</div>}
          <footer>
            <button type="button" onClick={close} disabled={pending}>Cancel</button>
            <button type="submit" className="button danger" disabled={!matches || pending} aria-busy={pending}>
              {pending ? <><span className="submit-spinner" aria-hidden="true" />Deleting…</> : "Delete permanently"}
            </button>
          </footer>
        </form>
      </section>
    </div>}
  </>;
}
