import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";

const packageItems = [
  ["Buyer", "University career-readiness office", "Owns student employability outcomes and employer engagement."],
  ["Initial use", "Cohort readiness and demand alignment", "Begin with one program, one term, and a bounded employer group."],
  ["Implementation", "8–12 week controlled pilot", "Configure taxonomy, onboard synthetic rehearsals, then consented participants."],
  ["Evidence", "Pre-registered operational measures", "Compare completion time, action uptake, reviewer agreement, appeals, and parity."],
] as const;

const gates = [
  ["01", "Scope", "One university program and one employer partner."],
  ["02", "Rehearse", "Synthetic records, access testing, and reviewer training."],
  ["03", "Operate", "Consented data, human approval, and weekly incident review."],
  ["04", "Decide", "Publish positive, null, or negative findings before scaling."],
] as const;

export default function CommercialReadinessPage() {
  return <main className="imp commercial-readiness"><SiteHeader/><div className="imp-shell">
    <section className="imp-hero commercial-hero">
      <div className="commercial-hero-copy"><span className="imp-eyebrow">Controlled adoption</span><h1 className="imp-title">A credible first purchase, not a market-size promise.</h1><p className="imp-lead">Fursah begins with a university career-readiness office that needs evidence-based cohort plans and closer alignment with employer requirements. Pricing and outcome claims will follow evidence from a controlled pilot.</p><div className="judge-actions"><Link href="/support">Discuss a pilot</Link><Link className="secondary" href="/judge-demo">Inspect the product</Link></div></div>
      <aside className="commercial-brief" aria-label="Pilot at a glance">
        <span>Pilot at a glance</span>
        <h2>A bounded test with a clear decision.</h2>
        <dl>
          <div><dt>Buyer</dt><dd>University career-readiness office</dd></div>
          <div><dt>Duration</dt><dd>8–12 weeks</dd></div>
          <div><dt>Scope</dt><dd>One program and one employer group</dd></div>
          <div><dt>Outcome</dt><dd>Scale, revise, or stop</dd></div>
        </dl>
        <p>No pricing or performance claim is made before the pilot is evaluated.</p>
      </aside>
    </section>
    <section className="imp-section"><header><span className="imp-kicker">Initial offer</span><h2>One buyer, one use case, one measurable deployment</h2></header><div className="commercial-grid">{packageItems.map(([label,title,body])=><article key={label}><small>{label}</small><h3>{title}</h3><p>{body}</p></article>)}</div></section>
    <section className="imp-section"><header><span className="imp-kicker">Implementation path</span><h2>Four gates before scale</h2></header><div className="commercial-steps">{gates.map(([n,title,body])=><article key={n}><b>{n}</b><div><h3>{title}</h3><p>{body}</p></div></article>)}</div></section>
    <section className="imp-section judge-boundary"><header><span className="imp-kicker">Success contract</span><h2>What the pilot must prove</h2></header><div><article><b>Operational value</b><p>Faster verified readiness plans, higher evidence completion, and useful next-action uptake.</p></article><article><b>Decision quality</b><p>Documented agreement and disagreement between recommendations and blinded human reviewers.</p></article><article><b>Safety</b><p>No material privacy, accessibility, unsupported-output, or outcome-parity failure.</p></article></div></section>
  </div></main>;
}
