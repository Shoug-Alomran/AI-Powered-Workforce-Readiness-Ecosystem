"use client";

import { useMemo, useState } from "react";

type CertificateReview = {
  id: string;
  certification: string;
  studentName: string;
  studentEmail: string;
  status: string;
  reviewNote: string;
  reviewedAt: string | null;
  reviewerName: string;
  evidenceName: string | null;
  hasEvidence: boolean;
};

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

export default function CertificateReviewHistory({ items }: { items: CertificateReview[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [reviewer, setReviewer] = useState("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const reviewers = useMemo(() => [...new Set(items.map((item) => item.reviewerName))].sort(), [items]);
  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const start = from ? new Date(`${from}T00:00:00`).getTime() : Number.NEGATIVE_INFINITY;
    const end = to ? new Date(`${to}T23:59:59.999`).getTime() : Number.POSITIVE_INFINITY;
    return items.filter((item) => {
      const reviewedTime = item.reviewedAt ? new Date(item.reviewedAt).getTime() : 0;
      const matchesQuery = !normalized || [item.certification, item.studentName, item.studentEmail, item.reviewNote, item.reviewerName, item.evidenceName ?? ""].some((value) => value.toLowerCase().includes(normalized));
      return matchesQuery && (status === "ALL" || item.status === status) && (reviewer === "ALL" || item.reviewerName === reviewer) && reviewedTime >= start && reviewedTime <= end;
    });
  }, [from, items, query, reviewer, status, to]);

  const clearFilters = () => { setQuery(""); setStatus("ALL"); setReviewer("ALL"); setFrom(""); setTo(""); };

  return <section className="card certificate-history" id="certificate-history">
    <header className="certificate-history-heading">
      <div><span className="eyebrow">Certificate evidence archive</span><h2>Previous certificate reviews</h2><p className="muted">Inspect every completed decision, its reviewer, note, timestamp, and original private evidence.</p></div>
      <div className="certificate-history-count"><strong>{visible.length}</strong><span>of {items.length} reviews</span></div>
    </header>

    <div className="certificate-history-filters">
      <label className="certificate-history-search"><span>Search reviews</span><input className="input" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Student, certificate, note, or reviewer" /></label>
      <label><span>Decision</span><select className="input" value={status} onChange={(event) => setStatus(event.target.value)}><option value="ALL">All decisions</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option></select></label>
      <label><span>Reviewer</span><select className="input" value={reviewer} onChange={(event) => setReviewer(event.target.value)}><option value="ALL">All reviewers</option>{reviewers.map((name) => <option key={name} value={name}>{name}</option>)}</select></label>
      <label><span>From</span><input className="input" type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
      <label><span>To</span><input className="input" type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label>
      <button className="button secondary" type="button" onClick={clearFilters}>Clear filters</button>
    </div>

    <div className="certificate-history-list">
      {visible.map((item) => <article className="certificate-history-item" key={item.id}>
        <div className="certificate-history-main">
          <div><span className={`pill status-${item.status.toLowerCase()}`}>{item.status.toLowerCase()}</span><strong>{item.certification}</strong></div>
          <p>{item.studentName} · {item.studentEmail}</p>
          <blockquote><strong>Human review note</strong><span>{item.reviewNote}</span></blockquote>
        </div>
        <dl>
          <div><dt>Reviewed by</dt><dd>{item.reviewerName}</dd></div>
          <div><dt>Decision time</dt><dd>{item.reviewedAt ? dateFormatter.format(new Date(item.reviewedAt)) : "Not recorded"}</dd></div>
          <div><dt>Evidence file</dt><dd>{item.evidenceName ?? "Not named"}</dd></div>
        </dl>
        {item.hasEvidence ? <a className="button secondary" href={`/api/certificates/${item.id}/image`} target="_blank" rel="noreferrer">Open evidence</a> : <span className="muted">Evidence unavailable</span>}
      </article>)}
      {visible.length === 0 && <div className="certificate-history-empty"><strong>No matching certificate reviews</strong><p className="muted">Adjust the filters or clear them to return to the full archive.</p><button className="button secondary" type="button" onClick={clearFilters}>Clear filters</button></div>}
    </div>
  </section>;
}
