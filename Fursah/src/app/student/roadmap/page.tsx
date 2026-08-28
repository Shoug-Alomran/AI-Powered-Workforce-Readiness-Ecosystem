import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentStudent } from "@/lib/session";
import { dismissRoadmapItem, restoreRoadmapItem, syncRoadmap, updateRoadmapItem } from "@/actions/student";
import { getStudentIntelligence, readinessHeadroom } from "@/lib/intelligence";

const LABEL: Record<string, string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  SKIPPED: "Skipped",
  STRUGGLING: "Needs an alternative",
};

const SOURCE_LABEL: Record<string, string> = {
  SKILL_GAP: "Skill gap",
  CERTIFICATION_GAP: "Certification gap",
  EXPERIENCE_GAP: "Experience gap",
  PORTFOLIO_GAP: "Portfolio gap",
  UNIVERSITY_OFFERING: "University offering",
};

const CATEGORY_LABEL: Record<string, string> = {
  SKILL: "Skill development",
  CERTIFICATION: "Certification",
  EXPERIENCE: "Work experience",
  PORTFOLIO: "Portfolio",
  COURSE: "Course",
};

export default async function RoadmapPage() {
  const ctx = await getCurrentStudent();
  if (!ctx) redirect("/login");

  // All three only need the student's id, so they are issued together instead
  // of one after another. The "undecided" redirect is checked once the profile
  // arrives; it is the uncommon path, so it is not worth serialising for.
  const [student, items, intelligence] = await Promise.all([
    prisma.student.findUniqueOrThrow({ where: { id: ctx.student.id } }),
    prisma.roadmapItem.findMany({
      where: { studentId: ctx.student.id },
      orderBy: [{ status: "asc" }, { recommendationScore: "desc" }, { createdAt: "desc" }],
    }),
    getStudentIntelligence(ctx.student.id),
  ]);

  if (student.targetCareer === "undecided") redirect("/student/interests?setup=career");

  const readiness = intelligence.readiness;
  const trackLabel = readiness?.careerTrackLabel ?? student.targetCareer;

  const active = items.filter((item) => item.dismissedAt === null);
  const dismissed = items.filter((item) => item.dismissedAt !== null);
  const completed = active.filter((item) => item.status === "COMPLETED").length;
  const openItems = active.filter((item) => item.status !== "COMPLETED");

  // Headroom across the milestones the student has ACCEPTED onto this roadmap
  // and not yet completed. The dashboard shows headroom across what the engine
  // recommends, which is a different set — a student who has accepted nothing
  // sees a figure here of zero while the dashboard still shows what is on
  // offer. Both go through the same clamp so they can never disagree about the
  // arithmetic, only about the set they describe.
  const acceptedHeadroom = readinessHeadroom(
    readiness?.score ?? 0,
    openItems.map((item) => item.expectedImpact),
  );

  // Not yet on the roadmap: everything the engine currently recommends that has
  // no matching persisted item.
  const pendingRecommendations = intelligence.newRoadmapRecommendations;

  const components = (readiness?.components ?? []).filter((component) => component.applicable);

  return (
    <main className="page-shell student-career-roadmap">
      <section className="student-design-hero student-roadmap-hero">
        <div>
          <span className="eyebrow">✦ ADAPTIVE LEARNING PLAN</span>
          <h1>Your Living Roadmap</h1>
          <p>
            <strong>Fursah Insight:</strong>{" "}
            {openItems[0]?.recommendationReason ??
              pendingRecommendations[0]?.reason ??
              `Your recorded evidence currently meets the ${trackLabel} requirements Fursah can measure. Keep adding verified evidence as your experience grows.`}
          </p>
        </div>
        <div className="student-hero-actions">
          <Link href="#milestones">View Next Milestone　→</Link>
          <form action={syncRoadmap}>
            <button>Refresh Roadmap　↻</button>
          </form>
        </div>
        <footer>
          <span>
            <small>TARGET CAREER</small>
            <b>{trackLabel}</b>
          </span>
          <span>
            <small>CURRENT READINESS</small>
            <b className="blue">{readiness?.score ?? 0}%</b>
          </span>
          <span>
            <small>COMPLETED</small>
            <b>
              {completed}/{active.length}
            </b>
          </span>
          <span>
            <small>IF YOU COMPLETE YOUR OPEN MILESTONES</small>
            <b className="green">+{acceptedHeadroom} pts</b>
          </span>
        </footer>
      </section>

      <section className="student-roadmap-analytics">
        <article>
          <h2>Where your readiness comes from</h2>
          <div className="roadmap-chart">
            {components.map((component) => (
              <i
                key={component.name}
                style={{ height: `${Math.max(12, component.percentage)}%` }}
                className={component.percentage >= 70 ? "current" : ""}
                aria-label={`${component.name}: ${component.percentage}%`}
              >
                <span>{component.percentage}%</span>
                <small>{component.name}</small>
              </i>
            ))}
          </div>
          <p className="muted" style={{ fontSize: 12 }}>
            Each bar is a scored component of your readiness, not a projection. Fursah does not forecast future scores.
            Three different point figures appear across Fursah, and each covers a different set:
            <em> points left in your score</em> is simply 100 minus your score;
            <em> if you complete every recommendation</em>, on your dashboard, covers everything Fursah currently
            suggests; and <em> from your open milestones</em>, below, covers only the milestones you have accepted onto
            this roadmap. Every one of them is calculated by the readiness engine, by working out what your score would
            be with those changes made. None of them is a prediction that you will make them.
          </p>
        </article>

        <article>
          <h2>Milestone analytics</h2>
          <p>
            <span>Open milestones</span>
            <b>{openItems.length} items</b>
          </p>
          <p>
            <span>Current readiness</span>
            <b>{readiness?.score ?? 0}%</b>
          </p>
          <p>
            <span>If you complete your open milestones</span>
            <b className="green">+{acceptedHeadroom} pts</b>
          </p>
          <p>
            <span>Dismissed recommendations</span>
            <b>{dismissed.length}</b>
          </p>
          <div className="student-ai-callout">
            <b>✦</b>
            <p>
              {readiness
                ? readiness.explanation[0]
                : "Choose a target career to score your evidence against a configured career track."}
            </p>
          </div>
        </article>
      </section>

      {pendingRecommendations.length > 0 && (
        <section className="card" style={{ marginTop: 18 }}>
          <div className="data-row">
            <div>
              <span className="eyebrow">NEW RECOMMENDATIONS</span>
              <h2>{pendingRecommendations.length} recommendation(s) not yet on your roadmap</h2>
            </div>
            <form action={syncRoadmap}>
              <button className="button primary">Add to roadmap</button>
            </form>
          </div>
          {pendingRecommendations.slice(0, 5).map((recommendation) => (
            <div className="data-row" key={`${recommendation.careerTrackId}-${recommendation.skillId ?? recommendation.title}`}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span className="pill">{SOURCE_LABEL[recommendation.source] ?? recommendation.source}</span>
                  <span className="pill">this action alone: +{recommendation.expectedImpact} pts</span>
                  {recommendation.offeringProvider && <span className="pill">{recommendation.offeringProvider}</span>}
                </div>
                <strong style={{ display: "block", marginTop: 8 }}>{recommendation.title}</strong>
                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                  {recommendation.reason}
                </div>
                {/*
                  * A recommendation that names a course used to end there: the
                  * student was told which offering closes the gap and given no
                  * way to reach it. Link to the provider's page when the
                  * catalogue records one, and otherwise to the catalogue entry
                  * in Career Interests, which lists the same offerings.
                  */}
                {recommendation.offeringId && (
                  <div style={{ marginTop: 8 }}>
                    {recommendation.offeringUrl ? (
                      <a className="link" href={recommendation.offeringUrl} target="_blank" rel="noreferrer">
                        View this offering at {recommendation.offeringProvider} →
                      </a>
                    ) : (
                      <Link className="link" href="/student/interests#recommendations">
                        See this offering in your career interests →
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </section>
      )}

      <section className="card student-milestones" id="milestones">
        <div className="student-milestones-heading">
          <div><span className="eyebrow">YOUR ACTION PLAN</span><h2>Roadmap milestones</h2></div>
          <p>Work through these steps in any order. Update the status when your progress changes.</p>
        </div>
        {active.length ? (
          active.map((item, index) => (
            <article className="student-milestone-card" key={item.id}>
              <div className="student-milestone-summary">
                <i className="milestone-number">{String(index + 1).padStart(2, "0")}</i>
                <div className="student-milestone-copy">
                  <div className="student-milestone-tags">
                    <span>{CATEGORY_LABEL[item.category] ?? item.category.toLowerCase().replaceAll("_", " ")}</span>
                    <span className="ai">AI recommendation</span>
                    {item.alternativeForId && <span>Alternative step</span>}
                  </div>
                  <h3>{item.title}</h3>
                  {item.recommendationReason && <p>{item.recommendationReason}</p>}
                </div>
                <span className={`student-milestone-status status-${item.status.toLowerCase().replaceAll("_", "-")}`}>{LABEL[item.status] ?? item.status}</span>
              </div>

              <dl className="student-milestone-details">
                <div><dt>Purpose</dt><dd>{item.careerTrackId ? `Supports your ${item.careerTrackId.replaceAll("-", " ")} goal` : "Supports your target career"}</dd></div>
                <div><dt>Readiness value</dt><dd>+{item.expectedImpact} points on its own</dd></div>
                {item.generatedAt && <div><dt>Added to your plan</dt><dd>{item.generatedAt.toLocaleDateString()}</dd></div>}
              </dl>

              <div className="student-milestone-controls">
                <form action={updateRoadmapItem} className="student-milestone-update">
                  <input type="hidden" name="itemId" value={item.id} />
                  <label>Progress status<select className="input" name="status" defaultValue={item.status}>{Object.entries(LABEL).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
                  <label>Progress note <span>(optional)</span><input className="input" name="note" defaultValue={item.studentNote ?? ""} placeholder="Add a short note about your progress" /></label>
                  <button className="button primary">Save progress</button>
                </form>
                <form action={dismissRoadmapItem} className="student-milestone-dismiss">
                  <input type="hidden" name="itemId" value={item.id} />
                  <button className="button secondary">Remove from plan</button>
                </form>
              </div>
            </article>
          ))
        ) : (
          <div className="notice">Refresh recommendations to create your first persistent roadmap.</div>
        )}
      </section>

      {dismissed.length > 0 && (
        <section className="card" style={{ marginTop: 18 }}>
          <span className="eyebrow">DISMISSED</span>
          <h2>Recommendations you turned down</h2>
          <p className="muted">
            Dismissing a recommendation is a signal that it is not the right direction for you. Fursah stops proposing it
            and takes it into account when reviewing your career direction, but nothing is deleted and nothing changes
            your target career.
          </p>
          {dismissed.map((item) => (
            <div className="data-row" key={item.id}>
              <div>
                <strong>{item.title}</strong>
                <div className="muted" style={{ fontSize: 12 }}>
                  Dismissed {item.dismissedAt?.toLocaleDateString()}
                  {item.recommendationReason ? ` · ${item.recommendationReason}` : ""}
                </div>
              </div>
              <form action={restoreRoadmapItem}>
                <input type="hidden" name="itemId" value={item.id} />
                <button className="button secondary">Restore</button>
              </form>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
