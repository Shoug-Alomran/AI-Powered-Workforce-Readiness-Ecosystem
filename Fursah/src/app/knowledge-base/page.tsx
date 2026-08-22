import type { Metadata } from "next";
import Link from "next/link";
import PageToc from "@/components/PageToc";
import SiteHeader from "@/components/SiteHeader";
import { KNOWLEDGE_AREAS, KNOWLEDGE_BASE, knowledgeByArea } from "@/lib/knowledgeBase";

export const metadata: Metadata = {
  title: "Knowledge Base | Fursah",
  description:
    "The public standards, regulations, statistics, and governance documents that inform Fursah.",
};

const AREA_ID: Record<string, string> = {
  "ITU standards and reports": "itu",
  "Saudi regulatory instruments": "saudi",
  "National strategy and statistics": "national",
  "International frameworks": "international",
  "Fursah governance documents": "fursah",
};

const AREA_NOTE: Record<string, string> = {
  "ITU standards and reports":
    "These documents provide the architecture, readiness dimensions, and gap framework used to assess Fursah.",
  "Saudi regulatory instruments":
    "These national instruments define what Fursah may collect, who may access it, and the rights available to each person.",
  "National strategy and statistics":
    "These sources support the problem statement. Each figure on the National Impact page includes a date and source.",
  "International frameworks":
    "These voluntary frameworks guide risk assessment and management. Their use does not imply certification.",
  "Fursah governance documents":
    "These project documents explain how Fursah applies and reviews the external sources listed here.",
};

export default function KnowledgeBasePage() {
  const withCode = KNOWLEDGE_BASE.filter(entry => entry.appliedIn?.length).length;
  const arabic = KNOWLEDGE_BASE.filter(entry => entry.language).length;

  return <main className="imp std">
    <SiteHeader />

    <div className="imp-shell">
      <section className="imp-hero">
        <span className="imp-eyebrow">Knowledge base</span>
        <h1 className="imp-title">The documents this is built on.</h1>
        <p className="imp-lead">This register lists the standards, regulations, and statistical sources used by Fursah. Each entry links to the original publication. When a source informs the code, the relevant file is also listed.</p>
        <div className="imp-strip">
          <article><b>{KNOWLEDGE_BASE.length}</b><small>Public documents, each linked to its publisher</small></article>
          <article><b>{withCode}</b><small>Traced to the specific file in this repository that depends on them</small></article>
          <article><b>{arabic}</b><small>Published in Arabic or bilingually by the issuing authority</small></article>
        </div>
        <div className="kb-downloads" aria-label="Knowledge base downloads">
          <a href="/api/knowledge-base?format=json">Download structured JSON</a>
          <a href="/api/knowledge-base?format=csv">Download review CSV</a>
        </div>
      </section>

      <PageToc items={KNOWLEDGE_AREAS.map(area => ({ id: AREA_ID[area], label: area }))} />

      {KNOWLEDGE_AREAS.map(area => <section className="imp-section" id={AREA_ID[area]} key={area}>
        <header>
          <span className="imp-kicker">{area}</span>
          <h2>{area}</h2>
          <p>{AREA_NOTE[area]}</p>
        </header>
        <div className="kb-list">
          {knowledgeByArea(area).map((entry, index) => {
            const concernsAi = /\b(?:AI|artificial intelligence|machine learning|ML)\b/i.test(`${entry.title} ${entry.about}`);
            return <article className={`kb-entry${concernsAi ? " kb-entry-ai" : ""}`} key={entry.id}>
            <div className="kb-head">
              <span className="kb-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              <div className="kb-identity">
                <h3>{entry.title}</h3>
                <div className="kb-meta"><span>{entry.publisher}</span><span>{entry.edition}</span>{entry.language && <span>{entry.language}</span>}{concernsAi && <span className="kb-ai-tag">AI related</span>}</div>
              </div>
              <a className="kb-source-link" href={entry.url} target="_blank" rel="noreferrer">View source <span aria-hidden="true">↗</span></a>
            </div>
            <div className="kb-body">
              <div className="kb-summary"><span className="imp-kicker">In brief</span><p>{entry.about}</p></div>
              <div className="kb-use"><span className="imp-kicker">How Fursah uses it</span><p>{entry.usedFor}</p></div>
            </div>
            {entry.appliedIn && <div className="kb-implementation"><span>Implemented in</span><ul className="std-files">{entry.appliedIn.map(file => <li key={file}><code>{file}</code></li>)}</ul></div>}
          </article>})}
        </div>
      </section>)}

      <section className="imp-section">
        <header>
          <span className="imp-kicker">A note on sourcing</span>
          <h2>Each source is clearly identified</h2>
          <p>Some national figures reach the public through a news outlet before the official bulletin is available. In these cases, the National Impact page names both the authority and the outlet. It also labels the figure as reported. Arabic documents link to the original publication.</p>
        </header>
      </section>

      <section className="imp-end">
        <h2>See how these documents shaped the build.</h2>
        <p>The standards page maps Fursah to ITU-T Y.3172 clause 8.1. It also assesses the platform against 13 AI readiness dimensions and records identified policy gaps.</p>
        <div><Link href="/standards">Standards conformance</Link><Link href="/impact" className="secondary">National impact</Link></div>
      </section>
    </div>
  </main>;
}
