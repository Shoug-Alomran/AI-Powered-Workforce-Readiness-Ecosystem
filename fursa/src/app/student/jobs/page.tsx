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

  // Only the student's id is needed to build these, so the profile load runs
  // alongside them rather than in front of them.
  const [student, jobs, tracks, offerings] = await Promise.all([
    prisma.student.findUniqueOrThrow({
      where: { id: ctx.student.id },
      include: {
        skills: { include: { skill: true } },
        certifications: { include: { certification: true } },
        experiences: true,
        projects: true,
        applications: true,
        bookmarks: true,
      },
    }),
    prisma.job.findMany({
      where,
      include: { employer: true, requiredSkills: { include: { skill: true } }, requiredCerts: { include: { certification: true } } },
      orderBy: { createdAt: "desc" },
    }),
    getAllCareerTracksAsync(),
    prisma.offering.findMany({
      include: { university: true, skills: { include: { skill: true } } },
    }),
  ]);

  // One lookup built once, rather than a query per job: which offering closes a
  // given skill gap, so a missing requirement can be shown next to the course
  // that addresses it.
  const offeringBySkill = new Map<string, { title: string; institution: string; url: string | null }>();
  for (const offering of offerings) {
    for (const entry of offering.skills) {
      const key = entry.skill.name.trim().toLowerCase();
      if (!offeringBySkill.has(key)) {
        offeringBySkill.set(key, {
          title: offering.title,
          institution: offering.university.institution,
          url: offering.url,
        });
      }
    }
  }

  const verifiedCertificationCount = student.certifications.filter(
    (entry) => entry.verificationStatus === "APPROVED",
  ).length;

  const unverifiedCertificationCount = student.certifications.length - verifiedCertificationCount;

  return (
    <main className="page-shell student-job-discovery">
      <span className="eyebrow">Explainable matching</span>
      <h1 className="page-title">Opportunities matched to you</h1>
      <p className="muted">Scores show both strengths and gaps, never a black-box rejection.</p>
      <p className="muted" style={{ fontSize: 13 }}>
        Matching counts {verifiedCertificationCount} human-verified certification(s).
        {unverifiedCertificationCount > 0
          ? ` ${unverifiedCertificationCount} submitted certification(s) are still awaiting review and do not yet count towards a match.`
          : ""}
      </p>

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

              {m.missingSkills.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <strong>Highest-impact skills for this role</strong>
                  {job.requiredSkills
                    .filter((requirement) => m.missingSkills.includes(requirement.skill.name))
                    .sort(
                      (a, b) =>
                        b.weight - a.weight ||
                        Number(b.requirementType === "ESSENTIAL") - Number(a.requirementType === "ESSENTIAL"),
                    )
                    .slice(0, 3)
                    .map((requirement) => {
                      const offering = offeringBySkill.get(requirement.skill.name.trim().toLowerCase());
                      return (
                        <div className="data-row" key={requirement.id}>
                          <div>
                            <strong>{requirement.skill.name}</strong>
                            <div className="muted" style={{ fontSize: 12 }}>
                              {requirement.requirementType === "PREFERRED" ? "Preferred" : "Essential"} · importance{" "}
                              {requirement.weight}/3
                              {offering ? ` · taught by ${offering.title} (${offering.institution})` : ""}
                            </div>
                          </div>
                          {offering?.url ? (
                            <a className="link" href={offering.url} target="_blank" rel="noreferrer">
                              View course →
                            </a>
                          ) : (
                            <span className="pill">Gap</span>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
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
