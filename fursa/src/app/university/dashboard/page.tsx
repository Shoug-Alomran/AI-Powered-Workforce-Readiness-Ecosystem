import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUniversity } from "@/lib/session";
import { computeReadinessScore } from "@/lib/ai";
import { getAllCareerTracksAsync } from "@/lib/careerTracks.server";
import PageToc from "@/components/PageToc";

export default async function UniversityDashboard() {
  const ctx = await getCurrentUniversity();
  if (!ctx) redirect("/login");

  const [students, jobs, applications, tracks] = await Promise.all([
    prisma.student.findMany({
      where: { university: ctx.university.institution },
      include: { skills: { include: { skill: true } }, certifications: { include: { certification: true } }, experiences: true, projects: true },
    }),
    prisma.job.findMany({ where: { status: "open" }, include: { requiredSkills: { include: { skill: true } } } }),
    prisma.application.findMany({ where: { student: { university: ctx.university.institution } } }),
    getAllCareerTracksAsync(),
  ]);

  const trackById = new Map(tracks.map((t) => [t.id, t]));
  const scored = students.map((student) => ({
    student,
    result: computeReadinessScore(student, trackById.get(student.targetCareer) ?? tracks[0]),
  }));
  const average = scored.length ? Math.round(scored.reduce((sum, item) => sum + item.result.score, 0) / scored.length) : 0;
  const ready = scored.filter((item) => item.result.score >= 80).length;
  const demand = new Map<string, number>();
  jobs.forEach((job) => job.requiredSkills.forEach((item) => demand.set(item.skill.name, (demand.get(item.skill.name) ?? 0) + item.weight)));
  const topDemand = [...demand.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const skillsHeld = new Set(students.flatMap((student) => student.skills.map((item) => item.skill.name)));
  const gaps = topDemand.filter(([skill]) => !skillsHeld.has(skill)).map(([skill]) => skill);
  const tracksCount = new Map<string, number>();
  students.forEach((student) => tracksCount.set(student.targetCareer, (tracksCount.get(student.targetCareer) ?? 0) + 1));

  return <main className="page-shell">
    <div className="data-row">
      <div>
        <span className="eyebrow">University workforce intelligence</span>
        <h1 className="page-title">{ctx.university.institution}</h1>
      </div>
      <a className="button secondary" href="/api/university/export">Export CSV</a>
    </div>
    <p className="muted">Aggregated readiness, industry demand and curriculum-alignment signals for {ctx.university.region ?? "your institution"}.</p>

    <PageToc
      items={[
        { id: "industry-signal", label: "Industry signal" },
        { id: "curriculum-alignment", label: "Curriculum alignment" },
        { id: "career-pathways", label: "Career pathways" },
        { id: "governance", label: "Governance" },
      ]}
    />

    <div className="grid-3" style={{ marginTop: 26 }}>
      <div className="card"><span className="muted">Student cohort</span><div className="metric">{students.length}</div><span className="pill">Aggregated profiles</span></div>
      <div className="card"><span className="muted">Average readiness</span><div className="metric">{average}/100</div><span className="muted">{ready} career-ready learner(s)</span></div>
      <div className="card"><span className="muted">Employment activity</span><div className="metric">{applications.length}</div><span className="muted">applications from this cohort</span></div>
    </div>

    <div className="grid-2" style={{ marginTop: 18, alignItems: "start" }}>
      <section className="card" id="industry-signal" style={{ scrollMarginTop: 80 }}><span className="eyebrow">Industry signal</span><h2>Skills employers need now</h2>{topDemand.map(([skill, score]) => <div key={skill} style={{ marginTop: 16 }}><div className="data-row"><strong>{skill}</strong><b>{score} demand points</b></div><div className="bar"><i style={{ width: `${Math.round(score / (topDemand[0]?.[1] || 1) * 100)}%` }} /></div></div>)}</section>
      <section className="card" id="curriculum-alignment" style={{ scrollMarginTop: 80 }}><span className="eyebrow">Curriculum alignment</span><h2>Priority gaps</h2>{gaps.length ? gaps.map((gap, index) => <div className="data-row" key={gap}><div><span className="pill">Priority {index + 1}</span><strong style={{ display: "block", marginTop: 8 }}>{gap}</strong></div><span className="muted">Review curriculum →</span></div>) : <div className="notice">The current cohort covers the strongest skills represented in live job demand.</div>}</section>
    </div>

    <div className="grid-2" style={{ marginTop: 18, alignItems: "start" }}>
      <section className="card" id="career-pathways" style={{ scrollMarginTop: 80 }}><span className="eyebrow">Career pathways</span><h2>Cohort aspirations</h2>{[...tracksCount.entries()].map(([track, count]) => <div className="data-row" key={track}><span>{(trackById.get(track) ?? tracks[0]).label}</span><strong>{count} learner(s)</strong></div>)}</section>
      <section className="card" id="governance" style={{ scrollMarginTop: 80 }}><span className="eyebrow">Governance</span><h2>Privacy-preserving by design</h2><p className="muted">This account sees institutional aggregates rather than individual student identities. Small-cohort suppression and role-based access should be enforced when Firebase is connected.</p><div className="notice">Recommendations support program review; faculty and governance teams make final curriculum decisions. CSV export contains aggregates only — no individual student data leaves this view.</div></section>
    </div>
  </main>;
}
