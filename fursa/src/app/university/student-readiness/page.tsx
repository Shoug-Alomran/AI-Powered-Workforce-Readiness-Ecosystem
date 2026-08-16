import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUniversity } from "@/lib/session";
import { getAllCareerTracksAsync } from "@/lib/careerTracks.server";
import { computeCohortReadiness, MIN_COHORT } from "@/lib/cohort";
import PageToc from "@/components/PageToc";

export default async function StudentReadiness() {
  const ctx = await getCurrentUniversity();
  if (!ctx) redirect("/login");

  const [students, tracks] = await Promise.all([
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
    getAllCareerTracksAsync(),
  ]);

  const cohort = computeCohortReadiness({ students, tracks, institution: ctx.university.institution });

  if (!cohort.reportable) {
    return (
      <main className="page-shell">
        <span className="eyebrow">Cohort outcomes</span>
        <h1 className="page-title">Student readiness</h1>
        <p className="muted">{cohort.summary}</p>
        <div className="notice" style={{ marginTop: 20 }}>
          <strong>Aggregate reporting only.</strong> Readiness is reported for the cohort, never per named student —
          individual records stay inside each student&apos;s own account. Cohort figures are withheld below{" "}
          {MIN_COHORT} students because a distribution that small identifies the individuals in it.
        </div>
      </main>
    );
  }

  const peakGap = cohort.gaps[0]?.students ?? 1;

  return (
    <main className="page-shell student-readiness-page">
      <span className="eyebrow">Cohort outcomes</span>
      <h1 className="page-title">Student readiness</h1>
      <p className="muted">{cohort.summary}</p>

      <PageToc
        items={[
          { id: "distribution", label: "Distribution" },
          { id: "tracks", label: "By career track" },
          { id: "gaps", label: "Shared gaps" },
        ]}
      />

      <div className="grid-3" style={{ marginTop: 26 }}>
        <div className="card">
          <span className="muted">Cohort size</span>
          <div className="metric">{cohort.students}</div>
          <span className="muted">students listing {ctx.university.institution}</span>
        </div>
        <div className="card">
          <span className="muted">Average readiness</span>
          <div className="metric">{cohort.averageScore}/100</div>
          <span className="muted">median {cohort.medianScore}/100</span>
        </div>
        <div className="card">
          <span className="muted">Career ready</span>
          <div className="metric">{cohort.bands.find((b) => b.label === "Career Ready")?.sharePct ?? 0}%</div>
          <span className="muted">scoring 80 or above</span>
        </div>
      </div>

      <section className="card" id="distribution" style={{ marginTop: 18, scrollMarginTop: 80 }}>
        <span className="eyebrow">Distribution</span>
        <h2>Where the cohort sits</h2>
        <p className="muted">
          Bands come from the same thresholds shown to students, so this page and their dashboards never disagree.
        </p>
        {cohort.bands.map((band) => (
          <div key={band.label} style={{ marginTop: 16 }}>
            <div className="data-row">
              <strong>{band.label}</strong>
              <b>
                {band.count} student{band.count === 1 ? "" : "s"} · {band.sharePct}%
              </b>
            </div>
            <div className="bar">
              <i style={{ width: `${band.sharePct}%` }} />
            </div>
          </div>
        ))}
      </section>

      <section className="card" id="tracks" style={{ marginTop: 18, scrollMarginTop: 80 }}>
        <span className="eyebrow">By career track</span>
        <h2>Which directions your students are taking</h2>
        {cohort.tracks.map((track) => (
          <div className="data-row" key={track.id}>
            <div>
              <strong>{track.label}</strong>
              <div className="muted">
                {track.topGap ? `Most common gap: ${track.topGap}` : "No shared gap in this group"}
              </div>
            </div>
            <div className="actions">
              <span className="pill">
                {track.students} student{track.students === 1 ? "" : "s"}
              </span>
              <span className="pill">{track.averageScore}/100 avg</span>
            </div>
          </div>
        ))}
      </section>

      <section className="card" id="gaps" style={{ marginTop: 18, scrollMarginTop: 80 }}>
        <span className="eyebrow">Shared gaps</span>
        <h2>What the most students are missing</h2>
        <p className="muted">
          Each gap is a skill the career track requires at level 3 or above that the student has not evidenced. This is
          the same calculation behind every student&apos;s roadmap.
        </p>
        {cohort.gaps.length ? (
          cohort.gaps.slice(0, 8).map((gap) => (
            <div key={gap.name} style={{ marginTop: 16 }}>
              <div className="data-row">
                <strong>{gap.name}</strong>
                <b>
                  {gap.students} student{gap.students === 1 ? "" : "s"} · {gap.sharePct}%
                </b>
              </div>
              <div className="bar">
                <i style={{ width: `${Math.round((gap.students / peakGap) * 100)}%` }} />
              </div>
            </div>
          ))
        ) : (
          <div className="notice">No skill gap is shared across this cohort.</div>
        )}

        {cohort.certificationGaps.length > 0 && (
          <>
            <h3 style={{ marginTop: 24 }}>Certification gaps</h3>
            {cohort.certificationGaps.slice(0, 5).map((gap) => (
              <div className="data-row" key={gap.name}>
                <span>{gap.name}</span>
                <b>
                  {gap.students} student{gap.students === 1 ? "" : "s"} · {gap.sharePct}%
                </b>
              </div>
            ))}
          </>
        )}

        {cohort.gaps[0] && (
          <div className="notice" style={{ marginTop: 18 }}>
            <strong>Turn this into an initiative.</strong> {cohort.gaps[0].name} is missing for{" "}
            {cohort.gaps[0].sharePct}% of the cohort.{" "}
            <Link className="link" href="/university/offerings">
              Add an offering that teaches it
            </Link>{" "}
            or{" "}
            <Link className="link" href="/university/actions/new">
              open a curriculum initiative
            </Link>
            .
          </div>
        )}
      </section>

      <p className="muted" style={{ marginTop: 18 }}>
        Reported in aggregate only. No student is named, and no per-person score leaves the student&apos;s own account.
      </p>
    </main>
  );
}
