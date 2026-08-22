import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUniversity } from "@/lib/session";
import { getAllCareerTracksAsync } from "@/lib/careerTracks.server";
import { computeCohortReadiness, MIN_COHORT } from "@/lib/cohort";
import PageToc from "@/components/PageToc";
import SuppressedFigure from "@/components/SuppressedFigure";
import { getUniversityIntelligence } from "@/lib/intelligence";

export default async function StudentReadiness() {
  const ctx = await getCurrentUniversity();
  if (!ctx) redirect("/login");

  const [students, tracks, intelligence] = await Promise.all([
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
    getUniversityIntelligence(ctx.university.id),
  ]);

  const cohort = computeCohortReadiness({ students, tracks, institution: ctx.university.institution });

  // Where employers ask for a skill the cohort has not evidenced: the point at
  // which readiness reporting becomes a curriculum decision.
  // Only rows whose cohort figure survived suppression can be ranked or shown
  // with a percentage; a withheld figure is null, not zero.
  const demandExceedingReadiness = intelligence.coveredSkills
    .filter((skill) => skill.openRoleCount > 0 && (skill.cohortMissingCount ?? 0) > 0)
    .sort((a, b) => (b.cohortMissingSharePct ?? 0) - (a.cohortMissingSharePct ?? 0))
    .slice(0, 6);

  const withheldDemandRows = intelligence.coveredSkills.filter(
    (skill) => skill.openRoleCount > 0 && skill.cohortMissingCount === null,
  ).length;

  if (!cohort.reportable) {
    return (
      <main className="page-shell">
        <span className="eyebrow">Cohort outcomes</span>
        <h1 className="page-title">Student readiness</h1>
        <p className="muted">{cohort.summary}</p>
        <div className="notice" style={{ marginTop: 20 }}>
          <strong>Aggregate reporting only.</strong> Readiness is reported for the cohort, never per named student.
          Individual records stay inside each student&apos;s own account. Cohort figures are withheld below{" "}
          {MIN_COHORT} students because a distribution that small identifies the individuals in it.
        </div>
      </main>
    );
  }

  const peakGap = cohort.gaps.find((gap) => !gap.suppressed)?.students ?? 1;

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
          {(() => {
            const ready = cohort.bands.find((b) => b.label === "Career Ready");
            return ready && !ready.suppressed ? (
              <>
                <div className="metric">{ready.sharePct}%</div>
                <span className="muted">scoring 80 or above</span>
              </>
            ) : (
              <>
                <div className="metric">Withheld</div>
                <SuppressedFigure />
              </>
            );
          })()}
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
              {band.suppressed ? (
                <SuppressedFigure />
              ) : (
                <b>
                  {band.count} student{band.count === 1 ? "" : "s"} · {band.sharePct}%
                </b>
              )}
            </div>
            <div className="bar">
              <i style={{ width: `${band.suppressed ? 0 : band.sharePct}%` }} />
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
                {track.suppressed
                  ? `Fewer than ${MIN_COHORT} students target this track here, so its figures are withheld.`
                  : track.topGap
                    ? `Most common gap: ${track.topGap}`
                    : "No shared gap in this group"}
              </div>
            </div>
            <div className="actions">
              {track.suppressed ? (
                <SuppressedFigure />
              ) : (
                <>
                  <span className="pill">
                    {track.students} student{track.students === 1 ? "" : "s"}
                  </span>
                  <span className="pill">{track.averageScore}/100 avg</span>
                </>
              )}
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
                {gap.suppressed ? (
                  <SuppressedFigure />
                ) : (
                  <b>
                    {gap.students} student{gap.students === 1 ? "" : "s"} · {gap.sharePct}%
                  </b>
                )}
              </div>
              <div className="bar">
                <i style={{ width: `${gap.suppressed ? 0 : Math.round(((gap.students ?? 0) / peakGap) * 100)}%` }} />
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
                {gap.suppressed ? (
                  <SuppressedFigure />
                ) : (
                  <b>
                    {gap.students} student{gap.students === 1 ? "" : "s"} · {gap.sharePct}%
                  </b>
                )}
              </div>
            ))}
          </>
        )}

        {cohort.gaps.find((gap) => !gap.suppressed) && (
          <div className="notice" style={{ marginTop: 18 }}>
            <strong>Turn this into an initiative.</strong> {cohort.gaps.find((gap) => !gap.suppressed)!.name} is missing for{" "}
            {cohort.gaps.find((gap) => !gap.suppressed)!.sharePct}% of the cohort.{" "}
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

      <section className="card" style={{ marginTop: 18 }}>
        <span className="eyebrow">Demand vs readiness</span>
        <h2>Where employer demand exceeds cohort readiness</h2>
        <p className="muted">
          Each row is a skill open roles currently request that part of this cohort has not evidenced for their target
          career. The right-hand column shows whether the catalogue already teaches it.
        </p>
        {demandExceedingReadiness.length ? (
          demandExceedingReadiness.map((skill) => (
            <div className="data-row" key={skill.skillId}>
              <div>
                <strong>{skill.skillName}</strong>
                <div className="muted">
                  {skill.openRoleCount} open role(s) request it · missing for {skill.cohortMissingSharePct}% of the
                  cohort
                </div>
              </div>
              <span className={`pill status-${skill.covered ? "approved" : "pending"}`}>
                {skill.covered ? `Taught: ${skill.offeringTitles[0]}` : "Not taught here"}
              </span>
            </div>
          ))
        ) : (
          <div className="notice">
            No requested skill is currently missing across this cohort, or cohort figures are withheld.
          </div>
        )}
        {withheldDemandRows > 0 && (
          <p className="muted" style={{ marginTop: 14, fontSize: 13 }}>
            <SuppressedFigure label={`${withheldDemandRows} further skill(s) withheld`} /> Fewer than {MIN_COHORT}{" "}
            students fall in each of those reporting groups, so their cohort figures cannot be shown.
          </p>
        )}
      </section>

      <p className="muted" style={{ marginTop: 18 }}>
        Reported in aggregate only. No student is named, and no per-person score leaves the student&apos;s own account.
        Suppression applies to every breakdown on this page, not only the cohort total: any career track, readiness
        band, skill gap or certification gap containing fewer than {MIN_COHORT} students is withheld and shown as ⊘.
        Where withholding a single group would let its value be recovered by subtracting the others, a second group is
        withheld as well.
        {cohort.suppressedGroupCount > 0
          ? ` ${cohort.suppressedGroupCount} group(s) are withheld on this page.`
          : " No group on this page currently falls below the threshold."}
      </p>
    </main>
  );
}
