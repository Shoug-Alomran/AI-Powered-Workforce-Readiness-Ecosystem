import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentEmployer } from "@/lib/session";
import { computeJobMatch } from "@/lib/ai";
import { computeCandidateFit } from "@/lib/intelligence";
import { updateApplicationStatus, submitFeedback } from "@/actions/employer";
import EmployerHeader from "@/components/EmployerHeader";

const STATUS_LABEL: Record<string, string> = {
  applied: "Applied",
  shortlisted: "Shortlisted",
  hired: "Hired",
  rejected: "Not selected",
};

export default async function CandidateProfile({
  params,
}: {
  params: Promise<{ id: string; applicationId: string }>;
}) {
  const ctx = await getCurrentEmployer();
  if (!ctx) redirect("/login");
  const { id, applicationId } = await params;

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      job: {
        include: {
          employer: true,
          requiredSkills: { include: { skill: true } },
          requiredCerts: { include: { certification: true } },
        },
      },
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
  });

  if (!application || application.jobId !== id || application.job.employerId !== ctx.employer.id) notFound();

  const job = application.job;
  const s = application.student;
  const match = computeJobMatch(s, job);
  // Same score the student saw and the candidate list shows; the fit adds the
  // component-level explanation and the evidence-verification picture.
  const fit = computeCandidateFit(s, job);
  const [feedbacks, applicationDocuments] = await Promise.all([
    prisma.feedback.findMany({ where: { jobId: job.id, studentId: s.id } }),
    prisma.evidenceDocument.findMany({
      where: { contextType: "APPLICATION", contextId: application.id },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  const blind = job.blindReview && application.status === "applied";

  return (
    <main className="employer-detail-page employer-candidate-page">
      <EmployerHeader company={ctx.employer.company} userName={ctx.user.name} active="dashboard" pageLabel="Candidate Profile"/>
      <div className="employer-detail-content employer-candidate-content">
      <Link className="link" href={`/employer/jobs/${job.id}#candidates`}>← Back to all candidates</Link>

      <div className="data-row" style={{ marginTop: 14 }}>
        <div>
          <span className="eyebrow">{job.title} · {job.employer.company}</span>
          <h1 className="page-title">{blind ? `Candidate ${application.id.slice(-6).toUpperCase()}` : s.user.name}</h1>
          <span className="muted">{blind ? "Identity and institution hidden during initial review" : `${s.user.email} · ${s.degree ?? "-"}${s.university ? ` · ${s.university}` : ""}`}</span>
        </div>
        <span className="pill">{match.score}% match</span>
      </div>

      <div className="grid-3" style={{ marginTop: 26 }}>
        <div className="card"><span className="muted">Status</span><div className="metric" style={{ fontSize: 22 }}>{STATUS_LABEL[application.status] ?? application.status}</div></div>
        <div className="card"><span className="muted">Applied</span><div className="metric" style={{ fontSize: 22 }}>{application.createdAt.toLocaleDateString()}</div></div>
        <div className="card"><span className="muted">Bio</span><p className="muted" style={{ margin: 0 }}>{s.bio || "No bio provided."}</p></div>
      </div>

      <section className="card" style={{ marginTop: 18 }}>
        <span className="eyebrow">Explainable match</span>
        <h2>Why this score</h2>
        <div className="grid-2">
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
        <div className="notice" style={{ marginTop: 10 }}>{match.explanation}</div>

        <div className="grid-2" style={{ marginTop: 14 }}>
          <div>
            <div className="data-row"><strong>Essential skills</strong><b>{fit.essentialSkillScore}%</b></div>
            <div className="bar"><i style={{ width: `${fit.essentialSkillScore}%` }} /></div>
            <div className="data-row" style={{ marginTop: 10 }}><strong>Preferred skills</strong><b>{fit.preferredSkillScore}%</b></div>
            <div className="bar"><i style={{ width: `${fit.preferredSkillScore}%` }} /></div>
          </div>
          <div>
            <div className="data-row"><strong>Certifications</strong><b>{fit.certificationScore}%</b></div>
            <div className="bar"><i style={{ width: `${fit.certificationScore}%` }} /></div>
            <div className="data-row" style={{ marginTop: 10 }}><strong>Experience</strong><b>{fit.experienceScore}%</b></div>
            <div className="bar"><i style={{ width: `${fit.experienceScore}%` }} /></div>
          </div>
        </div>

        <div className="notice" style={{ marginTop: 12 }}>
          <strong>Evidence status.</strong> {fit.verifiedEvidenceItems} of {fit.evidenceItems} evidence item(s) have been
          human-verified, including {fit.verifiedCertificationCount} certification(s) and {fit.verifiedExperienceMonths}{" "}
          of {fit.experienceMonths} recorded experience month(s). Unverified items are shown for context but do not count
          towards the certification component of this score.
        </div>

        <p className="muted" style={{ fontSize: 13, marginTop: 10 }}>
          This score compares evidence against the requirements you defined for this role. It is decision support, not a
          hiring decision, and no demographic or protected characteristic is used.
        </p>
      </section>

      <section className="card" style={{ marginTop: 18 }}>
        <span className="eyebrow">Private application documents</span>
        <h2>Supporting evidence</h2>
        <p className="muted">Files are private to this applicant, your organization, and authorized reviewers.</p>
        {applicationDocuments.length ? applicationDocuments.map((document) => (
          <div className="data-row" key={document.id}>
            <div>
              <strong>{document.originalName}</strong>
              <div className="muted">{document.purpose} · {(document.sizeBytes / 1024).toFixed(0)} KB</div>
            </div>
            <div className="actions">
              <span className={`pill status-${document.reviewStatus.toLowerCase()}`}>{document.reviewStatus === "PENDING" ? "Human review pending" : document.reviewStatus}</span>
              <a className="button secondary" href={`/api/documents/${document.id}`}>Download</a>
            </div>
          </div>
        )) : <div className="notice">The applicant did not attach supporting documents.</div>}
      </section>

      <section className="card" style={{ marginTop: 18 }}>
        <span className="eyebrow">AI Skills Passport</span>
        <h2>Full profile</h2>
        <div className="grid-2">
          <div>
            <strong>Skills</strong>
            {s.skills.length ? s.skills.map((sk) => (
              <div className="data-row" key={sk.id}><span>{sk.skill.name}</span><span className="pill">Level {sk.level}/5</span></div>
            )) : <p className="muted">No skills listed.</p>}
            <strong style={{ display: "block", marginTop: 14 }}>Certifications</strong>
            {s.certifications.length ? s.certifications.map((c) => (
              <div className="data-row" key={c.id}><span>{c.certification.name}</span><span className={`pill status-${c.verificationStatus.toLowerCase()}`}>{c.verificationStatus === "APPROVED" ? "HUMAN VERIFIED" : c.verificationStatus === "PENDING" ? "AWAITING HUMAN REVIEW" : c.verificationStatus}</span></div>
            )) : <p className="muted">None submitted.</p>}
          </div>
          <div>
            <strong>Experience</strong>
            {s.experiences.length ? s.experiences.map((e) => (
              <div className="data-row" key={e.id}><div><strong>{e.title}</strong><div className="muted">{e.org} · {e.months} month(s) · {e.verificationStatus === "APPROVED" ? "human verified" : e.verificationStatus === "SELF_REPORTED" ? "self-reported" : "awaiting human review"}</div></div><span className="pill">{e.type}</span></div>
            )) : <p className="muted">None listed.</p>}
            <strong style={{ display: "block", marginTop: 14 }}>Projects</strong>
            {s.projects.length ? s.projects.map((p) => (
              <div key={p.id} style={{ marginTop: 6 }}><strong>{p.title}</strong><p className="muted">{p.description}</p></div>
            )) : <p className="muted">None listed.</p>}
          </div>
        </div>
      </section>

      {application.status !== "hired" && <section className="card" style={{ marginTop: 18 }}>
        <span className="eyebrow">Decision</span>
        <h2>Update status</h2>
        <form action={updateApplicationStatus} className="form-grid">
          <input type="hidden" name="applicationId" value={application.id} />
          <input type="hidden" name="jobId" value={job.id} />
          <label>
            Note back to candidate (shown to the student)
            <textarea className="input" name="note" defaultValue={application.note ?? ""} placeholder="e.g. Strong React fundamentals, we'd like to move forward." />
          </label>
          <label>Structured decision reason<select className="input" name="decisionReason" defaultValue={application.decisionReason ?? ""} required><option value="" disabled>Select the primary reason</option><option value="MEETS_ESSENTIAL_REQUIREMENTS">Meets essential requirements</option><option value="STRONGER_WORK_SAMPLE_NEEDED">Stronger work sample needed</option><option value="MISSING_ESSENTIAL_SKILL">Missing an essential skill</option><option value="EXPERIENCE_GAP">Relevant experience gap</option><option value="ROLE_FILLED">Role filled or closed</option></select></label>
          <div className="actions">
            {application.status === "applied" && <button className="button secondary" name="status" value="shortlisted">Shortlist</button>}
            <button className="button primary" name="status" value="hired">Hire</button>
            <button className="button danger" name="status" value="rejected">Reject</button>
          </div>
        </form>
      </section>}

      {application.status === "hired" && (
        <section className="card employer-feedback" style={{ marginTop: 18 }}>
          <span className="eyebrow">Workforce feedback loop</span>
          <h2>Performance feedback</h2>
          <p className="muted">Choose the appropriate checkpoint and submit one focused review.</p>
          {feedbacks.length>0&&<div className="employer-feedback-history"><h3>Submitted checkpoints</h3>{feedbacks.sort((a,b)=>a.checkpointDays-b.checkpointDays).map(feedback=><div className="data-row" key={feedback.id}><div><strong>{feedback.checkpointDays}-day checkpoint</strong><div className="muted">{feedback.notes??"Feedback recorded"}</div></div><span className="pill">{feedback.overall}/5</span></div>)}</div>}
          {feedbacks.length<3&&<form action={submitFeedback} className="form-grid employer-feedback-form">
              <input type="hidden" name="jobId" value={job.id} />
              <input type="hidden" name="studentId" value={s.id} />
              <label className="employer-feedback-checkpoint">Feedback checkpoint<select className="input" name="checkpointDays" required defaultValue=""><option value="" disabled>Select a checkpoint</option>{[30,90,180].filter(day=>!feedbacks.some(item=>item.checkpointDays===day)).map(day=><option key={day} value={day}>{day}-day checkpoint</option>)}</select></label>
              <div className="rating-scale-note" role="note"><strong>Rating scale</strong><span><b>1</b> Poor</span><span><b>3</b> Meets expectations</span><span><b>5</b> Excellent</span></div>
              <div className="employer-feedback-scores">
                {(["technical", "communication", "teamwork", "problemSolving", "adaptability", "overall"] as const).map((field) => (
                  <label key={field} style={{ textTransform: "capitalize" }}>
                    {field.replace(/([A-Z])/g, " $1")}
                    <select className="input" name={field} defaultValue="" required>
                      <option value="" disabled>Select rating</option>
                      {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </label>
                ))}
              </div>
              <label>Notes<textarea className="input" name="notes" placeholder="What stood out?" /></label>
              <button className="button primary">Submit feedback</button>
            </form>}
        </section>
      )}
      </div>
    </main>
  );
}
