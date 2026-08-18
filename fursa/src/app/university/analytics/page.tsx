import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUniversity } from "@/lib/session";
import { getAllCareerTracksAsync } from "@/lib/careerTracks.server";
import { computeCurriculumIntelligence } from "@/lib/curriculum";
import { computeCohortReadiness } from "@/lib/cohort";

export default async function UniversityAnalytics() {
  const ctx = await getCurrentUniversity();
  if (!ctx) redirect("/login");

  const [offerings, jobs, dbTracks, students, certifications, tracks] = await Promise.all([
    prisma.offering.findMany({
      where: { universityId: ctx.university.id },
      include: { skills: { include: { skill: true } }, certification: true },
    }),
    prisma.job.findMany({
      where: { status: "open", employer: { verificationStatus: "APPROVED" } },
      include: { requiredSkills: { include: { skill: true } }, requiredCerts: { include: { certification: true } } },
    }),
    prisma.careerTrack.findMany({ include: { trackSkills: { include: { skill: true } } } }),
    prisma.student.findMany({
      select: {
        targetCareer: true,
        university: true,
        skills: { include: { skill: true } },
        certifications: { include: { certification: true } },
        experiences: true,
        projects: true,
      },
    }),
    prisma.certification.findMany(),
    getAllCareerTracksAsync(),
  ]);

  const intel = computeCurriculumIntelligence({
    offerings,
    jobs,
    tracks: dbTracks,
    students,
    certifications,
    institution: ctx.university.institution,
  });
  const cohort = computeCohortReadiness({ students, tracks, institution: ctx.university.institution });

  // Where the curriculum gap and the cohort gap are the same skill, the case for
  // acting is strongest: employers ask for it, you don't teach it, students lack it.
  const cohortGapNames = new Map(cohort.gaps.map((gap) => [gap.name.toLowerCase(), gap]));
  const compounded = intel.gaps
    .map((gap) => ({ gap, cohort: cohortGapNames.get(gap.name.toLowerCase()) }))
    .filter((entry) => entry.cohort)
    .slice(0, 5);

  return (
    <main className="page-shell university-analytics-page">
      <span className="eyebrow">Curriculum management</span>
      <h1 className="page-title">Analytics</h1>
      <p className="muted">
        Curriculum coverage and cohort readiness side by side, computed from live employer demand and your students&apos;
        evidenced skills.
      </p>

      <div className="grid-3" style={{ marginTop: 26 }}>
        <div className="card">
          <span className="muted">Demand coverage</span>
          <div className="metric">{intel.coveragePct === null ? "-" : `${intel.coveragePct}%`}</div>
          <span className="muted">of weighted employer demand taught</span>
        </div>
        <div className="card">
          <span className="muted">Cohort readiness</span>
          <div className="metric">{cohort.averageScore === null ? "-" : `${cohort.averageScore}/100`}</div>
          <span className="muted">
            {cohort.reportable ? `across ${cohort.students} students` : "cohort too small to report"}
          </span>
        </div>
        <div className="card">
          <span className="muted">Open roles tracked</span>
          <div className="metric">{intel.counts.openRoles}</div>
          <span className="muted">{intel.demandSkills.length} distinct skills requested</span>
        </div>
      </div>

      <section className="card" style={{ marginTop: 18 }}>
        <span className="eyebrow">Compounded gaps</span>
        <h2>Where curriculum and cohort agree</h2>
        <p className="muted">
          A skill employers request, your catalogue does not teach, and your students have not evidenced. These carry the
          strongest case for curriculum change.
        </p>
        {compounded.length ? (
          compounded.map(({ gap, cohort: cohortGap }) => (
            <div className="data-row" key={gap.name}>
              <div>
                <strong>{gap.name}</strong>
                <div className="muted">
                  Requested by {gap.jobCount} open role{gap.jobCount === 1 ? "" : "s"} · missing for{" "}
                  {cohortGap!.sharePct}% of your cohort · not taught by any offering
                </div>
              </div>
              <Link className="button primary" href="/university/offerings">
                Add an offering
              </Link>
            </div>
          ))
        ) : (
          <div className="notice">
            {cohort.reportable
              ? "No skill is simultaneously demanded by employers, untaught in your catalogue, and missing across your cohort."
              : "Cohort figures are withheld for this institution, so compounded gaps cannot be computed."}
          </div>
        )}
      </section>

      <div className="grid-2" style={{ marginTop: 18, alignItems: "start" }}>
        <section className="card">
          <span className="eyebrow">Curriculum</span>
          <h2>Top demand, covered or not</h2>
          {intel.demandSkills.length ? (
            intel.demandSkills.slice(0, 6).map((skill) => (
              <div className="data-row" key={skill.name}>
                <span>{skill.name}</span>
                <span className={`pill status-${skill.covered ? "approved" : "pending"}`}>
                  {skill.covered ? "Covered" : "Gap"}
                </span>
              </div>
            ))
          ) : (
            <div className="notice">No open role has listed a required skill yet.</div>
          )}
          <Link className="link" href="/university/curriculum" style={{ display: "inline-block", marginTop: 14 }}>
            Open the curriculum workspace →
          </Link>
        </section>

        <section className="card">
          <span className="eyebrow">Cohort</span>
          <h2>Readiness distribution</h2>
          {cohort.reportable ? (
            cohort.bands.map((band) => (
              <div key={band.label} style={{ marginTop: 12 }}>
                <div className="data-row">
                  <span>{band.label}</span>
                  <b>{band.sharePct}%</b>
                </div>
                <div className="bar">
                  <i style={{ width: `${band.sharePct}%` }} />
                </div>
              </div>
            ))
          ) : (
            <div className="notice">{cohort.summary}</div>
          )}
          <Link className="link" href="/university/student-readiness" style={{ display: "inline-block", marginTop: 14 }}>
            Open cohort readiness →
          </Link>
        </section>
      </div>

      <section className="card" style={{ marginTop: 18 }}>
        <span className="eyebrow">Continue</span>
        <h2>Related workspaces</h2>
        <div className="grid-2">
          <Link className="card" href="/university/dashboard">
            <strong>Executive dashboard</strong>
            <p className="muted">Institutional outcomes, demand, alignment, and pathways.</p>
          </Link>
          <Link className="card" href="/university/job-demand">
            <strong>Workforce demand</strong>
            <p className="muted">Employer demand by sector, skill, and trend over time.</p>
          </Link>
        </div>
      </section>
    </main>
  );
}
