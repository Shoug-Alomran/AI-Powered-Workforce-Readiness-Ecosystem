import Link from "next/link";
import WdiIcon from "@/components/WdiIcon";
import { redirect } from "next/navigation";
import { getCurrentUniversity } from "@/lib/session";
import { getEcosystemIntelligence, getUniversityIntelligence } from "@/lib/intelligence";
import { MIN_COHORT } from "@/lib/cohort";

export default async function UniversityJobDemand() {
  const ctx = await getCurrentUniversity();
  if (!ctx) redirect("/login");

  const [ecosystem, intelligence] = await Promise.all([
    getEcosystemIntelligence(),
    getUniversityIntelligence(ctx.university.id),
  ]);

  const topSkills = ecosystem.skills.slice(0, 3);
  const gaps = intelligence.recommendations.filter((entry) => entry.type === "ADD_OFFERING").slice(0, 3);

  const coverageBySkillId = new Map(intelligence.coveredSkills.map((skill) => [skill.skillId, skill]));

  const employerSectors = [...
    ecosystem.hardToFillRoles.reduce((map, role) => {
      map.set(role.careerTrack, (map.get(role.careerTrack) ?? 0) + 1);
      return map;
    }, new Map<string, number>())]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  return (
    <main className="wdi-page">
      <header className="wdi-title">
        <div>
          <h1>Workforce Demand Intelligence</h1>
          <p>
            <WdiIcon name="clock" /> Generated {ecosystem.generatedAt.toLocaleString()} · <WdiIcon name="employers" /> {ecosystem.employerCount} verified employer(s)
            analysed · <WdiIcon name="posting" /> {ecosystem.openRoleCount} open posting(s) · <WdiIcon name="model" /> Model {ecosystem.modelVersion}
          </p>
        </div>
        <div>
          <a href="/api/university/export"><WdiIcon name="report" /> Generate Report</a>
        </div>
      </header>

      <section className="wdi-summary">
        <b><WdiIcon name="spark" /> EXECUTIVE SUMMARY</b>
        <p>
          {ecosystem.summary.join(" ")} Figures on this page are counts over the platform&apos;s current records. No
          growth rate or forecast is shown, because no historical demand series is stored.
        </p>
      </section>

      <section className="wdi-metrics">
        {[
          ["ACTIVE POSTINGS", String(ecosystem.openRoleCount), "Live"],
          ["EMPLOYERS", String(ecosystem.employerCount), "Verified"],
          ["CAREER TRACKS", String(ecosystem.careerTracks.length), "Configured"],
          ["REQUESTED SKILLS", String(ecosystem.skills.length), "Distinct"],
          [
            "STUDENT PROFILES",
            String(ecosystem.studentCount),
            ecosystem.readinessReportable ? `${ecosystem.averageReadiness}/100 avg` : `< ${MIN_COHORT} scored`,
          ],
          ["YOUR COVERAGE", `${intelligence.weightedDemandCoverage}%`, `${intelligence.gaps.length} gaps`],
        ].map((entry, index) => (
          <article className={index === 5 ? "score" : ""} key={entry[0]}>
            <small>{entry[0]}</small>
            <strong>{entry[1]}</strong>
            <b>{entry[2]}</b>
          </article>
        ))}
      </section>

      <div className="wdi-layout">
        <div>
          <section className="wdi-skills" id="skill-intelligence">
            <header>
              <h2><WdiIcon name="bolt" /> Skill Intelligence</h2>
              <Link href="/university/curriculum">Curriculum workspace →</Link>
            </header>
            <div>
              {topSkills.length ? (
                topSkills.map((skill, index) => {
                  const coverage = coverageBySkillId.get(skill.id);
                  const covered = coverage?.covered ?? false;
                  const demandScore = Math.round(
                    (skill.demandPoints / Math.max(1, ecosystem.skills[0].demandPoints)) * 100,
                  );

                  return (
                    <article key={skill.id}>
                      <label className={covered ? `t${index === 0 ? 1 : 2}` : ""}>
                        {covered ? "COVERED" : "COVERAGE GAP"}
                      </label>
                      <h3>{skill.name}</h3>
                      <p>{skill.category === "soft" ? "Soft skill" : "Technical skill"}</p>
                      <div className="demand">
                        <span>Relative demand</span>
                        <b>{demandScore}/100</b>
                        <i>
                          <em style={{ width: `${demandScore}%` }} />
                        </i>
                      </div>
                      <div className="skill-stats">
                        <span>
                          <small>STUDENTS EVIDENCING</small>
                          <b>{skill.studentsWithSkill}</b>
                        </span>
                        <span>
                          <small>OPEN ROLES</small>
                          <strong>{skill.openRoleCount}</strong>
                        </span>
                      </div>
                      <footer>
                        UNIV COVERAGE: <b>{covered ? coverage!.offeringTitles.join(", ") : "None"}</b>
                        <Link href={covered ? "/university/curriculum" : "/university/offerings"}>
                          {covered ? "Review course" : "Add an offering"}
                        </Link>
                      </footer>
                    </article>
                  );
                })
              ) : (
                <article>
                  <h3>No skill demand recorded</h3>
                  <p>No open role currently lists a structured skill requirement.</p>
                </article>
              )}
            </div>
          </section>

          <section className="wdi-gaps">
            <header>
              <h2>Curriculum Gap Analysis</h2>
              <div>
                <span>Total gaps: {intelligence.gaps.length}</span>
                <b>Compounded: {intelligence.compoundedGaps.length}</b>
              </div>
            </header>
            {gaps.length ? (
              gaps.map((gap) => (
                <article key={gap.skillId}>
                  <div>
                    <h3>{gap.skillName}</h3>
                    <p>{gap.reason}</p>
                    <span>{gap.alreadyPlanned ? "Initiative exists" : "No initiative yet"}</span>
                  </div>
                  <div>
                    <small>OPEN ROLES REQUESTING</small>
                    <b className="deficit">{gap.relatedOpenRoles}</b>
                    <small>COHORT MISSING</small>
                    <b className="positive">
                      {gap.cohortMissingSharePct === null ? "Withheld" : `${gap.cohortMissingSharePct}%`}
                    </b>
                  </div>
                  <div>
                    <small>PRIORITY SCORE</small>
                    <p>
                      {Math.round(gap.priorityScore)}. This score uses employer demand points, requesting role count, and
                      the share of your reported cohort missing the skill.
                    </p>
                    <small>DECISION</small>
                    <b>Institution&apos;s</b>
                  </div>
                  <Link className="button secondary" href="/university/actions/new">
                    Open initiative
                  </Link>
                </article>
              ))
            ) : (
              <article>
                <div>
                  <h3>No uncovered demand</h3>
                  <p>Every skill currently requested by an open role is mapped to at least one of your offerings.</p>
                </div>
                <div />
                <div />
                <Link className="button secondary" href="/university/curriculum">
                  Review curriculum
                </Link>
              </article>
            )}
          </section>
        </div>

        <aside className="wdi-aside">
          <section className="wdi-action">
            <h2><WdiIcon name="bolt" /> Action Center</h2>
            <small>HIGHEST PRIORITY</small>
            {intelligence.recommendations[0] ? (
              <article>
                <h3>{intelligence.recommendations[0].skillName}</h3>
                <p>{intelligence.recommendations[0].reason}</p>
                <b>
                  Priority {Math.round(intelligence.recommendations[0].priorityScore)}{" "}
                  <Link href="/university/actions/new">Open initiative</Link>
                </b>
              </article>
            ) : (
              <article>
                <h3>No action required</h3>
                <p>No uncovered employer demand is currently detected for this catalogue.</p>
              </article>
            )}

            <small>CERTIFICATION DEMAND</small>
            {ecosystem.certifications.length ? (
              ecosystem.certifications.slice(0, 2).map((certification) => (
                <article key={certification.certificationId}>
                  <h3><WdiIcon name="certificate" /> {certification.name}</h3>
                  <p>
                    {certification.openRoleCount} open role(s) require it · {certification.verifiedHolders} student(s)
                    hold it with verified evidence ·{" "}
                    {certification.offeredByUniversity ? "granted by an offering" : "not granted here"}
                  </p>
                </article>
              ))
            ) : (
              <article>
                <h3>No certification requested</h3>
                <p>No open role currently requires a specific certification.</p>
              </article>
            )}

            <small>ROLES THE POOL CANNOT FILL</small>
            {ecosystem.hardToFillRoles.slice(0, 3).map((role) => (
              <label key={role.jobId}>
                {role.jobTitle}
                <b>{role.qualifiedStudents} qualified</b>
              </label>
            ))}
            {ecosystem.hardToFillRoles.length === 0 && <label>No role with structured requirements yet</label>}
          </section>

          <section className="wdi-partners">
            <h3>Coverage summary</h3>
            <p>
              <b>{intelligence.weightedDemandCoverage}%</b>
              <span>
                <strong>Weighted demand covered</strong>
                <small>{intelligence.offeringCount} offering(s) published</small>
              </span>
            </p>
            <p>
              <b>{intelligence.gaps.length}</b>
              <span>
                <strong>Uncovered requested skills</strong>
                <small>{intelligence.compoundedGaps.length} also missing across your cohort</small>
              </span>
            </p>
          </section>
        </aside>
      </div>

      <section className="wdi-bottom">
        <article className="wdi-employers">
          <h2><WdiIcon name="employers" /> Employer Demand Breakdown</h2>
          <small>CAREER TRACKS WITH OPEN ROLES</small>
          <div className="companies">
            {ecosystem.careerTracks
              .filter((track) => track.openRoleCount > 0)
              .slice(0, 4)
              .map((track) => (
                <span key={track.careerTrackId}>
                  {track.careerTrackLabel} ({track.openRoleCount})
                </span>
              ))}
            {ecosystem.careerTracks.every((track) => track.openRoleCount === 0) && <span>No open roles</span>}
          </div>
          <div className="sectors">
            <span>
              ROLES BY DIFFICULTY
              {employerSectors.length ? (
                employerSectors.map(([track, count]) => (
                  <label key={track}>
                    {track.replaceAll("-", " ")} <b>{count}</b>
                    <i>
                      <em
                        style={{
                          width: `${Math.round((count / Math.max(1, employerSectors[0][1])) * 100)}%`,
                        }}
                      />
                    </i>
                  </label>
                ))
              ) : (
                <label>No structured requirements recorded</label>
              )}
            </span>
            <strong>
              {ecosystem.hardToFillRoles.filter((role) => role.qualifiedStudents === 0).length}
              <small>Roles with no fully qualified profile</small>
            </strong>
          </div>
        </article>

        <article className="wdi-trends">
          <h2>⌁ Talent supply against demand</h2>
          <div className="growth">
            <b>♧ WIDEST SUPPLY GAPS</b>
            <p>
              {ecosystem.supplyGaps.length
                ? ecosystem.supplyGaps
                    .slice(0, 3)
                    .map(
                      (skill) =>
                        `${skill.name}: ${skill.studentsWithSkill} student(s) evidence it against ${skill.openRoleCount} requesting role(s)`,
                    )
                    .join("; ")
                : "No requested skill currently has fewer evidencing students than requesting roles."}
            </p>
          </div>
          <div className="decline">
            <b>⌁ NOT MEASURED</b>
            <p>
              Growth, decline, and forecast figures are not published: the platform records no historical demand
              snapshots, so change over time cannot be evidenced.
            </p>
          </div>
          {ecosystem.skills.slice(0, 3).map((skill) => (
            <label key={skill.id}>
              {skill.name}
              <i>
                <em
                  style={{
                    width: `${Math.round((skill.demandPoints / Math.max(1, ecosystem.skills[0].demandPoints)) * 100)}%`,
                  }}
                />
              </i>
            </label>
          ))}
        </article>
      </section>
    </main>
  );
}
