import PageToc from "@/components/PageToc";
import { getEcosystemIntelligence, MIN_ECOSYSTEM_SAMPLE } from "@/lib/intelligence";

// Reports live ecosystem figures stamped with a generation time, so there is
// nothing stable to prerender. The loading.tsx skeleton still covers
// navigation, but the route itself blocks.
export const instant = false;

export default async function Intelligence() {
  const ecosystem = await getEcosystemIntelligence();

  const topSkills = ecosystem.skills.slice(0, 6);
  const peakDemand = topSkills[0]?.demandPoints ?? 1;

  return (
    <main className="page-shell">
      <span className="eyebrow">Aggregated and anonymized</span>
      <h1 className="page-title">Workforce intelligence</h1>
      <p className="muted">
        The shared signal layer behind Fursah. Every figure below is a count over records that exist right now:
        published roles, evidenced student skills, university offerings, and recorded outcomes. Nothing is projected.
      </p>

      <PageToc
        items={[
          { id: "industry-demand", label: "Industry demand" },
          { id: "talent-supply", label: "Talent supply" },
          { id: "career-tracks", label: "Career tracks" },
          { id: "education-employment-loop", label: "Education-employment loop" },
          { id: "responsible-ai", label: "Responsible AI" },
        ]}
      />

      <div className="grid-3" style={{ marginTop: 26 }}>
        <div className="card">
          <span className="muted">Average readiness</span>
          <div className="metric">{ecosystem.readinessReportable ? `${ecosystem.averageReadiness}/100` : "—"}</div>
          <span className="pill">
            {ecosystem.readinessReportable
              ? `Across ${ecosystem.scoredStudentCount} scored profiles`
              : `Withheld below ${MIN_ECOSYSTEM_SAMPLE} scored profiles`}
          </span>
        </div>
        <div className="card">
          <span className="muted">Demand signals</span>
          <div className="metric">{ecosystem.skills.length}</div>
          <span className="muted">
            distinct requested skills across {ecosystem.openRoleCount} open role(s)
          </span>
        </div>
        <div className="card">
          <span className="muted">University coverage</span>
          <div className="metric">
            {ecosystem.universityCoveragePct === null ? "—" : `${ecosystem.universityCoveragePct}%`}
          </div>
          <span className="muted">of weighted demand taught by {ecosystem.offeringCount} offering(s)</span>
        </div>
      </div>

      <div className="grid-2" style={{ marginTop: 18, alignItems: "start" }}>
        <section className="card" id="industry-demand" style={{ scrollMarginTop: 80 }}>
          <span className="eyebrow">Industry demand</span>
          <h2>Most requested skills</h2>
          {topSkills.length ? (
            topSkills.map((skill, index) => (
              <div key={skill.id} style={{ marginTop: 18 }}>
                <div className="data-row">
                  <strong>
                    {index + 1}. {skill.name}
                  </strong>
                  <b>{skill.demandPoints} demand points</b>
                </div>
                <div className="bar">
                  <i style={{ width: `${Math.round((skill.demandPoints / peakDemand) * 100)}%` }} />
                </div>
                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                  {skill.openRoleCount} requesting role(s) · {skill.studentsWithSkill} student(s) evidence it ·{" "}
                  {skill.taughtByUniversity
                    ? `taught by ${skill.teachingInstitutions.join(", ")}`
                    : "no university offering covers it"}
                </div>
              </div>
            ))
          ) : (
            <div className="notice">No open role currently lists a structured skill requirement.</div>
          )}
        </section>

        <section className="card" id="talent-supply" style={{ scrollMarginTop: 80 }}>
          <span className="eyebrow">Talent supply</span>
          <h2>Where supply is thinnest</h2>
          <p className="muted">
            Skills that fewer students evidence at working level than there are roles requesting them.
          </p>
          {ecosystem.supplyGaps.length ? (
            ecosystem.supplyGaps.slice(0, 6).map((skill) => (
              <div className="data-row" key={skill.id}>
                <div>
                  <strong>{skill.name}</strong>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {skill.studentsWithSkill} student(s) evidencing · {skill.openRoleCount} requesting role(s)
                  </div>
                </div>
                <span className={`pill status-${skill.taughtByUniversity ? "approved" : "pending"}`}>
                  {skill.taughtByUniversity ? "Taught" : "Not taught"}
                </span>
              </div>
            ))
          ) : (
            <div className="notice">
              No requested skill currently has fewer evidencing students than requesting roles.
            </div>
          )}

          <h3 style={{ marginTop: 20 }}>Roles the current pool cannot fill</h3>
          {ecosystem.hardToFillRoles.filter((role) => role.qualifiedStudents === 0).length ? (
            ecosystem.hardToFillRoles
              .filter((role) => role.qualifiedStudents === 0)
              .slice(0, 4)
              .map((role) => (
                <div className="data-row" key={role.jobId}>
                  <div>
                    <strong>{role.jobTitle}</strong>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {role.essentialSkillCount} essential requirement(s) · {role.applicationCount} application(s)
                    </div>
                  </div>
                  <span className="pill">0 fully qualified</span>
                </div>
              ))
          ) : (
            <div className="notice">
              Every open role with structured requirements has at least one student profile evidencing all of them.
            </div>
          )}
        </section>
      </div>

      <section className="card" id="career-tracks" style={{ marginTop: 18, scrollMarginTop: 80 }}>
        <span className="eyebrow">Career tracks</span>
        <h2>Demand and readiness by career direction</h2>
        {ecosystem.careerTracks.slice(0, 8).map((track) => (
          <div className="data-row" key={track.careerTrackId}>
            <div>
              <strong>{track.careerTrackLabel}</strong>
              <div className="muted" style={{ fontSize: 12 }}>
                {track.openRoleCount} open role(s) · {track.demandPoints} demand points ·{" "}
                {track.studentsTargeting} student(s) targeting it
              </div>
            </div>
            <span className="pill">
              {track.averageReadiness === null ? "Readiness withheld" : `${track.averageReadiness}/100 avg readiness`}
            </span>
          </div>
        ))}
        {ecosystem.careerTracks.length === 0 && (
          <div className="notice">No career track is configured yet.</div>
        )}
      </section>

      <div className="grid-2" style={{ marginTop: 18, alignItems: "start" }}>
        <section className="card" id="education-employment-loop" style={{ scrollMarginTop: 80 }}>
          <span className="eyebrow">Education-employment loop</span>
          <h2>Recorded outcomes</h2>
          <div className="data-row">
            <span>Total applications</span>
            <strong>{ecosystem.applicationCount}</strong>
          </div>
          <div className="data-row">
            <span>Shortlisted or hired</span>
            <strong>{ecosystem.placementCount}</strong>
          </div>
          <div className="data-row">
            <span>Open opportunities</span>
            <strong>{ecosystem.openRoleCount}</strong>
          </div>
          <div className="data-row">
            <span>Employer feedback records</span>
            <strong>{ecosystem.feedbackCount}</strong>
          </div>
          <div className="notice" style={{ marginTop: 18 }}>
            Only aggregate trends are exposed here. Individual student data remains inside authorized role views,
            supporting PDPL-aligned data minimization.
          </div>
        </section>

        <section className="card">
          <span className="eyebrow">Certification demand</span>
          <h2>Credentials employers ask for</h2>
          {ecosystem.certifications.length ? (
            ecosystem.certifications.slice(0, 6).map((certification) => (
              <div className="data-row" key={certification.certificationId}>
                <div>
                  <strong>{certification.name}</strong>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {certification.verifiedHolders} student(s) hold it with human-verified evidence ·{" "}
                    {certification.offeredByUniversity ? "granted by a university offering" : "not granted by any offering"}
                  </div>
                </div>
                <span className="pill">{certification.openRoleCount} role(s)</span>
              </div>
            ))
          ) : (
            <div className="notice">No open role currently requires a specific certification.</div>
          )}
        </section>
      </div>

      <section className="card" id="responsible-ai" style={{ marginTop: 18, scrollMarginTop: 80 }}>
        <span className="eyebrow">Responsible AI</span>
        <h2>How the prototype makes decisions</h2>
        <div className="grid-3">
          <div>
            <strong>Transparent inputs</strong>
            <p className="muted">
              Skills, certifications, experience and portfolio evidence, not protected traits.
            </p>
          </div>
          <div>
            <strong>Explainable weighting</strong>
            <p className="muted">
              Every readiness and match score includes a visible category breakdown, produced by one shared calculation
              ({ecosystem.modelVersion}).
            </p>
          </div>
          <div>
            <strong>No invented trends</strong>
            <p className="muted">
              The platform stores no historical demand snapshots, so it publishes no growth, decline, or forecast
              figures.
            </p>
          </div>
        </div>
        <div className="notice" style={{ marginTop: 14 }}>
          {ecosystem.summary.join(" ")}
        </div>
      </section>
    </main>
  );
}
