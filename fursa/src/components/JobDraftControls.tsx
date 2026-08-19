"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

const FORM_ID = "create-job-form";
const DRAFT_KEY = "fursah:create-job-draft";

function getForm() {
  return document.getElementById(FORM_ID) as HTMLFormElement | null;
}

export function JobSaveStatus() {
  const [status, setStatus] = useState<"idle" | "dirty" | "saved">("idle");

  useEffect(() => {
    const form = getForm();
    if (!form) return;
    let restoredStatusTimer: number | undefined;
    const stored = localStorage.getItem(DRAFT_KEY);
    if (stored) {
      try {
        const values = JSON.parse(stored) as Record<string, string>;
        Object.entries(values).forEach(([name, value]) => {
          form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(`[name="${CSS.escape(name)}"]`).forEach((field) => {
            if (field instanceof HTMLInputElement && field.type === "radio") field.checked = field.value === value;
            else if (field instanceof HTMLInputElement && field.type === "checkbox") field.checked = true;
            else field.value = value;
          });
        });
        restoredStatusTimer = window.setTimeout(() => setStatus("saved"), 0);
      } catch {
        localStorage.removeItem(DRAFT_KEY);
      }
    }
    const markDirty = () => setStatus("dirty");
    const markSaved = () => setStatus("saved");
    form.addEventListener("input", markDirty);
    form.addEventListener("change", markDirty);
    window.addEventListener("fursah:draft-saved", markSaved);
    return () => {
      if (restoredStatusTimer !== undefined) window.clearTimeout(restoredStatusTimer);
      form.removeEventListener("input", markDirty);
      form.removeEventListener("change", markDirty);
      window.removeEventListener("fursah:draft-saved", markSaved);
    };
  }, []);

  return <span className={`pjob-save-state ${status}`} aria-live="polite">
    {status === "dirty" ? "●  Unsaved changes" : status === "saved" ? "✓  Draft saved" : "○  No changes yet"}
  </span>;
}

export function JobDraftActions() {
  const [preview, setPreview] = useState<Record<string, string> | null>(null);

  function saveDraft() {
    const form = getForm();
    if (!form) return;
    const values: Record<string, string> = {};
    new FormData(form).forEach((value, key) => {
      if (typeof value === "string") values[key] = value;
    });
    localStorage.setItem(DRAFT_KEY, JSON.stringify(values));
    window.dispatchEvent(new Event("fursah:draft-saved"));
  }

  function showPreview() {
    const form = getForm();
    if (!form) return;
    const data = new FormData(form);
    setPreview({
      title: String(data.get("title") || "Untitled opportunity"),
      department: String(data.get("department") || "Department not selected"),
      location: String(data.get("location") || "Location not specified"),
      arrangement: String(data.get("arrangement") || "Not specified"),
      description: String(data.get("description") || "No role description added yet."),
      skills: String(data.get("skills") || "No required skills added."),
    });
  }

  return <>
    <div className="pjob-draft-actions">
      <button type="button" onClick={saveDraft}>▣　Save Draft</button>
      <i aria-hidden="true" />
      <button type="button" onClick={showPreview}>⊙　Preview Opportunity</button>
    </div>
    {preview && <div className="pjob-preview-backdrop" role="presentation" onMouseDown={() => setPreview(null)}>
      <section className="pjob-preview" role="dialog" aria-modal="true" aria-labelledby="job-preview-title" onMouseDown={(event) => event.stopPropagation()}>
        <header><span>OPPORTUNITY PREVIEW</span><button type="button" onClick={() => setPreview(null)} aria-label="Close preview">×</button></header>
        <h2 id="job-preview-title">{preview.title}</h2>
        <p className="pjob-preview-meta">{preview.department} · {preview.location} · {preview.arrangement}</p>
        <h3>Role description</h3><p>{preview.description}</p>
        <h3>Required skills</h3><p>{preview.skills}</p>
        <footer><button type="button" onClick={() => setPreview(null)}>Continue editing</button></footer>
      </section>
    </div>}
  </>;
}

export function JobPublishButton() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} aria-busy={pending}>
    {pending ? <><span className="submit-spinner" aria-hidden="true" />Publishing…</> : "Publish Opportunity　♧"}
  </button>;
}
