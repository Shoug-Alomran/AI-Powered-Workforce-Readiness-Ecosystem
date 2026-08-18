import type { Metadata } from "next";
import Link from "next/link";
import PageToc from "@/components/PageToc";
import SiteHeader from "@/components/SiteHeader";
import { CHECKED, enrolment, fieldMix, fieldMixSource, graduateGrowthPercent, graduateMidpoint, graduateTrend, indicatorPairs, referenceSources, sdgAlignment, visionAlignment } from "@/lib/nationalImpact";

export const metadata: Metadata = {
  title: "National Impact | Fursah",
  description: "The evidence behind Fursah: a decade of growth in Saudi graduate numbers, the skills-matching gap it exposed, and how the platform aligns with Saudi Vision 2030 and the UN Sustainable Development Goals.",
};

const SDG_COLOR: Record<number, string> = { 4: "#c5192d", 5: "#ff3a21", 8: "#a21942", 10: "#dd1367" };

export default function ImpactPage() {
  const growth = graduateGrowthPercent();
  const peak = Math.max(graduateTrend.earlier.value, graduateTrend.latest.value);
  const bars = [graduateTrend.earlier, graduateMidpoint, graduateTrend.latest];
  return <main className="imp">
    <SiteHeader />

    <div className="imp-shell">
      <section className="imp-hero">
        <span className="imp-eyebrow">National context</span>
        <h1 className="imp-title">Saudi Arabia is not short of graduates.</h1>
        <p className="imp-lead">It is short of ways to prove what those graduates can do. Over the last decade the Kingdom roughly doubled its annual graduate output while unemployment fell and participation widened: national reform working exactly as intended. What remains is a matching problem at the level of the individual student and the individual job. That is the layer Fursah is built for.</p>
        <div className="imp-strip">
          <article><b>{growth > 0 ? "+" : ""}{growth}%</b><small>Growth in annual graduates, mid-2010s to 2023</small></article>
          <article><b>6.8%</b><small>Saudi unemployment, Q2 2025: the Vision 2030 target of 7% was met early</small></article>
          <article><b>36.2%</b><small>Female labour force participation, Q3 2024: target was 30%</small></article>
        </div>
      </section>

      <PageToc items={[{ id: "decade", label: "A decade of growth" }, { id: "fields", label: "Where they graduate" }, { id: "indicators", label: "Labour indicators" }, { id: "response", label: "How Fursah responds" }, { id: "vision-2030", label: "Vision 2030" }, { id: "sdgs", label: "The SDGs" }, { id: "sources", label: "Sources" }]} />

      <section className="imp-section" id="decade">
        <header>
          <span className="imp-kicker">A decade of growth</span>
          <h2>Annual graduates, then and now</h2>
          <p>Saudi universities now produce well over twice the graduates they did in the middle of the last decade. The 2023 total counts every level the Council of Universities Affairs reports: bachelor&apos;s, diplomas, master&apos;s and doctorates.</p>
        </header>
        <div className="imp-panel">
          {bars.map((stat) => <div className="imp-row" key={stat.id}>
            <span>{stat.period}</span>
            <div className="imp-track"><i style={{ width: `${Math.round((stat.value / peak) * 100)}%` }} /></div>
            <b>{stat.display}</b>
          </div>)}
          <p className="imp-foot">{graduateTrend.latest.note}</p>
        </div>
        <div className="imp-aside">
          <div className="imp-quote">
            <b>{enrolment[1]?.display}</b>
            <span>students enrolled in tertiary education in {enrolment[1]?.period}, up from {enrolment[0]?.display} in {enrolment[0]?.period}, the intake behind the graduate numbers above.</span>
          </div>
        </div>
      </section>

      <section className="imp-section" id="fields">
        <header>
          <span className="imp-kicker">Where they graduate</span>
          <h2>The mix shifted faster than the total</h2>
          <p>Volume is the less interesting half of the story. Between {fieldMixSource.period} the share of graduates by field moved sharply. Business administration alone went from a small minority to a third of all graduates. A national system can expand and still leave specific employer demand unmet.</p>
        </header>
        <div className="imp-panel">
          {fieldMix.map((f) => <div className="imp-field" key={f.field}>
            <span>{f.field}</span>
            <div className="imp-field-bars">
              <div className="imp-track thin"><i className="from" style={{ width: `${(f.from / 34) * 100}%` }} /></div>
              <div className="imp-track thin"><i style={{ width: `${(f.to / 34) * 100}%` }} /></div>
            </div>
            <b>{f.from}% <em>→</em> {f.to}%</b>
          </div>)}
          <p className="imp-foot">Share of all graduates by field. Source: {fieldMixSource.source}.</p>
        </div>
      </section>

      <section className="imp-section" id="indicators">
        <header>
          <span className="imp-kicker">Labour indicators</span>
          <h2>The reforms worked. The matching layer is what is left.</h2>
          <p>Both headline labour targets in Vision 2030 have already been met or passed. That is precisely why a platform like this one addresses matching quality rather than aggregate participation.</p>
        </header>
        <div className="imp-indicators">
          {indicatorPairs.map((pair) => <article className="imp-indicator" key={pair.id}>
            <h3>{pair.label}</h3>
            <div className="imp-delta">
              <span><b>{pair.from.display}</b><small>{pair.from.period}</small></span>
              <i aria-hidden>→</i>
              <span className="to"><b>{pair.to.display}</b><small>{pair.to.period}</small></span>
            </div>
            <p className="imp-target">{pair.target}</p>
            {pair.to.note && <p className="imp-foot">{pair.to.note}</p>}
          </article>)}
        </div>
      </section>

      <section className="imp-section" id="response">
        <header>
          <span className="imp-kicker">The response</span>
          <h2>From national statistic to individual action</h2>
        </header>
        <div className="imp-three">
          <article><span className="imp-num">01</span><h3>For students</h3><p>A readiness score that names the missing skill rather than issuing a rank, backed by evidence the student owns and controls.</p></article>
          <article><span className="imp-num">02</span><h3>For employers</h3><p>Candidates ranked on evidenced capability, each with a reasoning card explaining why the match was made.</p></article>
          <article><span className="imp-num">03</span><h3>For universities</h3><p>Curriculum alignment measured against live employer demand, so course revision can respond within a term rather than a cycle.</p></article>
        </div>
      </section>

      <section className="imp-section" id="vision-2030">
        <header>
          <span className="imp-kicker">Saudi Vision 2030</span>
          <h2>Where this project sits in national strategy</h2>
        </header>
        <div className="imp-vision">
          {visionAlignment.map((item) => <article key={item.program}>
            <div><h3>{item.program}</h3><p>{item.commitment}</p></div>
            <div className="imp-vision-link"><span className="imp-kicker">Fursah&apos;s contribution</span><p>{item.fursah}</p></div>
          </article>)}
        </div>
      </section>

      <section className="imp-section" id="sdgs">
        <header>
          <span className="imp-kicker">United Nations</span>
          <h2>Sustainable Development Goal alignment</h2>
          <p>Each entry cites the numbered target rather than the goal alone, so the contribution can be assessed against the published indicator.</p>
        </header>
        <div className="imp-sdgs">
          {sdgAlignment.map((sdg) => <article className="imp-sdg" key={sdg.target} style={{ ["--sdg" as string]: SDG_COLOR[sdg.goal] ?? "#2563eb" }}>
            <div className="imp-sdg-head">
              <span className="imp-goal">{sdg.goal}</span>
              <div><b>{sdg.title}</b><small>Target {sdg.target}</small></div>
            </div>
            <blockquote>{sdg.targetText}</blockquote>
            <p>{sdg.fursah}</p>
          </article>)}
        </div>
      </section>

      <section className="imp-section" id="sources">
        <header>
          <span className="imp-kicker">Evidence base</span>
          <h2>Sources</h2>
          <p>Every figure on this page is attributed to its publisher and dated. Figures were last checked in {CHECKED}.</p>
        </header>
        <div className="imp-sources">
          {referenceSources.map((source) => <div className="imp-source" key={source.url}>
            <div><b>{source.name}</b><span>{source.use}</span></div>
            <a href={source.url} target="_blank" rel="noreferrer">Open ↗</a>
          </div>)}
        </div>
        <p className="imp-foot" style={{ marginTop: 18 }}>Where an authority&apos;s figure was published through a news outlet rather than a downloadable bulletin, both are named above so the chain can be followed back to the original.</p>
      </section>

      <section className="imp-end">
        <h2>See the platform behind the argument.</h2>
        <p>The prototype implements the readiness scoring, explainable matching and curriculum alignment described on this page.</p>
        <div><Link href="/login/demo">Explore the prototype</Link><Link href="/workforce-intelligence" className="secondary">View workforce intelligence</Link></div>
      </section>
    </div>
  </main>;
}
