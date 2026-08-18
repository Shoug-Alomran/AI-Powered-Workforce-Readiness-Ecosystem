import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentStudent } from "@/lib/session";
import { computeJobMatch } from "@/lib/ai";
import { applyToJob, toggleBookmark } from "@/actions/student";
import { getAllCareerTracksAsync } from "@/lib/careerTracks.server";
import type { Prisma } from "@/generated/prisma/client";
import DocumentUpload from "@/components/DocumentUpload";

export default async function Jobs({
  searchParams,
}: {
  searchParams: Promise<{ track?: string; q?: string }>;
}) {
  const ctx = await getCurrentStudent();
  if (!ctx) redirect("/login");

  const { track: trackFilter = "", q = "" } = await searchParams;

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

  const where: Prisma.JobWhereInput = {
    status: "open",
    employer: { verificationStatus: "APPROVED" },
    ...(trackFilter ? { careerTrack: trackFilter } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q } },
            { employer: { company: { contains: q } } },
          ],
        }
      : {}),
  };

  const [jobs, tracks] = await Promise.all([
    prisma.job.findMany({
      where,
      include: { employer: true, requiredSkills: { include: { skill: true } }, requiredCerts: { include: { certification: true } } },
      orderBy: { createdAt: "desc" },
    }),
    getAllCareerTracksAsync(),
  ]);

  return (
    <main className="page-shell student-job-discovery">
      <span className="eyebrow">Explainable matching</span>
      <h1 className="page-title">Opportunities matched to you</h1>
      <p className="muted">Scores show both strengths and gaps, never a black-box rejection.</p>

      <form className="card" style={{ marginTop: 26, display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 12, alignItems: "end" }}>
        <label style={{ fontSize: 13, fontWeight: 650, color: "#43564f" }}>
          Career track
          <select className="input" name="track" defaultValue={trackFilter}>
            <option value="">All career tracks</option>
            {tracks.map((t) => (
              <option value={t.id} key={t.id}>{t.label}</option>
            ))}
          </select>
        </label>
        <label style={{ fontSize: 13, fontWeight: 650, color: "#43564f" }}>
          Search
          <input className="input" name="q" placeholder="Job title or company" defaultValue={q} />
        </label>
        <button className="button secondary" type="submit">Filter</button>
      </form>

      <div className="stack" style={{ marginTop: 18 }}>
        {jobs.length === 0 && <div className="notice">No open opportunities match this filter yet.</div>}
        {jobs.map((job) => {
          const m = computeJobMatch(student, job);
          const applied = student.applications.some((a) => a.jobId === job.id);
          const saved = student.bookmarks.some((b) => b.jobId === job.id);
          return (
            <article className="card student-job-card" key={job.id}>
              <header className="student-job-card-header"><div><span className="pill">{m.score}% match</span><h2>{job.title}</h2><p>{job.employer.company} · {job.minExperience} months minimum experience</p></div><span className="student-job-status">{applied ? "Application submitted" : saved ? "Saved opportunity" : "Open opportunity"}</span></header>
              <p className="student-job-description">{job.description}</p>
              <div className="grid-2 student-job-match-grid">
                <div>
                  <strong>Matches</strong>
                  <p className="muted">{m.matchedSkills.join(", ") || "Build your profile to reveal matches"}</p>
                </div>
                <div>
                  <strong>Next gaps to close</strong>
                  <p className="muted">
                    {[...m.missingSkills, ...m.missingCerts, m.experienceGapMonths ? `${m.experienceGapMonths} more experience month(s)` : ""]
                      .filter(Boolean)
                      .join(", ") || "No major gaps detected"}
                  </p>
                </div>
              </div>
              <div className="notice student-job-explanation">{m.explanation}</div>
              <footer className="student-job-card-footer">
                <form action={applyToJob} className="student-job-apply-form">
                  <input type="hidden" name="jobId" value={job.id} />
                  {!applied&&<DocumentUpload label="Application documents" compact/>}
                  <button className="button primary student-job-apply-button" disabled={applied}>{applied ? "Applied ✓" : "Apply now"}</button>
                </form>
                <form action={toggleBookmark} className="student-job-save-form">
                  <input type="hidden" name="jobId" value={job.id} />
                  <button className="button secondary">{saved ? "Saved ✓" : "Save"}</button>
                </form>
              </footer>
            </article>
          );
        })}
      </div>
    </main>
  );
}
