import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUniversity } from "@/lib/session";
import { getUniversityIntelligence } from "@/lib/intelligence";
import { MIN_COHORT } from "@/lib/cohort";
import Ic from "@/components/Ic";
import FursahAssistant from "@/components/FursahAssistant";
import ActionQueue from "@/components/ActionQueue";
import { assistantConfigured } from "@/lib/assistant/llm";

/** Renders a figure the database can support, or an explicit unknown state. */
function value(input: number | string | null, suffix = "") {
  if (input === null) return "Not available";
  return `${input}${suffix}`;
}

export default async function UniversityDashboard() {
  const ctx = await getCurrentUniversity();
  if (!ctx) redirect("/login");

  const [intelligence, cohortApplications] = await Promise.all([
    getUniversityIntelligence(ctx.university.id),
    // Outcomes for students who list this institution, aggregated only.
    prisma.application.findMany({
      where: { student: { university: ctx.university.institution } },
      include: { job: { include: { employer: true } } },
    }),
  ]);

  const { cohort } = intelligence;

  const hires = cohortApplications.filter((application) => application.status === "hired");
  const shortlisted = cohortApplications.filter((application) =>
    ["shortlisted", "hired"].includes(application.status),
  );

  const hiringCompanies = [...
    hires.reduce((map, application) => {
      const company = application.job.employer.company;
      map.set(company, (map.get(company) ?? 0) + 1);
      return map;
    }, new Map<string, number>())]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const industryDistribution = [...
    hires.reduce((map, application) => {
      const industry = application.job.employer.industry ?? "Not stated";
      map.set(industry, (map.get(industry) ?? 0) + 1);
      return map;
    }, new Map<string, number>())]
    .map(([industry, count]) => ({ industry, count, sharePct: Math.round((count / Math.max(1, hires.length)) * 100) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  const topDemand = intelligence.coveredSkills.slice(0, 6);
  const nextActions = [
    ...(intelligence.gaps.length > 0 ? [{ title: `Assign an owner to the top curriculum gap`, reason: `${intelligence.gaps[0].skillName} is requested by employers but is not sufficiently covered by published offerings.`, href: "/university/actions/new", action: "Create intervention", priority: "high" as const, meta: `${intelligence.gaps.length} uncovered skill${intelligence.gaps.length === 1 ? "" : "s"}` }] : []),
    ...(intelligence.curriculumActionCount > intelligence.completedCurriculumActionCount ? [{ title: "Review active curriculum interventions", reason: `${intelligence.curriculumActionCount - intelligence.completedCurriculumActionCount} initiative(s) have not reached verified completion.`, href: "/university/actions", action: "Open action register", priority: "medium" as const, meta: "Evidence required at completion" }] : []),
    ...(!cohort.reportable ? [{ title: "Increase reportable evidence coverage", reason: `Cohort intelligence remains suppressed until at least ${MIN_COHORT} eligible student records are available.`, href: "/university/student-readiness", action: "Inspect data coverage", priority: "medium" as const, meta: "Privacy floor remains enforced" }] : []),
  ].slice(0, 3);

  const metrics: Array<[string, string, string, string]> = [
    [
      "Students analysed",
      value(cohort.reportable ? cohort.students : null),
      cohort.reportable ? "listing this institution" : `withheld below ${MIN_COHORT}`,
      `Platform career tracks: ${intelligence.requestedSkillCount > 0 ? "configured" : "not configured"}`,
    ],
    [
      "Avg career readiness",
      value(cohort.averageScore, "/100"),
      cohort.reportable ? `median ${cohort.medianScore}/100` : "cohort too small to report",
      "Same calculation students see",
    ],
    [
      "Career ready share",
      value(cohort.reportable ? cohort.bands.find((band) => band.label === "Career Ready")?.sharePct ?? 0 : null, "%"),
      "scoring 80 or above",
      "Aggregate only",
    ],
    [
      "Open roles tracked",
      String(intelligence.openRoleCount),
      `${intelligence.requestedSkillCount} distinct skills requested`,
      "From verified employers",
    ],
    [
      "Offerings published",
      String(intelligence.offeringCount),
      `${intelligence.curriculumActionCount} curriculum initiative(s)`,
      `${intelligence.completedCurriculumActionCount} verified complete`,
    ],
    [
      "Placement outcomes",
      String(hires.length),
      `${shortlisted.length} shortlisted or hired`,
      `${cohortApplications.length} application(s) recorded`,
    ],
    [
      "Demand coverage",
      `${intelligence.weightedDemandCoverage}%`,
      "of weighted employer demand taught",
      intelligence.gaps.length > 0 ? `${intelligence.gaps.length} uncovered skill(s)` : "Fully covered",
    ],
  ];

  return (
    <main className="ud-page">
      <header className="ud-hero">
        <div className="ud-heading">
          <p>
            Institution　›　<b>{ctx.university.institution}</b>
          </p>
          <h1>University Workforce Intelligence Overview</h1>
          <div>
            <span>Model {intelligence.modelVersion}</span>
            <span>Generated {intelligence.generatedAt.toLocaleString()}</span>
            <span>
              Cohort:{" "}
              {cohort.reportable ? `${cohort.students} students` : `withheld below ${MIN_COHORT} students`}
            </span>
          </div>
        </div>
        <div className="ud-actions">
          <a href="/api/university/export">⇧ Export Report</a>
        </div>
        <section className="ud-summary">
          <span>✦</span>
          <div>
            <b>EXECUTIVE SUMMARY</b>
            {intelligence.executiveSummary.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </section>
      </header>

      <div className="ud-content">
        <ActionQueue eyebrow="INSTITUTIONAL ACTION QUEUE" title="Interventions requiring ownership" items={nextActions}/>
        <nav className="ud-toc" aria-label="Dashboard sections">
          <span>
            <b>EXPLORE DASHBOARD</b>
            <small>Jump directly to a section</small>
          </span>
          <a className="current" href="#dashboard-overview">
            Overview
          </a>
          <a href="#workforce-demand">Demand</a>
          <a href="#curriculum-alignment">Curriculum Alignment</a>
          <a href="#graduate-outcomes">Outcomes</a>
          <a href="#career-pathways">Career Pathways</a>
        </nav>

        <section className="ud-metrics" id="dashboard-overview">
          {metrics.map(([label, figure, note, footnote], index) => (
            <article className={index === 6 && intelligence.gaps.length > 0 ? "critical" : ""} key={label}>
              <small>{label}</small>
              <strong>{figure}</strong>
              <p>{note}</p>
              <footer>{footnote}</footer>
            </article>
          ))}
        </section>

        <div className="ud-layout">
          <div className="ud-main">
            <section className="ud-panel ud-demand" id="workforce-demand">
              <header>
                <h2>Workforce Demand Analysis</h2>
                <div>
                  <span>{intelligence.openRoleCount} open role(s)</span>
                  <b>Live employer data</b>
                </div>
              </header>
              <div className="ud-table">
                <div className="head">
                  <b>SKILL / COMPETENCY</b>
                  <b>DEMAND</b>
                  <b>OPEN ROLES</b>
                  <b>COHORT GAP</b>
                  <b>COVERED BY</b>
                </div>
                {topDemand.length ? (
                  topDemand.map((skill) => (
                    <div className="row" key={skill.skillId}>
                      <strong>{skill.skillName}</strong>
                      <i>
                        <em
                          style={{
                            width: `${Math.round((skill.demandPoints / Math.max(1, topDemand[0].demandPoints)) * 100)}%`,
                          }}
                        />
                      </i>
                      <b className={skill.covered ? "" : "negative"}>{skill.openRoleCount}</b>
                      <span>
                        {skill.cohortMissingSharePct === null
                          ? "Withheld"
                          : `${skill.cohortMissingSharePct}% of cohort`}
                      </span>
                      <span>{skill.covered ? skill.offeringTitles.join(", ") : "No offering"}</span>
                    </div>
                  ))
                ) : (
                  <div className="row">
                    <strong>No open role currently lists a required skill.</strong>
                    <i />
                    <b>0</b>
                    <span>Not available</span>
                    <span>Not available</span>
                  </div>
                )}
              </div>
            </section>

            <section className="ud-panel ud-alignment" id="curriculum-alignment">
              <header>
                <h2>Curriculum Alignment Map</h2>
              </header>
              <div className="ud-alignment-body">
                <div className="ud-alignment-stats">
                  {[
                    ["Alignment score", `${intelligence.weightedDemandCoverage}%`],
                    ["Skills requested", String(intelligence.requestedSkillCount)],
                    ["Uncovered skills", String(intelligence.gaps.length)],
                    ["Compounded gaps", String(intelligence.compoundedGaps.length)],
                  ].map(([label, figure], index) => (
                    <div className={`s${index}`} key={label}>
                      <small>{label}</small>
                      <b>{figure}</b>
                    </div>
                  ))}
                </div>

                <h3>IDENTIFIED CURRICULUM GAPS</h3>
                {intelligence.recommendations.length ? (
                intelligence.recommendations.slice(0, 4).map((recommendation) => (
                    <article className="ud-gap-card" key={`${recommendation.type}-${recommendation.skillId}`}>
                      <header>
                        <div>
                          <small>{recommendation.type.replaceAll("_", " ")}</small>
                          <h4>{recommendation.skillName}</h4>
                          <p>{recommendation.reason}</p>
                        </div>
                        <span className={recommendation.priorityScore >= 40 ? "" : "medium"}>
                          Priority {Math.round(recommendation.priorityScore)}
                        </span>
                      </header>
                      <div>
                        <label>
                          Open roles requesting
                          <b>{recommendation.relatedOpenRoles}</b>
                        </label>
                        <label>
                          Cohort missing
                          <b>
                            {recommendation.cohortMissingSharePct === null
                              ? "Withheld"
                              : `${recommendation.cohortMissingSharePct}%`}
                          </b>
                        </label>
                        <label>
                          Existing initiative
                          <b>{recommendation.alreadyPlanned ? "Yes" : "None"}</b>
                        </label>
                      </div>
                      <aside>
                        <span>✦</span><p><strong>AI-supported recommendation.</strong> The institution decides whether to proceed. Fursah keeps the supporting evidence with the action plan.</p>
                      </aside>
                      <footer>
                        <Link href={recommendation.alreadyPlanned ? "/university/actions#initiative-tracker" : { pathname: "/university/actions/new", query: { source: "advisor", skill: recommendation.skillName, type: recommendation.type, priority: Math.round(recommendation.priorityScore), roles: recommendation.relatedOpenRoles, cohort: recommendation.cohortMissingSharePct ?? "withheld", reason: recommendation.reason } }}>{recommendation.alreadyPlanned ? "Review existing initiative" : "Prepare action plan"}</Link>
                      </footer>
                    </article>
                  ))
                ) : (
                  <article>
                    <header>
                      <div>
                        <b className="medium">No curriculum gap identified</b>
                        <p>
                          Every skill currently requested by an open role is mapped to at least one offering in this
                          catalogue.
                        </p>
                      </div>
                    </header>
                  </article>
                )}
              </div>
            </section>

            <section className="ud-panel ud-outcomes" id="graduate-outcomes">
              <header>
                <h2>Graduate Outcomes Performance</h2>
              </header>
              <div>
                <section>
                  <h3>INDUSTRY DISTRIBUTION OF HIRES</h3>
                  {industryDistribution.length ? (
                    industryDistribution.map((entry) => (
                      <label key={entry.industry}>
                        {entry.industry} <b>{entry.sharePct}%</b>
                        <i>
                          <em style={{ width: `${entry.sharePct}%` }} />
                        </i>
                      </label>
                    ))
                  ) : (
                    <p>No hire has been recorded for this institution&apos;s students yet.</p>
                  )}
                </section>
                <section>
                  <small>HIRING COMPANIES</small>
                  {hiringCompanies.length ? (
                    hiringCompanies.map(([company, count]) => (
                      <p key={company}>
                        {company}
                        <b>
                          {count} hire{count === 1 ? "" : "s"}
                        </b>
                      </p>
                    ))
                  ) : (
                    <p>No hiring outcome recorded yet.</p>
                  )}
                </section>
                <section>
                  <small>TIME TO EMPLOYMENT</small>
                  <strong>Not available</strong>
                  <span>Not recorded: the platform stores no employment start dates.</span>
                </section>
              </div>
            </section>

            <section className="ud-panel ud-pathways" id="career-pathways">
              <header>
                <h2>Student Career Pathways Analytics</h2>
                <span>{cohort.reportable ? `${cohort.tracks.length} track(s)` : "Withheld"}</span>
              </header>
              <div>
                {cohort.reportable && cohort.tracks.length ? (
                  cohort.tracks.slice(0, 3).map((track, index) => (
                    <article key={track.id}>
                      <header>
                        <i>◎</i>
                        <span className={`p${index}`}>
                          {track.suppressed
                            ? "Withheld"
                            : (track.averageScore ?? 0) >= 80
                              ? "Strong"
                              : (track.averageScore ?? 0) >= 55
                                ? "Developing"
                                : "Skill gap"}
                        </span>
                      </header>
                      <h3>{track.label}</h3>
                      {track.suppressed ? (
                        <>
                          <div>
                            <label>
                              Students<b>⊘</b>
                            </label>
                            <label>
                              Avg readiness<b>⊘</b>
                            </label>
                            <label>
                              Open roles
                              <b>{intelligence.coveredSkills.length > 0 ? intelligence.openRoleCount : 0}</b>
                            </label>
                            <label>
                              Top gap<b>⊘</b>
                            </label>
                          </div>
                          <footer>
                            Withheld: fewer than {MIN_COHORT} students target this track here.
                          </footer>
                        </>
                      ) : (
                        <>
                          <div>
                            <label>
                              Students<b>{track.students}</b>
                            </label>
                            <label>
                              Avg readiness<b>{track.averageScore}/100</b>
                            </label>
                            <label>
                              Open roles
                              <b>
                                {intelligence.coveredSkills.length > 0 ? intelligence.openRoleCount : 0}
                              </b>
                            </label>
                            <label>
                              Top gap<b>{track.topGap ?? "None shared"}</b>
                            </label>
                          </div>
                          <footer>
                            Most common gap {track.topGap ? <span>{track.topGap}</span> : <span>None</span>}
                          </footer>
                        </>
                      )}
                    </article>
                  ))
                ) : (
                  <article>
                    <h3>Cohort pathways withheld</h3>
                    <p>{cohort.summary}</p>
                  </article>
                )}
              </div>
            </section>
          </div>

          <aside className="ud-aside">
            <section className="ud-advisor">
              <header>
                <h2>♧ Curriculum Advisor</h2>
                <span>EVIDENCE-BASED</span>
              </header>
              {intelligence.recommendations.length ? (
                intelligence.recommendations.slice(0, 3).map((recommendation, index) => (
                  <article key={`advisor-${recommendation.type}-${recommendation.skillId}`}>
                    <small>{index === 0 ? "HIGHEST PRIORITY ACTION" : recommendation.type.replaceAll("_", " ")}</small>
                    <h3>{recommendation.skillName}</h3>
                    <p>{recommendation.reason}</p>
                    <div className="ud-advisor-evidence"><span>{recommendation.relatedOpenRoles} requesting role{recommendation.relatedOpenRoles === 1 ? "" : "s"}</span><span>{recommendation.cohortMissingSharePct === null ? "Cohort figure withheld" : `${recommendation.cohortMissingSharePct}% of cohort missing`}</span><span>Priority {Math.round(recommendation.priorityScore)}</span></div>
                    <Link className={index ? "outline" : ""} href={recommendation.alreadyPlanned ? "/university/actions#initiative-tracker" : { pathname: "/university/actions/new", query: { source: "advisor", skill: recommendation.skillName, type: recommendation.type, priority: Math.round(recommendation.priorityScore), roles: recommendation.relatedOpenRoles, cohort: recommendation.cohortMissingSharePct ?? "withheld", reason: recommendation.reason } }}>
                      {recommendation.alreadyPlanned ? "Review initiative" : "Open an initiative"}
                    </Link>
                  </article>
                ))
              ) : (
                <article>
                  <small>NO ACTION REQUIRED</small>
                  <h3>No uncovered demand</h3>
                  <p>Nothing in the current employer dataset points to a missing offering.</p>
                  <Link href="/university/curriculum">Review curriculum</Link>
                </article>
              )}
            </section>

            <section className="ud-panel ud-partners">
              <header>
                <h2>Certification demand</h2>
              </header>
              {intelligence.recommendations.filter((entry) => entry.type === "EXPAND_OFFERING").length ? (
                intelligence.recommendations
                  .filter((entry) => entry.type === "EXPAND_OFFERING")
                  .slice(0, 3)
                  .map((entry) => (
                    <article key={entry.skillId}>
                      <i><Ic name="award" /></i>
                      <div>
                        <b>{entry.skillName}</b>
                        <small>{entry.relatedOpenRoles} open role(s) require it</small>
                      </div>
                      <span>Not granted</span>
                    </article>
                  ))
              ) : (
                <article>
                  <i><Ic name="award" /></i>
                  <div>
                    <b>No unmet certification demand</b>
                    <small>Every certification employers request is granted by an offering here.</small>
                  </div>
                  <span>OK</span>
                </article>
              )}
              <footer>
                <small>DATA SUFFICIENCY</small>
                <p>
                  Figures come from {intelligence.openRoleCount} open role(s) and{" "}
                  {cohort.reportable ? `${cohort.students} cohort profile(s)` : "a cohort too small to report"}. Fursah
                  publishes no growth or forecast figures because no historical demand series is recorded.
                </p>
              </footer>
            </section>
          </aside>
        </div>

        {assistantConfigured() && <div style={{ marginTop: 22 }}>
          <FursahAssistant
            eyebrow="FURSAH ASSISTANT"
            heading="Ask about curriculum alignment"
            intro="Ask about employer demand, curriculum coverage, and where your cohort stands. All student figures are aggregate and suppressed below the minimum cohort size; individual records are never available here."
            suggestions={[
              "What skill gap should we prioritise?",
              "Why is that skill being recommended?",
              "Which offerings currently cover employer demand?",
              "What action would address the largest gap?",
            ]}
          />
        </div>}
      </div>
    </main>
  );
}
