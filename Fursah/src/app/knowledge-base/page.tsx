import type { Metadata } from "next";
import Link from "next/link";
import PageToc from "@/components/PageToc";
import SiteHeader from "@/components/SiteHeader";
import { KNOWLEDGE_AREAS, KNOWLEDGE_BASE, knowledgeByArea } from "@/lib/knowledgeBase";

export const metadata: Metadata = {
  title: "Knowledge Base | Fursah",
  description:
    "The authentic public documents Fursah is built on: ITU Recommendations and reports, Saudi regulatory instruments, national statistics and international frameworks, each linked to the original and to the code that depends on it.",
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
    "The material this project is assessed against. Y.3172 clause 8.1 supplies the architecture vocabulary; the AI Ready Report supplies the readiness dimensions and the gap taxonomy.",
  "Saudi regulatory instruments":
    "Binding national instruments. These are the documents that decide what Fursah is permitted to collect, who may see it, and what a person can require of us.",
  "National strategy and statistics":
    "The evidence base for the problem statement. Every figure on the National Impact page traces back to one of these, dated and attributed.",
  "International frameworks":
    "Voluntary frameworks the governance design follows, used to structure risk assessment and management rather than to claim certification.",
  "Fursah governance documents":
    "Written by this project rather than cited by it, and listed here because they are the assessment a reader needs in order to check the claims the other documents are used to support.",
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
        <p className="imp-lead">Every instrument, standard and statistical source Fursah depends on, linked to the original publication. The rule for inclusion is that a document must be publicly checkable and actually load-bearing: a standard we merely admire is not on this list. Where a document constrains code, the file it constrains is named.</p>
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
          {knowledgeByArea(area).map(entry => <article className="kb-entry" key={entry.id}>
            <div className="kb-head">
              <div>
                <h3>{entry.title}</h3>
                <p className="kb-meta">{entry.publisher} · {entry.edition}{entry.language ? ` · published in ${entry.language}` : ""}</p>
              </div>
              <a href={entry.url} target="_blank" rel="noreferrer">Open original ↗</a>
            </div>
            <div className="kb-body">
              <div><span className="imp-kicker">What it is</span><p>{entry.about}</p></div>
              <div><span className="imp-kicker">What depends on it</span><p>{entry.usedFor}</p></div>
            </div>
            {entry.appliedIn && <ul className="std-files">{entry.appliedIn.map(file => <li key={file}><code>{file}</code></li>)}</ul>}
          </article>)}
        </div>
      </section>)}

      <section className="imp-section">
        <header>
          <span className="imp-kicker">A note on sourcing</span>
          <h2>Where a figure came through a second party, both are named</h2>
          <p>Some national figures are published by an authority and carried by a news outlet before appearing in a downloadable bulletin. Where that is the case, the National Impact page names the authority and the outlet, and marks the figure as reported rather than primary, so the chain can be followed back. Documents issued in Arabic are cited in Arabic; no figure here is translated from a secondary English summary without the original being linked.</p>
        </header>
      </section>

      <section className="imp-end">
        <h2>See how these documents shaped the build.</h2>
        <p>The standards page maps Fursah onto ITU-T Y.3172 clause 8.1 node by node, self-assesses against the 13 AI Readiness dimensions, and sets out the policy gaps this project identified.</p>
        <div><Link href="/standards">Standards conformance</Link><Link href="/impact" className="secondary">National impact</Link></div>
      </section>
    </div>
  </main>;
}
