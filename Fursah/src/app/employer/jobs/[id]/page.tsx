import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentEmployer } from "@/lib/session";
import { computeJobMatch } from "@/lib/ai";
import { getEmployerIntelligence } from "@/lib/intelligence";
import { getAllCareerTracksAsync } from "@/lib/careerTracks.server";
import { closeJob, reopenJob, updateJob } from "@/actions/employer";
import JobDeleteControl from "@/components/JobDeleteControl";
import PageToc from "@/components/PageToc";
import EmployerHeader from "@/components/EmployerHeader";

const STATUS_LABEL: Record<string, string> = {
  applied: "Applied",
  shortlisted: "Shortlisted",
  hired: "Hired",
  rejected: "Not selected",
};

export default async function EmployerJobDetail({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getCurrentEmployer();
  if (!ctx) redirect("/login");
  const { id } = await params;

  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      employer: true,
      requiredSkills: { include: { skill: true } },
      requiredCerts: { include: { certification: true } },
      applications: {
        include: {
          student: {
            include: {
              user: true,
              skills: { include: { skill: true } },
              certifications: { include: { certification: true } },
              experiences: true,
              projects: true,
            },
          },
        },
        orderBy: { matchScore: "desc" },
      },
      feedbacks: true,
    },
  });

  if (!job || job.employerId !== ctx.employer.id) notFound();

  const [jobDocuments, intelligence, tracks] = await Promise.all([
    prisma.evidenceDocument.findMany({
      where: { contextType: "JOB", contextId: job.id },
      orderBy: { createdAt: "asc" },
    }),
    getEmployerIntelligence(ctx.employer.id),
    getAllCareerTracksAsync(),
  ]);

  const jobIntelligence = intelligence.jobs.find((entry) => entry.jobId === job.id) ?? null;
  const fitByStudent = new Map((jobIntelligence?.candidateFits ?? []).map((fit) => [fit.studentId, fit]));

  const feedbackByStudent = new Map(job.feedbacks.map((f) => [f.studentId, f]));
  const candidates = job.applications
    .map((a) => ({ application: a, match: computeJobMatch(a.student, job) }))
    .sort((a, b) => b.match.score - a.match.score);

  return (
    <main className="employer-detail-page">
      <EmployerHeader company={ctx.employer.company} userName={ctx.user.name} active="dashboard" pageLabel="Opportunity Details"/>
      <div className="employer-detail-content">
      <div className="data-row">
        <div>
          <span className="eyebrow">{job.employer.company}</span>
          <h1 className="page-title">{job.title}</h1>
        </div>
        <div className="actions">
          <span className={`employer-role-status ${job.status === "open" ? "is-open" : "is-closed"}`}><i aria-hidden="true" />{job.status === "open" ? "Open" : "Closed"}</span>
          {job.status === "open" ? (
            <form action={closeJob}><input type="hidden" name="jobId" value={job.id} /><button className="button secondary">Close role</button></form>
          ) : (
            <form action={reopenJob}><input type="hidden" name="jobId" value={job.id} /><button className="button secondary">Reopen role</button></form>
          )}
          <JobDeleteControl jobId={job.id} jobTitle={job.title} applicantCount={job.applications.length} />
        </div>
      </div>
      <p className="muted">{job.description}</p>

      <PageToc
        items={[
          { id: "requirements", label: "Requirements" },
          { id: "candidates", label: `Candidates (${candidates.length})` },
        ]}
      />

      <div className="grid-3" style={{ marginTop: 26 }}>
        <div className="card"><span className="muted">Candidates</span><div className="metric">{candidates.length}</div></div>
        <div className="card"><span className="muted">Average match</span><div className="metric">{candidates.length ? Math.round(candidates.reduce((n, c) => n + c.match.score, 0) / candidates.length) : 0}%</div></div>
        <div className="card"><span className="muted">Hired</span><div className="metric">{candidates.filter((c) => c.application.status === "hired").length}</div></div>
      </div>

      <section className="card" id="requirements" style={{ marginTop: 18, scrollMarginTop: 80 }}>
        <span className="eyebrow">Requirements</span>
        <h2>What this role is looking for</h2>
        <div className="grid-2">
          <div>
            <strong>Skills</strong>
            <p className="muted">{job.requiredSkills.map((s) => `${s.skill.name} (weight ${s.weight})`).join(", ") || "None specified"}</p>
          </div>
          <div>
            <strong>Certifications</strong>
            <p className="muted">{job.requiredCerts.map((c) => c.certification.name).join(", ") || "None required"}</p>
            <strong style={{ display: "block", marginTop: 10 }}>Minimum experience</strong>
            <p className="muted">{job.minExperience} month(s)</p>
          </div>
        </div>
        <div className="grid-2" style={{ marginTop: 14 }}>
          <div>
            <strong>Preferred skills</strong>
            <p className="muted">{job.requiredSkills.filter((s) => s.requirementType === "PREFERRED").map((s) => s.skill.name).join(", ") || "None listed"}</p>
          </div>
          <div>
            <strong>Where and how</strong>
            <p className="muted">
              {[job.location, job.employmentType, job.arrangement, job.department].filter(Boolean).join(" · ") || "Not stated on this role"}
            </p>
            <strong style={{ display: "block", marginTop: 10 }}>Stated requirements not used in ranking</strong>
            <p className="muted">
              {[
                job.educationLevel,
                job.languages,
                job.recentGraduatesAccepted ? "Recent graduates welcome" : null,
              ].filter(Boolean).join(" · ") || "No education level or language requirement stated"}
            </p>
            <strong style={{ display: "block", marginTop: 10 }}>Application requirement</strong>
            <p className="muted">
              {job.portfolioRequired
                ? "Candidates must attach a CV, portfolio or work sample. They are told before applying and cannot submit without one."
                : "No attachment required to apply."}
            </p>
          </div>
        </div>
        {jobDocuments.length > 0 && <div style={{ marginTop: 14 }}>
          <strong>Private role documents</strong>
          {jobDocuments.map((document) => <div className="data-row" key={document.id}><span>{document.originalName}</span><a className="button secondary" href={`/api/documents/${document.id}`}>Download</a></div>)}
        </div>}
      </section>

      {/*
        * Editing used to be impossible: correcting one requirement meant
        * deleting the role, and with it every application and match. The form
        * carries the current values so a change is an edit, not a re-entry.
        */}
      <details className="card" id="edit-role" style={{ marginTop: 18, scrollMarginTop: 80 }}>
        <summary><strong>Edit this role</strong></summary>
        <p className="muted" style={{ marginTop: 10 }}>
          Requirements you change here immediately re-rank every candidate and change what the
          shared workforce figures count. Applications and their historical match scores are kept.
        </p>
        <form action={updateJob} className="form-grid" style={{ marginTop: 12 }}>
          <input type="hidden" name="jobId" value={job.id} />
          <label>Role title<input className="input" name="title" defaultValue={job.title} required /></label>
          <label>Career track
            <select className="input" name="careerTrack" defaultValue={job.careerTrack}>
              {tracks.map((track) => <option key={track.id} value={track.id}>{track.label}</option>)}
            </select>
          </label>
          <label>Department<input className="input" name="department" defaultValue={job.department ?? ""} placeholder="e.g. Engineering" /></label>
          <label>Employment type
            <select className="input" name="employmentType" defaultValue={job.employmentType ?? "Full-time"}>
              <option>Full-time</option><option>Part-time</option><option>Contract</option>
            </select>
          </label>
          <label>Location<input className="input" name="location" defaultValue={job.location ?? ""} placeholder="e.g. Riyadh, Saudi Arabia" /></label>
          <label>Work arrangement
            <select className="input" name="arrangement" defaultValue={job.arrangement ?? "on-site"}>
              <option value="on-site">On-site</option><option value="hybrid">Hybrid</option><option value="remote">Remote</option>
            </select>
          </label>
          <label>Minimum experience (months)<input className="input" name="minExperience" type="number" min="0" defaultValue={job.minExperience} /></label>
          <label>Education level
            <select className="input" name="educationLevel" defaultValue={job.educationLevel ?? ""}>
              <option value="">Not specified</option>
              <option>High School</option><option>Diploma</option><option>Bachelor&apos;s Degree</option>
              <option>Master&apos;s Degree</option><option>Doctorate</option>
            </select>
            <small className="muted">Shown on the role. Not used to rank candidates.</small>
          </label>
          <label>Languages<input className="input" name="languages" defaultValue={job.languages ?? ""} placeholder="e.g. Arabic, English" />
            <small className="muted">Shown on the role. Not used to rank candidates.</small>
          </label>
          <label className="wide">Essential skills
            <input className="input" name="skills" defaultValue={job.requiredSkills.filter((s) => s.requirementType !== "PREFERRED").map((s) => `${s.skill.name}:${s.weight}`).join(", ")} placeholder="Skill:weight, Skill:weight" />
            <small className="muted">Weight 1–3. Anything left out is removed from the role.</small>
          </label>
          <label className="wide">Preferred skills
            <input className="input" name="preferredSkills" defaultValue={job.requiredSkills.filter((s) => s.requirementType === "PREFERRED").map((s) => `${s.skill.name}:${s.weight}`).join(", ")} placeholder="Skill:weight" />
          </label>
          <label className="wide">Required certifications
            <input className="input" name="certifications" defaultValue={job.requiredCerts.map((c) => c.certification.name).join(", ")} placeholder="Comma separated" />
          </label>
          <label className="wide">Description<textarea className="input" name="description" defaultValue={job.description ?? ""} /></label>
          <label className="wide" style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <input type="checkbox" name="portfolioRequired" defaultChecked={job.portfolioRequired} />
            <span>
              <strong>Portfolio required</strong>
              <small className="muted" style={{ display: "block" }}>
                Candidates must attach a CV, portfolio or work sample to apply.
              </small>
            </span>
          </label>
          <label className="wide" style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <input type="checkbox" name="recentGraduatesAccepted" defaultChecked={job.recentGraduatesAccepted} />
            <span>
              <strong>Recent graduates accepted</strong>
              <small className="muted" style={{ display: "block" }}>
                Shown on the role. It does not affect how candidates are ranked.
              </small>
            </span>
          </label>
          <div className="actions" style={{ margin: 0 }}>
            <button className="button primary">Save requirements</button>
          </div>
        </form>
      </details>

      {jobIntelligence && (
        <section className="card" style={{ marginTop: 18 }}>
          <span className="eyebrow">Role intelligence</span>
          <h2>Pipeline and requirement quality</h2>
          <div className="grid-3">
            <div>
              <div className="data-row">
                <strong>Requirement quality</strong>
                <b>{jobIntelligence.quality.score}%</b>
              </div>
              <div className="bar"><i style={{ width: `${jobIntelligence.quality.score}%` }} /></div>
              <p className="muted" style={{ fontSize: 12 }}>
                Completeness {jobIntelligence.quality.completenessScore}% · structure{" "}
                {jobIntelligence.quality.requirementQualityScore}% · market realism{" "}
                {jobIntelligence.quality.marketRealismScore}%
              </p>
            </div>
            <div>
              <div className="data-row">
                <strong>Talent availability</strong>
                <b>{jobIntelligence.candidatePoolSize}</b>
              </div>
              <p className="muted" style={{ fontSize: 12 }}>
                student profile(s) score 60% or above against these requirements;{" "}
                {jobIntelligence.strongCandidateCount} score 80% or above, out of {intelligence.studentPoolSize} on the
                platform.
              </p>
            </div>
            <div>
              <div className="data-row">
                <strong>Hiring difficulty</strong>
                <b>{jobIntelligence.hiringDifficulty}</b>
              </div>
              <p className="muted" style={{ fontSize: 12 }}>
                Derived from how many profiles satisfy the structured requirements, not from any candidate attribute.
              </p>
            </div>
          </div>

          {jobIntelligence.insights.length > 0 && (
            <div className="notice" style={{ marginTop: 12 }}>{jobIntelligence.insights.join(" ")}</div>
          )}

          {jobIntelligence.quality.issues.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <strong>Suggested improvements to this posting</strong>
              {jobIntelligence.quality.issues.map((issue) => (
                <div className="data-row" key={issue}><span className="muted">{issue}</span></div>
              ))}
            </div>
          )}

          {jobIntelligence.recurringGaps.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <strong>Requirements applicants most often cannot evidence</strong>
              {jobIntelligence.recurringGaps.slice(0, 5).map((gap) => (
                <div className="data-row" key={gap.skillName}>
                  <span>{gap.skillName}</span>
                  <b>
                    {gap.applicantCount} applicant(s) · {gap.sharePct}%
                  </b>
                </div>
              ))}
            </div>
          )}

          {jobIntelligence.scarceSkills.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <strong>Scarce in the current talent pool</strong>
              <p className="muted">
                {jobIntelligence.scarceSkills.map((skill) => skill.name).join(", ")}
              </p>
            </div>
          )}
        </section>
      )}

      <section className="card" id="candidates" style={{ marginTop: 18, scrollMarginTop: 80 }}>
        <span className="eyebrow">AI candidate ranking</span>
        <h2>Candidates, ranked with full explainability</h2>
        <p className="muted">Click a candidate to view their full profile and take action. This list stays put so you can compare everyone at once.</p>
        <p className="muted" style={{ fontSize: 13 }}>
          Ranking uses only job-related evidence: skills against the requirements above, certifications, experience, and
          whether that evidence has been human-verified. No demographic or protected characteristic takes part. Fursah
          provides decision support; the hiring decision is yours and is recorded against your account.
        </p>
        {candidates.length === 0 && <div className="notice">No applications yet. Students will appear here as soon as they apply.</div>}
        <div className="stack" style={{ marginTop: 12 }}>
          {candidates.map(({ application, match }) => {
            const s = application.student;
            const feedback = feedbackByStudent.get(s.id);
            return (
              <Link
                href={`/employer/jobs/${job.id}/candidates/${application.id}`}
                className="data-row"
                key={application.id}
                style={{ color: "inherit", textDecoration: "none", alignItems: "flex-start" }}
              >
                <div>
                  <strong>{s.user.name}</strong>
                  <div className="muted">{s.degree ?? "-"}{s.university ? ` · ${s.university}` : ""}</div>
                  <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                    {match.matchedSkills.length ? `Matches: ${match.matchedSkills.slice(0, 4).join(", ")}` : "No skill matches yet"}
                  </p>
                  {match.missingSkills.length > 0 && (
                    <p className="muted" style={{ fontSize: 13 }}>
                      Missing: {match.missingSkills.slice(0, 4).join(", ")}
                    </p>
                  )}
                  {(() => {
                    const fit = fitByStudent.get(s.id);
                    if (!fit) return null;
                    return (
                      <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                        {fit.verifiedEvidenceItems} of {fit.evidenceItems} evidence item(s) human-verified ·{" "}
                        {fit.verifiedExperienceMonths} of {fit.experienceMonths} experience month(s) verified
                      </p>
                    );
                  })()}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                  <span className="pill">{match.score}% match</span>
                  <span className={`pill status-${application.status === "hired" ? "approved" : application.status === "rejected" ? "rejected" : "pending"}`}>
                    {STATUS_LABEL[application.status] ?? application.status}
                  </span>
                  {application.status === "hired" && feedback && <span className="pill status-approved">Feedback ✓</span>}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <Link className="link" href="/employer/dashboard" style={{ display: "inline-block", marginTop: 18 }}>← Back to dashboard</Link>
      </div>
    </main>
  );
}
