import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentStudent } from "@/lib/session";
import { computeJobMatch } from "@/lib/ai";
import { getCareerTrackAsync } from "@/lib/careerTracks.server";
import { getStudentIntelligence } from "@/lib/intelligence";
import { dismissCareerSuggestion, exploreSuggestedCareer } from "@/actions/student";
import PageToc from "@/components/PageToc";

export default async function StudentDashboard() {
  const ctx = await getCurrentStudent();

  if (!ctx) {
    redirect("/login");
  }

  const student = await prisma.student.findUniqueOrThrow({
    where: {
      id: ctx.student.id,
    },
    include: {
      skills: {
        include: {
          skill: true,
        },
      },
      certifications: {
        include: {
          certification: true,
        },
      },
      experiences: true,
      projects: true,
      applications: true,
      bookmarks: true,
    },
  });

  if (student.targetCareer === "undecided") {
    redirect("/student/interests?setup=career");
  }

  const [jobs, feedbacks, track, intelligence] = await Promise.all([
    prisma.job.findMany({
      where: {
        status: "open",
      },
      include: {
        requiredSkills: {
          include: {
            skill: true,
          },
        },
        requiredCerts: {
          include: {
            certification: true,
          },
        },
        employer: true,
      },
    }),

    prisma.feedback.findMany({
      where: {
        studentId: student.id,
      },
      include: {
        job: {
          include: {
            employer: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),

    getCareerTrackAsync(student.targetCareer),

    getStudentIntelligence(student.id),
  ]);

  const readiness = intelligence.readiness;

  /*
   * The intelligence engine should normally resolve the student's current
   * target career. This fallback prevents the dashboard from breaking if
   * an old/demo targetCareer value does not yet correspond to a CareerTrack.
   */
  const readinessScore = readiness?.score ?? 0;

  const readinessLabel =
    readinessScore >= 80
      ? "Strong readiness"
      : readinessScore >= 60
        ? "Developing readiness"
        : readinessScore >= 40
          ? "Building readiness"
          : "Early readiness";

  const nextGoal =
    readinessScore >= 100
      ? 100
      : Math.min(
          100,
          Math.ceil((readinessScore + 1) / 10) * 10
        );

  const matches = jobs
    .map((job) => ({
      job,
      match: computeJobMatch(student, job),
    }))
    .sort((a, b) => b.match.score - a.match.score)
    .slice(0, 3);

  const profileEvidenceCount =
    student.skills.length +
    student.certifications.length +
    student.experiences.length +
    student.projects.length;

  const roadmapRecommendations =
    intelligence.roadmapRecommendations.slice(0, 5);

  const directionSuggestion =
    intelligence.directionSuggestion;

  const currentInterest =
    intelligence.interestProfiles.find(
      (profile) =>
        profile.careerTrackId === readiness?.careerTrackId
    );

  const topCareerMatches =
    intelligence.careerMatches.slice(0, 3);

  const nextPotentialGain = Math.min(
    100 - readinessScore,
    roadmapRecommendations.reduce(
      (total, recommendation) =>
        total + recommendation.expectedImpact,
      0
    )
  );

  const topGap =
    intelligence.skillGaps.length > 0
      ? intelligence.skillGaps[0]
      : null;

  let aiInsight: string;

  if (
    directionSuggestion.shouldSuggestChange &&
    directionSuggestion.suggestedCareer
  ) {
    aiInsight =
      `Your recent activity is aligning more strongly with ` +
      `${directionSuggestion.suggestedCareer.careerTrackLabel}. ` +
      `Fursah recommends exploring it as an alternative while keeping ` +
      `${track.label} as your current target until you choose to change it.`;
  } else if (topGap) {
    aiInsight =
      `${topGap.skillName} is currently one of your highest-impact ` +
      `skill gaps for ${track.label}. ` +
      `${
        topGap.openRoleCount > 0
          ? `It appears in ${topGap.openRoleCount} current open role${
              topGap.openRoleCount === 1 ? "" : "s"
            }.`
          : "Building it would improve your alignment with your target career."
      }`;
  } else if (roadmapRecommendations.length > 0) {
    aiInsight = roadmapRecommendations[0].reason;
  } else {
    aiInsight =
      `Your current evidence aligns well with ${track.label}. ` +
      `Keep adding verified skills, certifications, projects, and experience as you progress.`;
  }

  return (
    <main className="page-shell student-dashboard-design">
      <section className="student-design-hero student-dashboard-hero">
        <div className="student-hero-copy">
          <span className="eyebrow">STUDENT WORKSPACE</span>

          <h1>
            Welcome back, {ctx.user.name.split(" ")[0]}
          </h1>

          <div className="student-hero-tags">
            <span>◎ Target: {track.label}</span>

            <span>
              ↗ Career stage: {readinessLabel}
            </span>

            <span>
              ◷ Next goal: {nextGoal}% readiness
            </span>
          </div>

          <div className="student-ai-callout">
            <b>✦</b>

            <p>
              <strong>AI Insight:</strong> {aiInsight}
            </p>
          </div>
        </div>

        <div className="student-hero-actions">
          <Link href="/student/roadmap">
            Continue Roadmap　→
          </Link>

          <Link href="/student/profile">
            Update Passport
          </Link>
        </div>
      </section>

      {directionSuggestion.shouldSuggestChange &&
        directionSuggestion.suggestedCareer && (
          <section
            className="card"
            style={{
              marginTop: 18,
              borderWidth: 2,
            }}
          >
            <div className="data-row">
              <div style={{ flex: 1 }}>
                <span className="eyebrow">
                  CAREER DIRECTION SIGNAL
                </span>

                <h2 style={{ marginTop: 6 }}>
                  Your activity may be pointing toward{" "}
                  {
                    directionSuggestion.suggestedCareer
                      .careerTrackLabel
                  }
                </h2>

                <p className="muted">
                  {directionSuggestion.reason}
                </p>

                <p className="muted" style={{ fontSize: 13 }}>
                  Fursah will never change your target career
                  automatically. This is a recommendation based on
                  your current activity, readiness, and interests.
                </p>

                {directionSuggestion.supportingSignals.length >
                  0 && (
                  <ul
                    className="muted"
                    style={{
                      fontSize: 12,
                      marginTop: 8,
                      paddingLeft: 18,
                    }}
                  >
                    {directionSuggestion.supportingSignals
                      .slice(0, 4)
                      .map((signal, index) => (
                        <li key={`${signal.type}-${index}`}>
                          {signal.reason}
                        </li>
                      ))}

                    {directionSuggestion.disengagementSignals
                      .slice(0, 2)
                      .map((signal, index) => (
                        <li key={`negative-${signal.type}-${index}`}>
                          {signal.reason}
                        </li>
                      ))}
                  </ul>
                )}
              </div>

              <div
                className="actions"
                style={{
                  alignItems: "flex-end",
                  flexDirection: "column",
                }}
              >
                <form action={exploreSuggestedCareer}>
                  <input
                    type="hidden"
                    name="careerTrackId"
                    value={
                      directionSuggestion.suggestedCareer
                        .careerTrackId
                    }
                  />

                  <button className="button primary">
                    Explore{" "}
                    {
                      directionSuggestion.suggestedCareer
                        .careerTrackLabel
                    }
                  </button>
                </form>

                <form action={dismissCareerSuggestion}>
                  <input
                    type="hidden"
                    name="careerTrackId"
                    value={
                      directionSuggestion.suggestedCareer
                        .careerTrackId
                    }
                  />

                  <button className="button secondary">
                    Keep {track.label}
                  </button>
                </form>

                <Link
                  className="link"
                  href="/student/interests"
                  style={{ fontSize: 13 }}
                >
                  Update interests
                </Link>
              </div>
            </div>
          </section>
        )}

      <PageToc
        items={[
          {
            id: "roadmap",
            label: "Adaptive roadmap",
          },
          {
            id: "matches",
            label: "Best matches",
          },
          {
            id: "breakdown",
            label: "Readiness breakdown",
          },
          {
            id: "career-intelligence",
            label: "Career intelligence",
          },
          {
            id: "feedback",
            label: "Employer feedback",
          },
        ]}
      />

      <div
        className="grid-3 student-summary-metrics"
        style={{ marginTop: 26 }}
      >
        <div className="card">
          <span className="muted">
            Readiness score
          </span>

          <div className="metric">
            {readinessScore}
            <small>/100</small>
          </div>

          <span className="pill">
            {readinessLabel}
          </span>
        </div>

        <div className="card">
          <span className="muted">
            Profile evidence
          </span>

          <div className="metric">
            {profileEvidenceCount}
          </div>

          <span className="muted">
            verified and self-reported items
          </span>
        </div>

        <div className="card">
          <span className="muted">
            Applications
          </span>

          <div className="metric">
            {student.applications.length}
          </div>

          <Link
            className="link"
            href="/student/applications"
            style={{ fontSize: 13 }}
          >
            Track status →
          </Link>
        </div>
      </div>

      <section
        className="student-readiness-panel"
        id="breakdown"
      >
        <div
          className="student-readiness-ring"
          style={
            {
              "--student-score": `${readinessScore * 3.6}deg`,
            } as React.CSSProperties
          }
        >
          <div>
            <strong>{readinessScore}</strong>
            <span>READINESS</span>
          </div>
        </div>

        <div>
          <span className="eyebrow">
            CAREER READINESS SCORE
          </span>

          <h2>{readinessLabel}</h2>

          <p>
            Your score is calculated from your skills,
            verified certifications, experience, and the
            requirements of {track.label}.
          </p>

          <div className="student-readiness-mini">
            <span>
              <small>PROFILE EVIDENCE</small>
              <b>{profileEvidenceCount} items</b>
            </span>

            <span>
              <small>NEXT POTENTIAL GAIN</small>
              <b>+{Math.max(0, nextPotentialGain)}%</b>
            </span>

            <span>
              <small>INTEREST SIGNAL</small>
              <b>
                {currentInterest?.score ?? 0}/100
              </b>
            </span>
          </div>
        </div>
      </section>

      <div
        className="grid-2 student-dashboard-grid"
        style={{
          marginTop: 18,
          alignItems: "start",
        }}
      >
        <section
          className="card"
          id="roadmap"
          style={{ scrollMarginTop: 80 }}
        >
          <div className="data-row">
            <div>
              <span className="eyebrow">
                Adaptive roadmap
              </span>

              <h2>Highest-impact actions</h2>
            </div>

            <Link
              className="link"
              href="/student/roadmap"
            >
              View roadmap
            </Link>
          </div>

          {roadmapRecommendations.length ? (
            roadmapRecommendations.map(
              (recommendation, index) => (
                <div
                  className="data-row"
                  key={`${recommendation.careerTrackId}-${recommendation.skillId ?? recommendation.title}-${index}`}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      <span className="pill">
                        Step {index + 1}
                      </span>

                      <span className="pill">
                        +{recommendation.expectedImpact}%
                        potential
                      </span>
                    </div>

                    <div
                      style={{
                        marginTop: 8,
                        fontWeight: 650,
                      }}
                    >
                      {recommendation.title}
                    </div>

                    <div
                      className="muted"
                      style={{
                        fontSize: 12,
                        marginTop: 5,
                      }}
                    >
                      {recommendation.reason}
                    </div>
                  </div>

                  <span className="muted">→</span>
                </div>
              )
            )
          ) : (
            <div className="notice">
              No major skill gaps are currently identified for
              your target career. Continue adding verified
              evidence as your experience grows.
            </div>
          )}
        </section>

        <section
          className="card"
          id="matches"
          style={{ scrollMarginTop: 80 }}
        >
          <div className="data-row">
            <div>
              <span className="eyebrow">
                Opportunity matching
              </span>

              <h2>Best matches</h2>
            </div>

            <Link
              className="link"
              href="/student/jobs"
            >
              View all
            </Link>
          </div>

          {matches.length ? (
            matches.map(({ job, match }) => (
              <div
                className="data-row"
                key={job.id}
              >
                <div>
                  <strong>{job.title}</strong>

                  <div className="muted">
                    {job.employer.company}
                  </div>
                </div>

                <span className="pill">
                  {match.score}% match
                </span>
              </div>
            ))
          ) : (
            <div className="notice">
              No open opportunities are currently available.
            </div>
          )}
        </section>
      </div>

      <section
        className="card student-breakdown"
        style={{
          marginTop: 18,
          scrollMarginTop: 80,
        }}
      >
        <span className="eyebrow">
          Why this score
        </span>

        <h2>
          Transparent readiness breakdown
        </h2>

        {readiness ? (
          <>
            <p className="muted" style={{ fontSize: 12 }}>
              Model {readiness.modelVersion} · every component below is
              measured against the {readiness.careerTrackLabel} career
              track. Only human-verified certifications are scored.
            </p>

            <div className="grid-3">
              {readiness.components
                .filter((component) => component.applicable)
                .map((component) => (
                  <div key={component.name}>
                    <div className="data-row">
                      <strong>{component.name}</strong>
                      <b>{component.percentage}%</b>
                    </div>

                    <div className="bar">
                      <i
                        style={{
                          width: `${component.percentage}%`,
                        }}
                      />
                    </div>

                    <p
                      className="muted"
                      style={{ fontSize: 12 }}
                    >
                      {component.detail} · weight{" "}
                      {Math.round(component.weight * 100)}%
                    </p>
                  </div>
                ))}
            </div>

            {readiness.unverifiedCertifications.length > 0 && (
              <div className="notice" style={{ marginTop: 12 }}>
                {readiness.unverifiedCertifications.length}{" "}
                submitted certification(s) are awaiting human
                verification and do not yet contribute to this
                score:{" "}
                {readiness.unverifiedCertifications.join(", ")}.
              </div>
            )}
          </>
        ) : (
          <div className="notice">
            Fursah could not map your current target career to a
            configured career track. Update your career interests
            to enable the detailed readiness breakdown.
          </div>
        )}
      </section>

      <section
        className="card"
        id="career-intelligence"
        style={{
          marginTop: 18,
          scrollMarginTop: 80,
        }}
      >
        <div className="data-row">
          <div>
            <span className="eyebrow">
              CAREER INTELLIGENCE
            </span>

            <h2>
              Where your profile is currently pointing
            </h2>
          </div>

          <Link
            className="link"
            href="/student/interests"
          >
            Manage interests
          </Link>
        </div>

        <p className="muted">
          Fursah compares your readiness, demonstrated interest,
          and current workforce demand. Your target career is
          never changed automatically.
        </p>

        {topCareerMatches.length ? (
          topCareerMatches.map(
            (career, index) => (
              <div
                className="data-row"
                key={career.careerTrackId}
              >
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <span className="pill">
                      #{index + 1}
                    </span>

                    <strong>
                      {career.careerTrackLabel}
                    </strong>
                  </div>

                  <div
                    className="muted"
                    style={{
                      marginTop: 6,
                      fontSize: 12,
                    }}
                  >
                    Readiness {career.readinessScore}% ·
                    Interest {career.interestScore}% · Market
                    demand {career.marketDemandScore}%
                  </div>

                  {career.reasons.length > 0 && (
                    <div
                      className="muted"
                      style={{
                        marginTop: 5,
                        fontSize: 12,
                      }}
                    >
                      {career.reasons[0]}
                    </div>
                  )}
                </div>

                <span className="pill">
                  {career.recommendationScore}% fit
                </span>
              </div>
            )
          )
        ) : (
          <div className="notice">
            Career intelligence will appear as Fursah gathers
            enough structured information about your profile and
            career interests.
          </div>
        )}
      </section>

      {intelligence.skillGaps.length > 0 && (
        <section
          className="card"
          style={{ marginTop: 18 }}
        >
          <span className="eyebrow">
            SKILL GAP INTELLIGENCE
          </span>

          <h2>
            Highest-priority skills to develop
          </h2>

          {intelligence.skillGaps
            .slice(0, 5)
            .map((gap) => (
              <div
                className="data-row"
                key={gap.skillId}
              >
                <div style={{ flex: 1 }}>
                  <strong>
                    {gap.skillName}
                  </strong>

                  <div
                    className="muted"
                    style={{
                      fontSize: 12,
                      marginTop: 4,
                    }}
                  >
                    Current level {gap.currentLevel}/5
                    {gap.openRoleCount > 0
                      ? ` · requested by ${gap.openRoleCount} open role${
                          gap.openRoleCount === 1 ? "" : "s"
                        }`
                      : ""}
                  </div>
                </div>

                <span className="pill">
                  Priority{" "}
                  {Math.round(gap.priorityScore)}
                </span>
              </div>
            ))}
        </section>
      )}

      <section
        className="card student-feedback-section"
        id="feedback"
      >
        <header>
          <span className="eyebrow">
            Workforce feedback loop
          </span>

          <h2>
            Employer feedback on your work
          </h2>

          <p className="muted">
            Structured feedback from employers after a hire.
            This feeds back into Fursah&apos;s learning and
            readiness recommendations.
          </p>
        </header>

        <div
          className="rating-scale-note"
          role="note"
        >
          <strong>
            How ratings are interpreted
          </strong>

          <span>
            <b>1</b> Poor
          </span>

          <span>
            <b>3</b> Meets expectations
          </span>

          <span>
            <b>5</b> Excellent
          </span>
        </div>

        <div className="student-feedback-list">
          {feedbacks.length ? (
            feedbacks.map((feedback) => {
              const average = Math.round(
                ((feedback.technical +
                  feedback.communication +
                  feedback.teamwork +
                  feedback.problemSolving +
                  feedback.adaptability +
                  feedback.overall) /
                  6) *
                  20
              );

              return (
                <div
                  className="data-row"
                  key={feedback.id}
                >
                  <div>
                    <strong>
                      {feedback.job.title}
                    </strong>

                    <div className="muted">
                      {feedback.job.employer.company}
                      {feedback.notes
                        ? ` · ${feedback.notes}`
                        : ""}
                    </div>
                  </div>

                  <span className="pill">
                    {average}% overall
                  </span>
                </div>
              );
            })
          ) : (
            <div className="notice">
              No employer feedback yet. This appears once an
              employer you&apos;ve been hired by submits a
              review.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}