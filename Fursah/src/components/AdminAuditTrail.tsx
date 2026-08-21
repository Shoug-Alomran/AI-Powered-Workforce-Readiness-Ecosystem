"use client";

import { useMemo, useState } from "react";

export type AdminAuditItem = {
  id: string;
  action: string;
  entityType: string;
  explanation: string;
  modelVersion: string | null;
  createdAt: string;
  recent: boolean;
};

function readableAction(value: string) {
  return value.toLowerCase().replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}

export default function AdminAuditTrail({ items }: { items: AdminAuditItem[] }) {
  const [scope, setScope] = useState<"recent" | "all">("recent");
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();

  const visible = useMemo(() => items.filter((item) => {
    const matchesQuery = !normalizedQuery || [
      item.action,
      item.entityType,
      item.explanation,
      item.modelVersion ?? "human",
    ].some((value) => value.toLowerCase().replaceAll("_", " ").includes(normalizedQuery));
    const matchesScope = scope === "all" || item.recent || Boolean(normalizedQuery);
    return matchesQuery && matchesScope;
  }), [items, normalizedQuery, scope]);

  const recentCount = items.filter((item) => item.recent).length;
  const oldCount = items.length - recentCount;

  return <section className="card admin-audit" id="audit-logs">
    <header className="admin-section-heading">
      <div><span className="eyebrow">Accountability record</span><h2>Decision audit trail</h2><p>Recent consequential activity is shown first. Search or open the full history when investigating an older event.</p></div>
      <div className="admin-audit-count"><strong>{recentCount}</strong><span>recent event{recentCount === 1 ? "" : "s"}</span></div>
    </header>
    <div className="admin-audit-tools">
      <label><span>Search the audit trail</span><input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Action, entity, model, or note" type="search" /></label>
      <div className="admin-segmented" aria-label="Audit history range">
        <button className={scope === "recent" ? "is-active" : ""} type="button" onClick={() => setScope("recent")}>Recent</button>
        <button className={scope === "all" ? "is-active" : ""} type="button" onClick={() => setScope("all")}>All history{oldCount ? ` (${items.length})` : ""}</button>
      </div>
    </div>
    <div className="admin-audit-list">
      {visible.map((item) => <article className="admin-audit-item" key={item.id}>
        <div className="admin-audit-icon" aria-hidden="true">{item.modelVersion ? "AI" : "H"}</div>
        <div className="admin-audit-main">
          <div><strong>{readableAction(item.action)}</strong><span className="admin-audit-entity">{item.entityType.toLowerCase().replaceAll("_", " ")}</span></div>
          <p>{item.explanation}</p>
        </div>
        <div className="admin-audit-meta">
          <span className="pill">{item.modelVersion ?? "Human decision"}</span>
          <time dateTime={item.createdAt} suppressHydrationWarning>{new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.createdAt))}</time>
        </div>
      </article>)}
      {visible.length === 0 && <div className="admin-audit-empty"><strong>No matching events</strong><p>Try another search, or switch to all history.</p></div>}
    </div>
    {scope === "recent" && !normalizedQuery && oldCount > 0 && <button className="admin-history-reveal" type="button" onClick={() => setScope("all")}>Show {oldCount} older event{oldCount === 1 ? "" : "s"} →</button>}
  </section>;
}
