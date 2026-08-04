import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentEmployer } from "@/lib/session";
import { computeJobMatch } from "@/lib/ai";
import { closeJob, reopenJob, updateApplicationStatus, submitFeedback } from "@/actions/employer";

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

  const feedbackByStudent = new Map(job.feedbacks.map((f) => [f.studentId, f]));
  const candidates = job.applications
    .map((a) => ({ application: a, match: computeJobMatch(a.student, job) }))
    .sort((a, b) => b.match.score - a.match.score);

  return (
    <main className="page-shell">
      <div className="data-row">
        <div>
          <span className="eyebrow">{job.employer.company}</span>
          <h1 className="page-title">{job.title}</h1>
        </div>
        <div className="actions">
          <span className={`pill ${job.status === "open" ? "status-approved" : "status-rejected"}`}>{job.status}</span>
          {job.status === "open" ? (
            <form action={closeJob}><input type="hidden" name="jobId" value={job.id} /><button className="button secondary">Close role</button></form>
          ) : (
            <form action={reopenJob}><input type="hidden" name="jobId" value={job.id} /><button className="button secondary">Reopen role</button></form>
          )}
        </div>
      </div>
      <p className="muted">{job.description}</p>

      <div className="grid-3" style={{ marginTop: 26 }}>
        <div className="card"><span className="muted">Candidates</span><div className="metric">{candidates.length}</div></div>
        <div className="card"><span className="muted">Average match</span><div className="metric">{candidates.length ? Math.round(candidates.reduce((n, c) => n + c.match.score, 0) / candidates.length) : 0}%</div></div>
        <div className="card"><span className="muted">Hired</span><div className="metric">{candidates.filter((c) => c.application.status === "hired").length}</div></div>
      </div>

      <section className="card" style={{ marginTop: 18 }}>
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
      </section>

      <section className="card" style={{ marginTop: 18 }}>
        <span className="eyebrow">AI candidate ranking</span>
        <h2>Candidates, ranked with full explainability</h2>
        {candidates.length === 0 && <div className="notice">No applications yet. Students will appear here as soon as they apply.</div>}
        <div className="stack" style={{ marginTop: 12 }}>
          {candidates.map(({ application, match }) => {
            const s = application.student;
            const feedback = feedbackByStudent.get(s.id);
            return (
              <article className="card" key={application.id} style={{ boxShadow: "none", border: "1px solid #e0e7e3" }}>
                <div className="data-row">
                  <div>
                    <strong>{s.user.name}</strong>
                    <div className="muted">{s.user.email} · {s.degree ?? "—"} {s.university ? `· ${s.university}` : ""}</div>
                  </div>
                  <span className="pill">{match.score}% match</span>
                </div>

                <div className="grid-2" style={{ marginTop: 8 }}>
                  <div>
                    <strong>Matches</strong>
                    <p className="muted">{match.matchedSkills.join(", ") || "None yet"}</p>
                  </div>
                  <div>
                    <strong>Gaps</strong>
                    <p className="muted">
                      {[...match.missingSkills, ...match.missingCerts, match.experienceGapMonths ? `${match.experienceGapMonths} more experience month(s)` : ""]
                        .filter(Boolean)
                        .join(", ") || "None detected"}
                    </p>
                  </div>
                </div>

                <details style={{ marginTop: 10 }}>
                  <summary className="link" style={{ cursor: "pointer" }}>View full Skills Passport</summary>
                  <div className="grid-2" style={{ marginTop: 10 }}>
                    <div>
                      <strong>Skills</strong>
                      {s.skills.length ? s.skills.map((sk) => (
                        <div className="data-row" key={sk.id}><span>{sk.skill.name}</span><span className="pill">Level {sk.level}/5</span></div>
                      )) : <p className="muted">No skills listed.</p>}
                      <strong style={{ display: "block", marginTop: 10 }}>Certifications</strong>
                      {s.certifications.length ? s.certifications.map((c) => (
                        <div className="data-row" key={c.id}><span>{c.certification.name}</span><span className={`pill status-${c.verificationStatus.toLowerCase()}`}>{c.verificationStatus}</span></div>
                      )) : <p className="muted">None submitted.</p>}
                    </div>
                    <div>
                      <strong>Experience</strong>
                      {s.experiences.length ? s.experiences.map((e) => (
                        <div className="data-row" key={e.id}><div><strong>{e.title}</strong><div className="muted">{e.org} · {e.months} month(s)</div></div><span className="pill">{e.type}</span></div>
                      )) : <p className="muted">None listed.</p>}
                      <strong style={{ display: "block", marginTop: 10 }}>Projects</strong>
                      {s.projects.length ? s.projects.map((p) => (
                        <div key={p.id}><strong>{p.title}</strong><p className="muted">{p.description}</p></div>
                      )) : <p className="muted">None listed.</p>}
                    </div>
                  </div>
                </details>

                <div className="notice" style={{ marginTop: 10 }}>{match.explanation}</div>

                <form action={updateApplicationStatus} className="form-grid" style={{ marginTop: 12 }}>
                  <input type="hidden" name="applicationId" value={application.id} />
                  <input type="hidden" name="jobId" value={job.id} />
                  <div className="data-row" style={{ padding: 0 }}>
                    <span className="muted">Status: <strong>{STATUS_LABEL[application.status] ?? application.status}</strong></span>
                  </div>
                  <label>
                    Note back to candidate (shown to the student)
                    <textarea className="input" name="note" defaultValue={application.note ?? ""} placeholder="e.g. Strong React fundamentals — we'd like to move forward." />
                  </label>
                  <div className="actions">
                    <button className="button secondary" name="status" value="shortlisted">Shortlist</button>
                    <button className="button primary" name="status" value="hired">Hire</button>
                    <button className="button danger" name="status" value="rejected">Reject</button>
                  </div>
                </form>

                {application.status === "hired" && (
                  feedback ? (
                    <div className="notice" style={{ marginTop: 12 }}>
                      Feedback submitted — overall {feedback.overall}/5. {feedback.notes}
                    </div>
                  ) : (
                    <form action={submitFeedback} className="form-grid" style={{ marginTop: 12, borderTop: "1px solid #edf1ef", paddingTop: 12 }}>
                      <input type="hidden" name="jobId" value={job.id} />
                      <input type="hidden" name="studentId" value={s.id} />
                      <strong>Post-hire feedback</strong>
                      <p className="muted" style={{ marginTop: -8 }}>Anonymized and used to improve future recommendations for everyone on this career track.</p>
                      <div className="grid-3">
                        {(["technical", "communication", "teamwork", "problemSolving", "adaptability", "overall"] as const).map((field) => (
                          <label key={field} style={{ textTransform: "capitalize" }}>
                            {field.replace(/([A-Z])/g, " $1")}
                            <select className="input" name={field} defaultValue="4">
                              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                            </select>
                          </label>
                        ))}
                      </div>
                      <label>Notes<textarea className="input" name="notes" placeholder="What stood out?" /></label>
                      <button className="button secondary">Submit feedback</button>
                    </form>
                  )
                )}
              </article>
            );
          })}
        </div>
      </section>

      <Link className="link" href="/employer/dashboard" style={{ display: "inline-block", marginTop: 18 }}>← Back to dashboard</Link>
    </main>
  );
}
