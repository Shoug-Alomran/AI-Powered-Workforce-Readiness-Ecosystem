import type { Metadata } from "next";
import Link from "next/link";
import PageToc from "@/components/PageToc";
import SiteHeader from "@/components/SiteHeader";
import {
  GAP_CATEGORIES,
  ITU_DIMENSIONS,
  POLICY_GAPS,
  Y3172_EXTENSIONS,
  Y3172_NODES,
  Y3172_REFERENCE,
  Y3172_URL,
} from "@/lib/standards";

export const metadata: Metadata = {
  title: "Standards Conformance | Fursah",
  description:
    "How Fursah maps to ITU-T Y.3172 clause 8.1 node by node, its self-assessment against the 13 dimensions of the ITU AI Ready Report 2.0, and the policy gaps this project identified while being built.",
};

const COVERAGE_LABEL = {
  addressed: "Addressed",
  partial: "Partial",
  "out-of-scope": "Out of scope",
} as const;

export default function StandardsPage() {
  const addressed = ITU_DIMENSIONS.filter(dimension => dimension.coverage === "addressed").length;

  return <main className="imp std">
    <SiteHeader />

    <div className="imp-shell">
      <section className="imp-hero">
        <span className="imp-eyebrow">Standards conformance</span>
        <h1 className="imp-title">Built to a standard, node by node.</h1>
        <p className="imp-lead">Fursah is described in the vocabulary of ITU-T Y.3172 clause 8.1, self-assessed against the 13 dimensions of the ITU AI Ready Report 2.0, and honest about what it does not cover. Every node below names the source file that implements it, so the claim can be checked rather than taken.</p>
        <p className="imp-foot">{Y3172_REFERENCE}</p>
        <div className="imp-strip">
          <article><b>7 / 7</b><small>Clause 8.1 pipeline nodes implemented and mapped to source</small></article>
          <article><b>{addressed}/13</b><small>AI Readiness dimensions addressed, with the rest partial or out of scope</small></article>
          <article><b>{POLICY_GAPS.length}</b><small>Policy gaps identified, including one blocking for production</small></article>
        </div>
      </section>

      <PageToc items={[
        { id: "pipeline", label: "Y.3172 clause 8.1" },
        { id: "extensions", label: "Extensions" },
        { id: "dimensions", label: "13 dimensions" },
        { id: "gaps", label: "Policy gaps" },
      ]} />

      <section className="imp-section" id="pipeline">
        <header>
          <span className="imp-kicker">ITU-T Y.3172 · clause 8.1</span>
          <h2>The ML pipeline, in the standard&apos;s own terms</h2>
          <p>Clause 8.1 defines the pipeline as seven nodes. The left column of each row is what the Recommendation says the node is for; the right is what Fursah runs there. Keeping those two apart matters: describing our implementation in place of the standard&apos;s function would be a different taxonomy wearing the same identifiers.</p>
        </header>

        <div className="imp-vision">
          {Y3172_NODES.map(node => <article key={node.id} className="std-node">
            <div>
              <div className="std-node-head">
                <span className="std-id">{node.id}</span>
                <h3>{node.label}</h3>
              </div>
              <p>{node.standardFunction}</p>
              <p className="imp-foot std-governs"><span>Governed by</span> {node.governs}</p>
            </div>
            <div className="imp-vision-link">
              <span className="imp-kicker">What Fursah runs here</span>
              <p>{node.fursah}</p>
              <ul className="std-files">{node.implementation.map(file => <li key={file}><code>{file}</code></li>)}</ul>
            </div>
          </article>)}
        </div>

        <p className="imp-foot" style={{ marginTop: 18 }}>
          The M node is split deliberately. The deterministic engine produces every score that affects a person; the language model only reads documents and explains results already produced. Human review carried at the P node overrides any output of M, and the override is logged.{" "}
          <a href={Y3172_URL} target="_blank" rel="noreferrer">Read Y.3172 ↗</a>
        </p>
      </section>

      <section className="imp-section" id="extensions">
        <header>
          <span className="imp-kicker">Beyond clause 8.1</span>
          <h2>Two nodes the pipeline definition does not contain</h2>
          <p>Fursah runs two components that clause 8.1 does not define. They are listed separately rather than folded into the seven, because presenting a non-8.1 node as an 8.1 node is exactly the error this page exists to avoid.</p>
        </header>
        <div className="imp-panel">
          {Y3172_EXTENSIONS.map(extension => <div className="data-row" key={extension.label}>
            <div>
              <strong>{extension.label}</strong>
              <div className="imp-foot" style={{ marginTop: 4 }}>{extension.reference}</div>
              <p style={{ margin: "8px 0 0", fontSize: 14, lineHeight: 1.6 }}>{extension.fursah}</p>
            </div>
            <span className="pill">{extension.status}</span>
          </div>)}
        </div>
      </section>

      <section className="imp-section" id="dimensions">
        <header>
          <span className="imp-kicker">AI Ready Report 2.0 · January 2026</span>
          <h2>Self-assessment against the 13 dimensions</h2>
          <p>The report derives its dimensions bottom-up from Plugfest projects, so partial coverage is the expected result for any single application. Each row below is marked addressed, partial or out of scope, and a dimension Fursah does not reach states the reason rather than claiming credit. Dimension 9 is the one to read first — the report names skills gap analysis as a desired output of the framework, and that is precisely what Fursah computes.</p>
        </header>
        <div className="std-dims">
          {ITU_DIMENSIONS.map(dimension => <article className={`std-dim cov-${dimension.coverage}`} key={dimension.number}>
            <div className="std-dim-head">
              <span className="std-dim-num">{dimension.number}</span>
              <div>
                <b>{dimension.title}</b>
                <small>{dimension.measures}</small>
              </div>
              <span className="std-cov">{COVERAGE_LABEL[dimension.coverage]}</span>
            </div>
            <p>{dimension.fursah}</p>
            {dimension.evidence && <p className="imp-foot"><code>{dimension.evidence}</code></p>}
          </article>)}
        </div>
      </section>

      <section className="imp-section" id="gaps">
        <header>
          <span className="imp-kicker">Chapter 4 gap taxonomy</span>
          <h2>Policy gaps this project ran into</h2>
          <p>Structured on the three gap types the AI Ready Report sets out. These are constraints encountered while building Fursah, not a literature survey — each one is a thing the platform cannot resolve on its own, with what would close it.</p>
        </header>
        {GAP_CATEGORIES.map(category => {
          const gaps = POLICY_GAPS.filter(gap => gap.category === category);
          if (!gaps.length) return null;
          return <div key={category} className="std-gap-group">
            <h3 className="std-gap-cat">{category}</h3>
            {gaps.map(gap => <article className={`std-gap${gap.blocking ? " blocking" : ""}`} key={gap.id}>
              <div className="std-gap-head">
                <b>{gap.title}</b>
                {gap.blocking && <span className="std-blocking">Blocking for production</span>}
              </div>
              <div className="std-gap-body">
                <div><span className="imp-kicker">What we observed</span><p>{gap.observed}</p></div>
                <div><span className="imp-kicker">Why it is not ours to fix</span><p>{gap.why}</p></div>
                <div><span className="imp-kicker">What would close it</span><p>{gap.recommendation}</p></div>
              </div>
            </article>)}
          </div>;
        })}
      </section>

      <section className="imp-end">
        <h2>Every document behind this page is public.</h2>
        <p>The knowledge base lists each instrument cited here with its publisher, a link to the original, and the file in this repository that depends on it.</p>
        <div><Link href="/knowledge-base">Open the knowledge base</Link><Link href="/policies/responsible-ai" className="secondary">Responsible AI policy</Link></div>
      </section>
    </div>
  </main>;
}
