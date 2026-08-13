import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUniversity } from "@/lib/session";
import { getAllCareerTracksAsync } from "@/lib/careerTracks.server";
import PageToc from "@/components/PageToc";

type DemandSignal = {
  name: string;
  roles: Set<string>;
  employers: Set<string>;
  essentialJobs: number;
  preferredJobs: number;
  demandPoints: number;
};

async function currentTimestamp() {
  return Date.now();
}

export default async function UniversityDashboard({ searchParams }: { searchParams: Promise<{ q?: string; track?: string }> }) {
  const ctx = await getCurrentUniversity();
  if (!ctx) redirect("/login");
  const query = await searchParams;
  const q = (query.q ?? "").trim().toLowerCase();
  const track = (query.track ?? "").trim();

  const [students, allJobs, offerings, tracks] = await Promise.all([
    prisma.student.findMany({
      where: { university: ctx.university.institution },
      include: { skills: { include: { skill: true } } },
    }),
    prisma.job.findMany({
      where: { status: "open" },
      include: { employer: true, requiredSkills: { include: { skill: true } }, requiredCerts: { include: { certification: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.offering.findMany({ where: { universityId: ctx.university.id }, include: { skills: { include: { skill: true } }, certification: true } }),
    getAllCareerTracksAsync(),
  ]);

  const trackOptions = [...new Set(allJobs.map((job) => job.careerTrack))].sort();
  const jobs = allJobs.filter(
    (job) =>
      (!track || job.careerTrack === track) &&
      (!q || `${job.title} ${job.employer.company} ${job.requiredSkills.map((s) => s.skill.name).join(" ")}`.toLowerCase().includes(q)),
  );

  const trackById = new Map(tracks.map((t) => [t.id, t]));

  // --- demand signal per skill, aggregated from live open roles ---
  const signals = new Map<string, DemandSignal>();
  for (const job of jobs) {
    for (const requirement of job.requiredSkills) {
      const current = signals.get(requirement.skill.name) ?? { name: requirement.skill.name, roles: new Set(), employers: new Set(), essentialJobs: 0, preferredJobs: 0, demandPoints: 0 };
      current.roles.add(job.title);
      current.employers.add(job.employer.company);
      current.demandPoints += requirement.weight;
      if (requirement.requirementType === "PREFERRED") current.preferredJobs += 1;
      else current.essentialJobs += 1;
      signals.set(current.name, current);
    }
  }
  const topDemand = [...signals.values()].sort((a, b) => b.demandPoints - a.demandPoints).slice(0, 8);
  const maxDemand = topDemand[0]?.demandPoints ?? 1;

  const hideCoverage = students.length < 20;
  const cohortCoverage = (skill: string) =>
    hideCoverage ? null : Math.round((students.filter((student) => student.skills.some((s) => s.skill.name === skill && s.level >= 3)).length / students.length) * 100);
  const offeringFor = (skill: string) => offerings.find((offering) => offering.skills.some((s) => s.skill.name === skill));

  const withCoverage = topDemand.map((signal) => ({ ...signal, coverage: cohortCoverage(signal.name) }));

  const employersAnalyzed = new Set(jobs.map((job) => job.employerId)).size;
  const avgExperienceMonths = jobs.length ? jobs.reduce((sum, job) => sum + job.minExperience, 0) / jobs.length : 0;
  const avgExperienceYears = (avgExperienceMonths / 12).toFixed(1);

  const withKnownCoverage = withCoverage.filter((s) => s.coverage !== null) as (DemandSignal & { coverage: number })[];
  const alignmentScore = withKnownCoverage.length ? Math.round(withKnownCoverage.reduce((sum, s) => sum + s.coverage, 0) / withKnownCoverage.length) : null;
  const emergingSkill = withKnownCoverage.length ? [...withKnownCoverage].sort((a, b) => a.coverage - b.coverage)[0] : topDemand[0];

  const latestJobDate = jobs.length ? jobs.reduce((latest, job) => (job.createdAt > latest ? job.createdAt : latest), jobs[0].createdAt) : null;
  const renderedAt = await currentTimestamp();
  const hoursAgo = latestJobDate ? Math.max(0, Math.round((renderedAt - latestJobDate.getTime()) / 3_600_000)) : null;

  // --- curriculum gap analysis: top-demand skills with weakest cohort coverage ---
  const gapList = withKnownCoverage
    .filter((s) => s.coverage < 70)
    .sort((a, b) => a.coverage - b.coverage)
    .slice(0, 5)
    .map((signal) => {
      const offering = offeringFor(signal.name);
      const gapPct = 100 - signal.coverage;
      const studentsAffected = students.filter((student) => !student.skills.some((s) => s.skill.name === signal.name && s.level >= 3)).length;
      const hireabilityLift = Math.min(25, Math.round(gapPct / 4));
      return {
        signal,
        gapPct,
        offering,
        studentsAffected,
        hireabilityLift,
        suggestedAction: offering ? `Expand ${signal.name} coverage in ${offering.title}.` : `Add an applied ${signal.name} module to the curriculum.`,
      };
    });
  const highPriorityGaps = gapList.filter((g) => g.gapPct >= 50).length;

  const badgeFor = (coverage: number | null) => {
    if (coverage === null) return { label: "New signal", className: "uni-badge--new" };
    if (coverage < 35) return { label: "Critical gap", className: "uni-badge--critical" };
    if (coverage < 65) return { label: "High demand", className: "uni-badge--high" };
    return { label: "Well covered", className: "uni-badge--covered" };
  };

  // --- employer demand breakdown ---
  const employerCounts = new Map<string, { company: string; count: number }>();
  jobs.forEach((job) => {
    const current = employerCounts.get(job.employerId) ?? { company: job.employer.company, count: 0 };
    current.count += 1;
    employerCounts.set(job.employerId, current);
  });
  const topEmployers = [...employerCounts.values()].sort((a, b) => b.count - a.count).slice(0, 4);

  const industryCounts = new Map<string, number>();
  jobs.forEach((job) => {
    const key = job.employer.industry || "Unspecified";
    industryCounts.set(key, (industryCounts.get(key) ?? 0) + 1);
  });
  const industries = [...industryCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name, count]) => ({ name, pct: jobs.length ? Math.round((count / jobs.length) * 100) : 0 }));
  const blindReviewPct = jobs.length ? Math.round((jobs.filter((job) => job.blindReview).length / jobs.length) * 100) : 0;

  // --- career track demand, from cohort aspirations ---
  const tracksCount = new Map<string, number>();
  students.forEach((student) => tracksCount.set(student.targetCareer, (tracksCount.get(student.targetCareer) ?? 0) + 1));
  const trackDemand = [...tracksCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([id, count]) => ({ label: (trackById.get(id) ?? tracks[0])?.label ?? id, count }));
  const maxTrackCount = trackDemand[0]?.count ?? 1;

  // --- AI action center: highest-priority action, recommended certification, watchlist ---
  const topGap = gapList[0];
  const certificationDemand = new Map<string, number>();
  jobs.forEach((job) => job.requiredCerts.forEach((cert) => certificationDemand.set(cert.certification.name, (certificationDemand.get(cert.certification.name) ?? 0) + 1)));
  const rankedCerts = [...certificationDemand.entries()].sort((a, b) => b[1] - a[1]);
  const topCert = rankedCerts.find(([name]) => !offerings.some((o) => o.certification?.name === name)) ?? rankedCerts[0];
  const watchlist = topDemand.slice(3, 6);
  const forecastScore = alignmentScore !== null && gapList.length ? Math.min(100, alignmentScore + Math.round(gapList.reduce((sum, g) => sum + g.gapPct, 0) / gapList.length / 4)) : alignmentScore;

  return (
    <main className="uni-dashboard">
      <div className="uni-dashboard__inner">
        <header className="uni-header">
          <div>
            <span className="uni-kicker">Workforce demand intelligence</span>
            <h1>{ctx.university.institution}</h1>
            <div className="uni-meta">
              <span>📍 {ctx.university.region ?? "Region not set"}</span>
              <span>🕒 Data freshness: {hoursAgo === null ? "no postings yet" : `${hoursAgo}h ago`}</span>
              <span>🏢 {employersAnalyzed} employers analyzed</span>
              <span>💼 {jobs.length} active postings</span>
            </div>
          </div>
          <div className="uni-actions">
            <Link className="button primary" href="/university/actions">Open action plan</Link>
            <a className="button secondary" href="/api/university/export">Generate report</a>
          </div>
        </header>

        <div className="uni-summary">
          <div>
            <strong>✦ AI executive summary</strong>
            <p>
              {topDemand[0] ? `${topDemand[0].name} leads employer demand across ${topDemand[0].employers.size} organization(s), ` : "No open-role demand signal is available yet. "}
              {alignmentScore === null
                ? "Cohort coverage is hidden until this university reaches the 20-student privacy threshold."
                : `curriculum coverage of top-demand skills currently sits at ${alignmentScore}%, with ${highPriorityGaps} high-priority gap(s) to close.`}
            </p>
          </div>
        </div>

        <PageToc
          items={[
            { id: "skill-intelligence", label: "Skill intelligence" },
            { id: "curriculum-gaps", label: "Curriculum gaps" },
            { id: "employer-demand", label: "Employer demand" },
            { id: "governance", label: "Governance" },
          ]}
        />

        <section className="uni-metrics" aria-label="Workforce intelligence overview">
          <div className="uni-metric"><span>Active postings</span><strong>{jobs.length}</strong></div>
          <div className="uni-metric"><span>Employers</span><strong>{employersAnalyzed}</strong></div>
          <div className="uni-metric"><span>Career tracks</span><strong>{tracks.length}</strong></div>
          <div className="uni-metric"><span>Avg experience</span><strong>{avgExperienceYears}y</strong></div>
          <div className="uni-metric"><span>Top emerging skill</span><strong style={{ fontSize: 18 }}>{emergingSkill?.name ?? "—"}</strong></div>
          <div className="uni-metric"><span>Alignment score</span><strong>{alignmentScore === null ? "—" : `${alignmentScore}%`}</strong>{hideCoverage && <small>Hidden — cohort below 20</small>}</div>
        </section>

        <form className="uni-filterbar">
          <span className="uni-chip">{ctx.university.region ?? "All regions"}</span>
          <label>Search
            <input className="input" name="q" defaultValue={query.q ?? ""} placeholder="Skill, role, employer…" />
          </label>
          <label>Career track
            <select className="input" name="track" defaultValue={track}>
              <option value="">All career tracks</option>
              {trackOptions.map((value) => <option value={value} key={value}>{value.replaceAll("-", " ")}</option>)}
            </select>
          </label>
          <button className="button primary" type="submit">Apply filters</button>
          <Link className="button secondary" href="/university/dashboard">Clear</Link>
        </form>

        <div className="uni-layout">
          <div className="uni-main">
            <section id="skill-intelligence" style={{ scrollMarginTop: 80 }}>
              <div className="uni-section-head"><h2>Skill intelligence</h2></div>
              <div className="uni-skill-grid">
                {withCoverage.slice(0, 3).map((signal) => {
                  const badge = badgeFor(signal.coverage);
                  const demandScore = Math.round((signal.demandPoints / maxDemand) * 100);
                  const employerReach = employersAnalyzed ? Math.round((signal.employers.size / employersAnalyzed) * 100) : 0;
                  return (
                    <article className="uni-skill-card" key={signal.name}>
                      <div className="uni-skill-card__top">
                        <div><h3>{signal.name}</h3><span className="uni-skill-card__tags">{[...signal.roles].slice(0, 2).join(", ") || "No mapped role"}</span></div>
                        <span className={`uni-badge ${badge.className}`}>{badge.label}</span>
                      </div>
                      <div className="uni-skill-card__stats"><span>Demand score<b>{demandScore}/100</b></span></div>
                      <div className="bar"><i style={{ width: `${demandScore}%` }} /></div>
                      <div className="uni-skill-card__stats">
                        <span>Employer reach<b>{employerReach}%</b></span>
                        <span>Open jobs<b>{signal.essentialJobs + signal.preferredJobs}</b></span>
                      </div>
                      <div className="uni-skill-card__foot">
                        <span>Univ coverage: {signal.coverage === null ? "hidden" : `${signal.coverage}%`}</span>
                        <Link className="link" href={`/university/actions?skill=${encodeURIComponent(signal.name)}&title=${encodeURIComponent(`Add an applied ${signal.name} module`)}`}>Update curriculum</Link>
                      </div>
                    </article>
                  );
                })}
                {!withCoverage.length && <div className="notice">No open-role skill demand matches the current filters.</div>}
              </div>
            </section>

            <section id="curriculum-gaps" style={{ scrollMarginTop: 80, marginTop: 36 }}>
              <div className="uni-section-head">
                <h2>Curriculum gap analysis</h2>
                <span className="uni-chip">Total gaps: {gapList.length} · High priority: {highPriorityGaps}</span>
              </div>
              <div className="uni-gap-list">
                {gapList.map((gap) => (
                  <div className="uni-gap-row" key={gap.signal.name}>
                    <div>
                      <h3>{gap.signal.name}</h3>
                      <p>Requested by {gap.signal.employers.size} employer(s) for {[...gap.signal.roles].slice(0, 3).join(", ")}.</p>
                      <div className="bar" style={{ marginTop: 10 }}><i style={{ width: `${gap.gapPct}%`, background: "#dc4b3f" }} /></div>
                      <span className="muted" style={{ fontSize: 12 }}>{gap.gapPct}% coverage deficit</span>
                    </div>
                    <div className="uni-gap-meta">
                      <span>Suggested action</span>
                      <b style={{ fontWeight: 600, fontSize: 13 }}>{gap.suggestedAction}</b>
                      <span style={{ marginTop: 10, display: "block" }}>Est. hireability lift</span>
                      <b>+{gap.hireabilityLift}%</b>
                      <span style={{ marginTop: 10, display: "block" }}>Students affected</span>
                      <b>{gap.studentsAffected}</b>
                    </div>
                    <Link className="button primary" href={`/university/actions?skill=${encodeURIComponent(gap.signal.name)}&title=${encodeURIComponent(gap.suggestedAction)}`}>Apply recommendation</Link>
                  </div>
                ))}
                {!gapList.length && (
                  <div className="notice">
                    {hideCoverage ? "Cohort coverage is hidden until this university reaches the 20-student privacy threshold." : "The current cohort covers the strongest skills represented in live job demand."}
                  </div>
                )}
              </div>
            </section>

            <section id="employer-demand" style={{ scrollMarginTop: 80, marginTop: 36 }}>
              <div className="uni-bottom-grid">
                <div className="uni-panel">
                  <span className="eyebrow">Employer demand breakdown</span>
                  <h2 style={{ margin: "8px 0 16px" }}>Top hiring companies</h2>
                  {topEmployers.length ? topEmployers.map((employer) => (
                    <div className="uni-employer-row" key={employer.company}><span>{employer.company}</span><b>{employer.count} open role(s)</b></div>
                  )) : <div className="notice">No open roles match the current filters.</div>}
                  <h2 style={{ margin: "22px 0 12px", fontSize: 16 }}>Sector demand</h2>
                  {industries.map((industry) => (
                    <div key={industry.name} style={{ marginTop: 10 }}>
                      <div className="data-row"><span>{industry.name}</span><b>{industry.pct}%</b></div>
                      <div className="bar"><i style={{ width: `${industry.pct}%` }} /></div>
                    </div>
                  ))}
                  <div className="uni-metric" style={{ marginTop: 18 }}><span>Blind-review roles</span><strong>{blindReviewPct}%</strong><small>Screened without identifying details</small></div>
                </div>
                <div className="uni-panel">
                  <span className="eyebrow">Career pathways</span>
                  <h2 style={{ margin: "8px 0 16px" }}>Career track demand</h2>
                  {trackDemand.length ? trackDemand.map((item) => (
                    <div key={item.label} style={{ marginTop: 12 }}>
                      <div className="data-row"><span>{item.label}</span><b>{item.count} learner(s)</b></div>
                      <div className="bar"><i style={{ width: `${Math.round((item.count / maxTrackCount) * 100)}%` }} /></div>
                    </div>
                  )) : <div className="notice">No cohort aspirations recorded yet.</div>}
                </div>
              </div>
            </section>

            <section id="governance" className="uni-panel" style={{ scrollMarginTop: 80, marginTop: 36 }}>
              <span className="eyebrow">Governance</span>
              <h2 style={{ margin: "8px 0 12px" }}>Privacy-preserving by design</h2>
              <p className="muted">This account sees institutional aggregates rather than individual student identities. Coverage figures are suppressed for cohorts under 20 students.</p>
              <div className="notice">Recommendations support program review; faculty and governance teams make final curriculum decisions. CSV export contains aggregates only — no individual student data leaves this view.</div>
            </section>
          </div>

          <aside className="uni-aside">
            <div className="uni-sidebar-card uni-sidebar-card--priority">
              <span className="uni-sidebar-kicker">⚡ AI action center</span>
              <span className="muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".06em" }}>Highest priority</span>
              {topGap ? (
                <>
                  <h4 style={{ marginTop: 8 }}>{topGap.suggestedAction}</h4>
                  <p>{topGap.signal.name} coverage deficit is {topGap.gapPct}% against live employer demand.</p>
                  <div className="data-row" style={{ marginTop: 10, padding: 0, border: 0 }}>
                    <span style={{ color: "#0d8a4f", fontSize: 12, fontWeight: 700 }}>+{topGap.hireabilityLift}% est. lift</span>
                    <Link className="link" href={`/university/actions?skill=${encodeURIComponent(topGap.signal.name)}&title=${encodeURIComponent(topGap.suggestedAction)}`}>Start revision →</Link>
                  </div>
                </>
              ) : <p style={{ marginTop: 8 }}>No high-priority gaps detected for the current filters.</p>}
            </div>

            <div className="uni-sidebar-card">
              <span className="uni-sidebar-kicker">Recommended certification</span>
              {topCert ? (
                <>
                  <h4>{topCert[0]}</h4>
                  <p>{topCert[1]} employer role(s) request this credential.</p>
                  <Link className="button primary" style={{ marginTop: 10, width: "100%", justifyContent: "center" }} href={`/university/actions?skill=${encodeURIComponent(topCert[0])}&title=${encodeURIComponent(`Add preparation pathway for ${topCert[0]}`)}`}>Add to plan</Link>
                </>
              ) : <p>No certification demand detected yet.</p>}
            </div>

            <div className="uni-sidebar-card">
              <span className="uni-sidebar-kicker">Emerging skills to watch</span>
              {watchlist.length ? watchlist.map((skill) => (
                <div className="uni-watch-row" key={skill.name}><span>{skill.name}</span><b>{skill.employers.size} employer(s)</b></div>
              )) : <p>No additional demand signal beyond the top skills above.</p>}
            </div>

            <div className="uni-forecast">
              <span className="uni-sidebar-kicker" style={{ color: "#8fb0ff" }}>Alignment improvement forecast</span>
              <strong>{forecastScore === null ? "—" : `${forecastScore}%`}</strong>
              <span style={{ fontSize: 12, color: "#a8beb6" }}>Projected if the highest-priority actions above are completed</span>
              {forecastScore !== null && <div className="bar"><i style={{ width: `${forecastScore}%` }} /></div>}
            </div>

            <div className="uni-sidebar-card">
              <span className="uni-sidebar-kicker">Suggested industry partners</span>
              {topEmployers.length ? topEmployers.slice(0, 2).map((employer) => (
                <div className="uni-watch-row" key={employer.company}><span>{employer.company}</span><b>{employer.count} role(s)</b></div>
              )) : <p>No employer activity yet.</p>}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
