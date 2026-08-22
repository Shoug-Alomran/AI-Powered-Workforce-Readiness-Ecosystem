import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { ITU_DIMENSIONS, POLICY_GAPS, Y3172_NODES } from "@/lib/standards";
import { KNOWLEDGE_BASE } from "@/lib/knowledgeBase";

export const metadata: Metadata = {
  title: "Judge Demo | Fursah",
  description: "A three-minute, evidence-linked walkthrough of Fursah against the official AI Readiness Hackathon criteria.",
};

const rubric = [
  ["01", "Y.3172 pipeline", "Seven clause 8.1 nodes mapped to running components and source files.", "/standards#pipeline"],
  ["02", "13 readiness dimensions", "An honest addressed, partial, or out-of-scope self-assessment with implementation evidence.", "/standards#dimensions"],
  ["03", "Knowledge-base contribution", "Authentic sources linked to publishers, implementation consequences, and structured exports.", "/knowledge-base"],
  ["04", "Policy and strategy input", "Six observed gaps converted into owned, triggered, measurable recommendations.", "/standards#gaps"],
] as const;

const walkthrough = [
  ["1", "Enter a prepared student workspace", "Choose Abdullah Al-Ghamdi to see an early-readiness profile with meaningful gaps.", "/login/demo", "Open demo accounts"],
  ["2", "Reconstruct the score", "On the student dashboard, compare the 36/100 total with the five published weighted components.", "/student/dashboard#breakdown", "Open readiness breakdown"],
  ["3", "Ask the grounded assistant", "Use the first suggested question. The answer repeats platform facts and identifies its model and grounding versions.", "/student/dashboard#career-intelligence", "Open student assistant"],
  ["4", "Inspect evidence governance", "Switch to the administrator account and review extraction proposals, human decisions, and reviewer attribution.", "/login/demo", "Switch demo role"],
  ["5", "Test privacy and oversight", "In Governance, inspect appeals, overrides, the suppression floor, and the operational Y.3172 trace.", "/admin/governance", "Open governance"],
  ["6", "Follow the ecosystem signal", "Use an employer and a university account to see the same skill language flow from vacancies into curriculum action.", "/login/demo", "Explore stakeholder portals"],
] as const;

export default function JudgeDemoPage() {
  const addressed = ITU_DIMENSIONS.filter(item => item.coverage === "addressed").length;
  const partial = ITU_DIMENSIONS.filter(item => item.coverage === "partial").length;
  return <main className="imp judge-demo">
    <SiteHeader />
    <div className="imp-shell">
      <section className="imp-hero judge-hero">
        <span className="imp-eyebrow">Official-criteria walkthrough</span>
        <h1 className="imp-title">Judge Fursah in three minutes.</h1>
        <p className="imp-lead">This page separates implemented proof from future claims and routes each published evaluation criterion to evidence a reviewer can inspect. Demo accounts use synthetic data; production deployment remains subject to the blocking hosting control documented in the DPIA.</p>
        <div className="judge-actions"><Link href="/login/demo">Start live prototype</Link><Link href="/standards" className="secondary">Inspect conformance</Link><a href="/fursah-ai-readiness-hackathon-submission.pdf" target="_blank" rel="noopener noreferrer" className="secondary">Read final submission</a></div>
        <div className="imp-strip">
          <article><b>{Y3172_NODES.length}/7</b><small>Y.3172 clause 8.1 nodes mapped</small></article>
          <article><b>{addressed}+{partial}</b><small>Dimensions addressed or partially addressed; one is explicitly out of scope</small></article>
          <article><b>{KNOWLEDGE_BASE.length}</b><small>Authentic, public, implementation-linked knowledge-base entries</small></article>
        </div>
      </section>

      <section className="imp-section">
        <header><span className="imp-kicker">The published rubric</span><h2>Four criteria, four evidence paths</h2><p>No generic innovation score is substituted for the event&apos;s actual evaluation criteria.</p></header>
        <div className="judge-rubric">{rubric.map(([number,title,body,href]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{body}</p><Link href={href}>Inspect evidence →</Link></article>)}</div>
      </section>

      <section className="imp-section">
        <header><span className="imp-kicker">Live demonstration</span><h2>One uninterrupted proof chain</h2><p>The sequence moves from individual evidence to a deterministic score, a bounded model explanation, human oversight, and aggregate institutional action.</p></header>
        <ol className="judge-walkthrough">{walkthrough.map(([step,title,body,href,label]) => <li key={step}><span>{step}</span><div><h3>{title}</h3><p>{body}</p></div><Link href={href}>{label}</Link></li>)}</ol>
      </section>

      <section className="imp-section judge-boundary">
        <header><span className="imp-kicker">Trust boundary</span><h2>What the model may and may not do</h2></header>
        <div><article><b>Generative AI may</b><p>Extract proposed fields from documents and explain facts already calculated for the signed-in role.</p></article><article><b>Generative AI may not</b><p>Calculate scores, rank people, verify evidence, alter career direction, invent metrics, or expose another role&apos;s data.</p></article><article><b>Humans retain</b><p>Evidence approval, hiring decisions, curriculum action, appeals, overrides, and production-risk acceptance.</p></article></div>
      </section>

      <section className="imp-end"><h2>Review the contribution, not a promise.</h2><p>{POLICY_GAPS.length} encountered gaps are published with an accountable owner, operating trigger, success measure, and review cadence.</p><div><Link href="/api/knowledge-base?format=json">Download AI-RE JSON</Link><Link href="/api/knowledge-base?format=csv" className="secondary">Download review CSV</Link><a href="/fursah-judge-handout.pdf" target="_blank" rel="noopener noreferrer" className="secondary">Download one-page brief</a></div></section>
    </div>
  </main>;
}
