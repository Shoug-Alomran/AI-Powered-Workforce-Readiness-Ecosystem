import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentStudent } from "@/lib/session";
import { computeReadinessScore, readinessBand, computeJobMatch } from "@/lib/ai";
import { getCareerTrackAsync } from "@/lib/careerTracks.server";
import PageToc from "@/components/PageToc";

export default async function StudentDashboard() {
  const ctx = await getCurrentStudent();
  if (!ctx) redirect("/login");

  const student = await prisma.student.findUniqueOrThrow({
    where: { id: ctx.student.id },
    include: {
      skills: { include: { skill: true } },
      certifications: { include: { certification: true } },
      experiences: true,
      projects: true,
      applications: true,
      bookmarks: true,
    },
  });
  if (student.targetCareer === "undecided") redirect("/student/interests?setup=career");
  const [jobs, feedbacks, track] = await Promise.all([
    prisma.job.findMany({
      where: { status: "open" },
      include: { requiredSkills: { include: { skill: true } }, requiredCerts: { include: { certification: true } }, employer: true },
    }),
    prisma.feedback.findMany({
      where: { studentId: student.id },
      include: { job: { include: { employer: true } } },
      orderBy: { createdAt: "desc" },
    }),
    getCareerTrackAsync(student.targetCareer),
  ]);

  const readiness = computeReadinessScore(student, track);
  const band = readinessBand(readiness.score);
  const matches = jobs
    .map((j) => ({ job: j, match: computeJobMatch(student, j) }))
    .sort((a, b) => b.match.score - a.match.score)
    .slice(0, 3);

  return (
    <main className="page-shell student-dashboard-design">
      <section className="student-design-hero student-dashboard-hero">
        <div className="student-hero-copy"><span className="eyebrow">STUDENT WORKSPACE</span><h1>Welcome back, {ctx.user.name.split(" ")[0]}</h1><div className="student-hero-tags"><span>◎ Target: {track.label}</span><span>↗ Career stage: {band.label}</span><span>◷ Next goal: {Math.min(100,Math.ceil((readiness.score+1)/10)*10)}% readiness</span></div><div className="student-ai-callout"><b>✦</b><p><strong>AI Insight:</strong> {readiness.nextActions[0] || `Keep building verified evidence for ${track.label}.`} Your roadmap adjusts as your skills and career goals change.</p></div></div>
        <div className="student-hero-actions"><Link href="/student/roadmap">Continue Roadmap　→</Link><Link href="/student/profile">Update Passport</Link></div>
      </section>

      <PageToc
        items={[
          { id: "roadmap", label: "Adaptive roadmap" },
          { id: "matches", label: "Best matches" },
          { id: "breakdown", label: "Readiness breakdown" },
          { id: "feedback", label: "Employer feedback" },
        ]}
      />

      <div className="grid-3 student-summary-metrics" style={{ marginTop: 26 }}>
        <div className="card">
          <span className="muted">Readiness score</span>
          <div className="metric">{readiness.score}<small>/100</small></div>
          <span className="pill">{band.label}</span>
        </div>
        <div className="card">
          <span className="muted">Profile evidence</span>
          <div className="metric">{student.skills.length + student.certifications.length + student.experiences.length + student.projects.length}</div>
          <span className="muted">verified and self-reported items</span>
        </div>
        <div className="card">
          <span className="muted">Applications</span>
          <div className="metric">{student.applications.length}</div>
          <Link className="link" href="/student/applications" style={{ fontSize: 13 }}>
            Track status →
          </Link>
        </div>
      </div>

      <section className="student-readiness-panel" id="breakdown">
        <div className="student-readiness-ring" style={{"--student-score":`${readiness.score * 3.6}deg`} as React.CSSProperties}><div><strong>{readiness.score}</strong><span>READINESS</span></div></div>
        <div><span className="eyebrow">CAREER READINESS SCORE</span><h2>{band.label}</h2><p>Your score is based on verified skills, certifications, applied experience, and portfolio evidence.</p><div className="student-readiness-mini"><span><small>PROFILE EVIDENCE</small><b>{student.skills.length + student.certifications.length + student.experiences.length + student.projects.length} items</b></span><span><small>NEXT POTENTIAL GAIN</small><b>+{readiness.nextActions.length * 4}%</b></span></div></div>
      </section>

      <div className="grid-2 student-dashboard-grid" style={{ marginTop: 18, alignItems: "start" }}>
        <section className="card" id="roadmap" style={{ scrollMarginTop: 80 }}>
          <div className="data-row">
            <div><span className="eyebrow">Adaptive roadmap</span><h2>Highest-impact actions</h2></div>
            <Link className="link" href="/student/profile">Update passport</Link>
          </div>
          {readiness.nextActions.map((a, i) => (
            <div className="data-row" key={a}>
              <div><span className="pill">Step {i + 1}</span><div style={{ marginTop: 8, fontWeight: 650 }}>{a}</div></div>
              <span className="muted">→</span>
            </div>
          ))}
        </section>
        <section className="card" id="matches" style={{ scrollMarginTop: 80 }}>
          <div className="data-row">
            <div><span className="eyebrow">Opportunity matching</span><h2>Best matches</h2></div>
            <Link className="link" href="/student/jobs">View all</Link>
          </div>
          {matches.map(({ job, match }) => (
            <div className="data-row" key={job.id}>
              <div><strong>{job.title}</strong><div className="muted">{job.employer.company}</div></div>
              <span className="pill">{match.score}% match</span>
            </div>
          ))}
        </section>
      </div>

      <section className="card student-breakdown" style={{ marginTop: 18, scrollMarginTop: 80 }}>
        <span className="eyebrow">Why this score</span>
        <h2>Transparent readiness breakdown</h2>
        <div className="grid-3">
          {readiness.breakdown.map((b) => (
            <div key={b.category}>
              <div className="data-row"><strong>{b.category}</strong><b>{b.score}%</b></div>
              <div className="bar"><i style={{ width: `${b.score}%` }} /></div>
              <p className="muted" style={{ fontSize: 12 }}>{b.detail} · weight {Math.round(b.weight * 100)}%</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card student-feedback-section" id="feedback">
        <header><span className="eyebrow">Workforce feedback loop</span><h2>Employer feedback on your work</h2><p className="muted">Structured feedback from employers after a hire — this is what feeds back into the AI&apos;s learning recommendations.</p></header>
        <div className="rating-scale-note" role="note"><strong>How ratings are interpreted</strong><span><b>1</b> Poor</span><span><b>3</b> Meets expectations</span><span><b>5</b> Excellent</span></div>
        <div className="student-feedback-list">
        {feedbacks.length ? (
          feedbacks.map((f) => {
            const avg = Math.round((f.technical + f.communication + f.teamwork + f.problemSolving + f.adaptability + f.overall) / 6 * 20);
            return (
              <div className="data-row" key={f.id}>
                <div>
                  <strong>{f.job.title}</strong>
                  <div className="muted">{f.job.employer.company}{f.notes ? ` · ${f.notes}` : ""}</div>
                </div>
                <span className="pill">{avg}% overall</span>
              </div>
            );
          })
        ) : (
          <div className="notice">No employer feedback yet — this appears once an employer you&apos;ve been hired by submits a review.</div>
        )}
        </div>
      </section>
    </main>
  );
}
