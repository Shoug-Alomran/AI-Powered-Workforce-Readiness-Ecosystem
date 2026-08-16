import type { Metadata } from "next";
import PageToc from "@/components/PageToc";
import { allStats, formatStat, graduateGrowthPercent, graduateTrend, labourIndicators, referenceSources, sdgAlignment, unverifiedCount, visionAlignment } from "@/lib/nationalImpact";

export const metadata: Metadata = {
  title: "National Impact — Vision 2030 and the SDGs | Fursah",
  description: "Why Fursah exists: the growth in Saudi graduate numbers over the last decade, the skills gap it exposed, and how the platform aligns with Saudi Vision 2030 and the UN Sustainable Development Goals.",
};

const pairs = [
  { label: "Saudi unemployment rate", earlier: labourIndicators[0], latest: labourIndicators[1] },
  { label: "Female labour force participation", earlier: labourIndicators[2], latest: labourIndicators[3] },
];

export default function ImpactPage() {
  const growth = graduateGrowthPercent();
  const peak = Math.max(graduateTrend.earlier.value, graduateTrend.latest.value);
  return <main className="page-shell">
    <span className="eyebrow">National context</span>
    <h1 className="page-title">Why Fursah exists</h1>
    <p className="muted" style={{ maxWidth: 760 }}>Saudi Arabia does not have a shortage of graduates. It has a gap between what graduates can prove and what employers can find. This page sets out the evidence for that claim, and shows how the platform maps onto Saudi Vision 2030 and the UN Sustainable Development Goals.</p>

    {unverifiedCount > 0 && <div className="notice" style={{ marginTop: 22, background: "#fff6e8", borderColor: "#f0d9ae", color: "#7a5314" }}><strong>{unverifiedCount} figures on this page are unverified placeholders.</strong> Each one is marked below. Replace it with the exact published figure from the linked source before submission — see the verification contract in <code>src/lib/nationalImpact.ts</code>.</div>}

    <PageToc items={[{ id: "the-gap", label: "The gap" }, { id: "decade", label: "A decade of growth" }, { id: "indicators", label: "Labour indicators" }, { id: "how-fursah-responds", label: "How Fursah responds" }, { id: "vision-2030", label: "Vision 2030" }, { id: "sdgs", label: "The SDGs" }, { id: "sources", label: "Sources" }]} />

    <section className="card" id="the-gap" style={{ marginTop: 26, scrollMarginTop: 80 }}>
      <span className="eyebrow">The problem</span>
      <h2>Volume grew. Matching did not.</h2>
      <p className="muted">Over the past decade Saudi universities expanded output substantially, and participation widened across the population. That expansion was a national success. But hiring did not scale with it: employers still assess candidates through credentials and interviews that reveal little about demonstrated skill, while universities receive labour-market feedback slowly, through annual statistical releases rather than live demand.</p>
      <p className="muted">The result is a matching problem rather than a supply problem. Graduates hold capabilities they cannot evidence; employers hold vacancies they cannot fill confidently; institutions revise curricula against signals that are already out of date. Fursah is built to close that loop.</p>
    </section>

    <section className="card" id="decade" style={{ marginTop: 18, scrollMarginTop: 80 }}>
      <span className="eyebrow">A decade of growth</span>
      <h2>Higher-education graduates, {graduateTrend.earlier.year} compared with {graduateTrend.latest.year}</h2>
      <div className="grid-3" style={{ marginTop: 18 }}>
        <div><span className="muted">{graduateTrend.earlier.year}</span><div className="metric">{formatStat(graduateTrend.earlier)}</div><span className="muted">graduates</span></div>
        <div><span className="muted">{graduateTrend.latest.year}</span><div className="metric">{formatStat(graduateTrend.latest)}</div><span className="muted">graduates</span></div>
        <div><span className="muted">Change</span><div className="metric">+{growth}%</div><span className="pill">Over {graduateTrend.latest.year - graduateTrend.earlier.year} years</span></div>
      </div>
      <div style={{ marginTop: 24 }}>
        {[graduateTrend.earlier, graduateTrend.latest].map((stat) => <div key={stat.id} style={{ marginTop: 16 }}>
          <div className="data-row"><strong>{stat.year}</strong><b>{formatStat(stat)}</b></div>
          <div className="bar"><i style={{ width: `${Math.round((stat.value / peak) * 100)}%` }} /></div>
          <small className="muted">{stat.source}{stat.status === "TODO_VERIFY" && " — figure not yet verified"}</small>
        </div>)}
      </div>
      <p className="muted" style={{ marginTop: 20 }}>The comparison that matters for this project is not the headline total but the distribution across fields of study. When graduate output by discipline is set against employer demand by skill, the mismatch becomes visible and, more importantly, addressable at the level of individual courses.</p>
    </section>

    <section className="card" id="indicators" style={{ marginTop: 18, scrollMarginTop: 80 }}>
      <span className="eyebrow">Labour indicators</span>
      <h2>The wider picture</h2>
      <div className="grid-2" style={{ marginTop: 18, alignItems: "start" }}>
        {pairs.map((pair) => <div key={pair.label}>
          <strong>{pair.label}</strong>
          <div className="data-row"><span>{pair.earlier.year}</span><b>{formatStat(pair.earlier)}</b></div>
          <div className="data-row"><span>{pair.latest.year}</span><b>{formatStat(pair.latest)}</b></div>
          {pair.latest.note && <small className="muted">{pair.latest.note}</small>}
        </div>)}
      </div>
      <div className="notice" style={{ marginTop: 20 }}>These indicators moved in the right direction, which is precisely the point: national reform worked at the aggregate level, and the remaining friction sits at the level of the individual match between a graduate and a role. That is the layer Fursah operates on.</div>
    </section>

    <section className="card" id="how-fursah-responds" style={{ marginTop: 18, scrollMarginTop: 80 }}>
      <span className="eyebrow">The response</span>
      <h2>From national statistic to individual action</h2>
      <div className="grid-3" style={{ marginTop: 18 }}>
        <div><strong>For students</strong><p className="muted">A readiness score that names the missing skill, not just a rank, plus verifiable evidence a student owns and controls.</p></div>
        <div><strong>For employers</strong><p className="muted">Candidates ranked on evidenced capability, each with a reasoning card explaining why the match was made.</p></div>
        <div><strong>For universities</strong><p className="muted">Curriculum alignment measured against live employer demand, so course revision responds to the market within a term rather than a cycle.</p></div>
      </div>
    </section>

    <section className="card" id="vision-2030" style={{ marginTop: 18, scrollMarginTop: 80 }}>
      <span className="eyebrow">Saudi Vision 2030</span>
      <h2>Where this project sits in national strategy</h2>
      {visionAlignment.map((item) => <div key={item.program} style={{ marginTop: 18 }}>
        <strong>{item.program}</strong>
        <p className="muted" style={{ marginTop: 6 }}>{item.commitment}</p>
        <div className="notice" style={{ marginTop: 8 }}>{item.fursah}</div>
      </div>)}
    </section>

    <section className="card" id="sdgs" style={{ marginTop: 18, scrollMarginTop: 80 }}>
      <span className="eyebrow">United Nations SDGs</span>
      <h2>Sustainable Development Goal alignment</h2>
      <p className="muted">Each entry cites the specific numbered target rather than the goal alone, so the contribution can be assessed against published indicators.</p>
      <div className="stack" style={{ marginTop: 18 }}>
        {sdgAlignment.map((sdg) => <article className="card" key={sdg.target}>
          <div className="data-row"><strong>SDG {sdg.goal} — {sdg.title}</strong><span className="pill">Target {sdg.target}</span></div>
          <p className="muted" style={{ marginTop: 10 }}>{sdg.targetText}</p>
          <p style={{ marginTop: 10 }}>{sdg.fursah}</p>
        </article>)}
      </div>
    </section>

    <section className="card" id="sources" style={{ marginTop: 18, scrollMarginTop: 80 }}>
      <span className="eyebrow">Evidence base</span>
      <h2>Sources</h2>
      {referenceSources.map((source) => <div className="data-row" key={source.url}>
        <div><strong>{source.name}</strong><div className="muted">{source.use}</div></div>
        <a className="link" href={source.url} target="_blank" rel="noreferrer">Open</a>
      </div>)}
      <p className="muted" style={{ marginTop: 18 }}>Statistics on this page are attributed to their publisher and dated. {unverifiedCount > 0 ? `${unverifiedCount} of ${allStats.length} figures are still placeholders pending confirmation against the published bulletins.` : "All figures have been checked against the published bulletins."}</p>
    </section>
  </main>;
}
