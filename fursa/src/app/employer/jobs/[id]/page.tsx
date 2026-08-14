import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentEmployer } from "@/lib/session";
import { computeJobMatch } from "@/lib/ai";
import { closeJob, reopenJob } from "@/actions/employer";
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

  const jobDocuments = await prisma.evidenceDocument.findMany({
    where: { contextType: "JOB", contextId: job.id },
    orderBy: { createdAt: "asc" },
  });

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
        {jobDocuments.length > 0 && <div style={{ marginTop: 14 }}>
          <strong>Private role documents</strong>
          {jobDocuments.map((document) => <div className="data-row" key={document.id}><span>{document.originalName}</span><a className="button secondary" href={`/api/documents/${document.id}`}>Download</a></div>)}
        </div>}
      </section>

      <section className="card" id="candidates" style={{ marginTop: 18, scrollMarginTop: 80 }}>
        <span className="eyebrow">AI candidate ranking</span>
        <h2>Candidates, ranked with full explainability</h2>
        <p className="muted">Click a candidate to view their full profile and take action — this list stays put so you can compare everyone at once.</p>
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
                  <div className="muted">{s.degree ?? "—"}{s.university ? ` · ${s.university}` : ""}</div>
                  <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                    {match.matchedSkills.length ? `Matches: ${match.matchedSkills.slice(0, 4).join(", ")}` : "No skill matches yet"}
                  </p>
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
