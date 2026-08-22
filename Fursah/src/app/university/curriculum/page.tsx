import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUniversity } from "@/lib/session";
import CurriculumControls from "@/components/CurriculumControls";
import Ic from "@/components/Ic";
import { computeCurriculumIntelligence, type OfferingInsight } from "@/lib/curriculum";

function OfferingCard({ insight }: { insight: OfferingInsight }) {
  const { offering } = insight;
  const skillNames = offering.skills.map((entry) => entry.skill.name);
  const categories = [...new Set(offering.skills.map((entry) => entry.skill.category))];
  const search = [offering.title, offering.type, ...skillNames, ...categories].join(" ");

  return (
    <article className="cc-course cc-anchor" id={`offering-${offering.id}`} data-search={search.toLowerCase()}>
      <header>
        <div>
          <h3>
            {offering.title} <span>{offering.type === "certification" ? "CERTIFICATION" : "COURSE"}</span>
          </h3>
          <p className="cc-course-meta">
            <span>
              <Ic name="award" />
              {offering.certification ? `Grants ${offering.certification.name}` : "No certification mapped"}
            </span>
            <span>
              <Ic name="clock" />
              Added: {offering.createdAt.toLocaleDateString()}
            </span>
          </p>
        </div>
        <div>
          <small>INDUSTRY ALIGNMENT</small>
          <b>{insight.alignmentPct === null ? "No skills mapped" : `${insight.alignmentPct}% Alignment`}</b>
        </div>
      </header>

      <div className="cc-course-grid">
        <div>
          <small>SKILLS COVERED</small>
          <div className="cc-skills">
            {skillNames.length ? (
              skillNames.map((name) => (
                <span key={name} className={insight.inDemandSkills.includes(name) ? "in-demand" : undefined}>
                  {name}
                </span>
              ))
            ) : (
              <em>No skills mapped yet</em>
            )}
          </div>
        </div>
        <div>
          <small>CAREER READINESS IMPACT</small>
          {insight.trackImpact.length ? (
            insight.trackImpact.map((track) => (
              <p key={track.id}>
                {track.label} <b>{track.coveragePct}% covered</b>
              </p>
            ))
          ) : (
            <p>
              <em>No career track requires these skills yet</em>
            </p>
          )}
        </div>
        <div>
          <small>STUDENT IMPACT</small>
          <strong>{insight.studentsTargeting}</strong>
          <em>STUDENTS TARGETING</em>
          <strong className="match">{insight.demandSharePct}%</strong>
          <em>OF OPEN DEMAND</em>
        </div>
      </div>

      <div className="cc-analysis">
        <span><Ic name="spark" /></span>
        <div>
          <b>AI Curriculum Analysis</b>
          <p>{insight.analysis}</p>
        </div>
        <Link href="/university/actions/new">Create initiative</Link>
      </div>

      <footer>
        <span>
          Related Certifications:{" "}
          {insight.relatedCertifications.length ? (
            insight.relatedCertifications.map((name) => <b key={name}>{name}</b>)
          ) : (
            <i>No professional certifications mapped yet</i>
          )}
        </span>
        <Link href={`/university/offerings/${offering.id}`}>Manage offering</Link>
      </footer>
    </article>
  );
}

export default async function UniversityCurriculum({ searchParams }: { searchParams: Promise<{ removed?: string }> }) {
  const ctx = await getCurrentUniversity();
  if (!ctx) redirect("/login");
  const query = await searchParams;

  const [offerings, jobs, tracks, students, certifications] = await Promise.all([
    prisma.offering.findMany({
      where: { universityId: ctx.university.id },
      include: { skills: { include: { skill: true } }, certification: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.job.findMany({
      where: { status: "open", employer: { verificationStatus: "APPROVED" } },
      include: { requiredSkills: { include: { skill: true } }, requiredCerts: { include: { certification: true } } },
    }),
    prisma.careerTrack.findMany({ include: { trackSkills: { include: { skill: true } } } }),
    prisma.student.findMany({ select: { targetCareer: true, university: true } }),
    prisma.certification.findMany(),
  ]);

  const intel = computeCurriculumIntelligence({
    offerings,
    jobs,
    tracks,
    students,
    certifications,
    institution: ctx.university.institution,
  });

  const { counts, coveragePct } = intel;
  const topDemand = intel.demandSkills.slice(0, 6);
  const peakDemand = topDemand[0]?.weight ?? 1;

  return (
    <main className="cc-page">
      {query.removed === "1" && <div className="uo-success" role="status">✓ Offering removed. Curriculum and certification mapping have been updated.</div>}
      <section className="cc-overview">
        <div className="cc-executive">
          <b>
            <span>AI INSIGHT</span> Executive Curriculum Overview
          </b>
          <p>{intel.summary}</p>
          <div>
            <span>
              <small>DEMAND COVERAGE</small>
              <strong>{coveragePct === null ? "-" : `${coveragePct}%`}</strong>
            </span>
            <span>
              <small>STUDENTS AT {ctx.university.institution.toUpperCase()}</small>
              <strong>
                {intel.studentsAtInstitution} <i>Students</i>
              </strong>
            </span>
          </div>
        </div>
        <div className="cc-pulse">
          <h3>CURRICULUM PULSE</h3>
          <label>
            Courses <b>{counts.courses}</b>
            <i>
              <span style={{ width: `${counts.courses + counts.certifications ? Math.round((counts.courses / (counts.courses + counts.certifications)) * 100) : 0}%` }} />
            </i>
          </label>
          <label>
            Certifications <b>{counts.certifications}</b>
            <i>
              <span style={{ width: `${counts.courses + counts.certifications ? Math.round((counts.certifications / (counts.courses + counts.certifications)) * 100) : 0}%` }} />
            </i>
          </label>
          <small>
            Demand coverage <b>{coveragePct === null ? "Not measurable yet" : `${coveragePct}%`}</b>
          </small>
        </div>
      </section>

      <section className="cc-metrics">
        {[
          ["COURSES", counts.courses, "Mapped offerings"],
          ["CERTIFICATIONS", counts.certifications, "Granted by your catalogue"],
          ["SKILLS TAUGHT", counts.skillsTaught, "Distinct across offerings"],
          ["CAREER TRACKS", counts.tracks, "In the platform catalogue"],
          ["OPEN ROLES", counts.openRoles, "Live employer demand"],
          ["COVERAGE", coveragePct === null ? "-" : `${coveragePct}%`, "Weighted demand met"],
        ].map(([label, value, note], index) => (
          <div className={index === 5 ? "accent" : ""} key={String(label)}>
            <small>{label}</small>
            <strong>{value}</strong>
            <p>{note}</p>
          </div>
        ))}
      </section>

      <CurriculumControls
        typeOptions={[...new Set(offerings.map((offering) => offering.type))]}
        domainOptions={[...new Set(offerings.flatMap((offering) => offering.skills.map((entry) => entry.skill.category)))]}
      />
      <span id="course-list" className="cc-anchor" aria-hidden="true" />

      <div className="cc-workspace">
        <div>
          {intel.offerings.length ? (
            intel.offerings.map((insight) => <OfferingCard insight={insight} key={insight.offering.id} />)
          ) : (
            <div className="notice">
              No courses or certifications have been added yet.{" "}
              <Link className="link" href="/university/offerings">
                Add your first offering →
              </Link>{" "}
              Alignment is measured against live employer demand as soon as one exists.
            </div>
          )}
        </div>

        <aside>
          <section className="cc-recommend">
            <h2>
              <span><Ic name="spark" /></span> AI Strategic Recommendations
            </h2>
            {intel.gaps.length ? (
              intel.gaps.slice(0, 3).map((gap, index) => (
                <article key={gap.name}>
                  <label className={index === 0 ? undefined : index === 1 ? "new" : "credential"}>
                    {index === 0 ? "HIGH PRIORITY" : index === 1 ? "RECOMMENDED NEW" : "UNCOVERED DEMAND"}
                  </label>
                  <small>{gap.jobCount} OPEN ROLE(S)</small>
                  <h3>Add coverage: {gap.name}</h3>
                  <p>
                    {gap.jobCount} open role(s) request {gap.name} ({gap.category}), carrying {Math.round(gap.weight)} weighted
                    demand point(s). No current offering teaches it.
                  </p>
                  <Link className="button primary" href="/university/offerings">
                    Add an offering
                  </Link>
                </article>
              ))
            ) : (
              <article>
                <label>NO GAPS</label>
                <h3>Every requested skill is covered</h3>
                <p>
                  {counts.openRoles
                    ? "Each skill requested by an open role is taught by at least one offering in your catalogue."
                    : "No open roles are published yet, so there is no demand to measure against."}
                </p>
              </article>
            )}
          </section>

          <section className="cc-required">
            <h3>Top Skills Required <Ic name="info" /></h3>
            {topDemand.length ? (
              topDemand.map((skill) => (
                <label key={skill.name}>
                  {skill.name} <b>{skill.covered ? "Covered" : "Gap"}</b>
                  <i>
                    <span style={{ width: `${Math.round((skill.weight / peakDemand) * 100)}%` }} />
                  </i>
                </label>
              ))
            ) : (
              <p className="muted">No open roles have listed required skills yet.</p>
            )}
            <Link href="/university/job-demand">View Full Analytics →</Link>
          </section>
        </aside>
      </div>

      <section className="cc-cert-section" id="certification-mapping">
        <header>
          <h2>Certification Mapping</h2>
          <Link href="/university/offerings">Add a certification ›</Link>
        </header>
        <div>
          {intel.certifications.length ? (
            intel.certifications.map((cert, index) => (
              <article key={cert.name}>
                <header>
                  <span className={`logo l${index % 3}`}>{cert.name.slice(0, 2).toUpperCase()}</span>
                  <div>
                    <h3>{cert.name}</h3>
                    <p>{cert.org ?? "Independent credential"}</p>
                  </div>
                </header>
                <div className="cc-cert-stats">
                  <span>
                    <small>REQUIRED BY</small>
                    <b>
                      {cert.demandCount} role{cert.demandCount === 1 ? "" : "s"}
                    </b>
                  </span>
                  <span>
                    <small>IN YOUR CATALOGUE</small>
                    <b>{cert.offered ? "Offered" : "Not offered"}</b>
                  </span>
                </div>
                <p>
                  {cert.offered ? (
                    <>
                      <b>Granted by:</b> {cert.offeringTitle}
                    </>
                  ) : (
                    <>
                      <b>Gap:</b> no offering in your catalogue grants this credential.
                    </>
                  )}
                </p>
                <footer>
                  <span className="cc-cert-state"><i />{cert.offered ? "Mapped" : "Update recommended"}</span>
                  {cert.offered && cert.offeringId ? (
                    <Link href={`/university/offerings/${cert.offeringId}`}>Manage offering</Link>
                  ) : (
                    <Link href="/university/offerings">Add offering</Link>
                  )}
                </footer>
              </article>
            ))
          ) : (
            <div className="notice">No certification is currently required by an open role or granted by your catalogue.</div>
          )}
        </div>
      </section>

      <section className="cc-mapping" id="skills-mapping">
        <h2>Skills Mapping Analysis</h2>
        <p>How the skills employers request map onto what your catalogue teaches.</p>
        <div>
          {intel.byCategory.length ? (
            intel.byCategory.map((group) => (
              <article key={group.category}>
                <h3>
                  <Ic name="grid" />{" "}
                  {group.category === "technical" ? "Technical" : group.category === "soft" ? "Professional" : group.category} skills{" "}
                  <b>
                    {group.covered}/{group.total} covered
                  </b>
                </h3>
                <div>
                  {intel.demandSkills
                    .filter((skill) => skill.category === group.category)
                    .slice(0, 8)
                    .map((skill) => (
                      <span key={skill.name} className={skill.covered ? "covered" : "gap"}>
                        {skill.name} {skill.covered ? <Ic name="check" /> : `${skill.jobCount} role(s)`}
                      </span>
                    ))}
                </div>
              </article>
            ))
          ) : (
            <div className="notice">No open role has listed a required skill yet, so there is nothing to map.</div>
          )}
        </div>
      </section>
    </main>
  );
}
