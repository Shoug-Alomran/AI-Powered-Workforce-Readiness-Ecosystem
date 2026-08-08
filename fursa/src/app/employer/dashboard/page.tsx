import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentEmployer } from "@/lib/session";
import { computeJobMatch } from "@/lib/ai";

function BriefcaseIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7V5.8c0-1 .8-1.8 1.8-1.8h2.4c1 0 1.8.8 1.8 1.8V7M4 10.5h16M5.5 7h13A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5v-9A1.5 1.5 0 0 1 5.5 7Z" /></svg>;
}

function PeopleIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 19v-1.4c0-2-1.8-3.6-4-3.6H7c-2.2 0-4 1.6-4 3.6V19m6.5-8a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm7-1a3 3 0 1 0 0-6m1 15h3v-1.4c0-1.8-1.4-3.3-3.3-3.6" /></svg>;
}

function ReviewIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm3 4h8M8 12h5M8 16h3" /></svg>;
}

function MatchIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-4a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0-4.8V12l3.5-3.5" /></svg>;
}

export default async function EmployerDashboard() {
  const ctx = await getCurrentEmployer();
  if (!ctx) redirect("/login");

  const verified = ctx.employer.verificationStatus === "APPROVED";
  const jobs = await prisma.job.findMany({
    where: { employerId: ctx.employer.id },
    include: {
      applications: {
        include: {
          student: {
            include: {
              skills: { include: { skill: true } },
              certifications: { include: { certification: true } },
              experiences: true,
              projects: true,
              user: true,
            },
          },
        },
      },
      requiredSkills: { include: { skill: true } },
      requiredCerts: { include: { certification: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const applications = jobs
    .flatMap((job) => job.applications.map((application) => ({
      ...application,
      job,
      match: computeJobMatch(application.student, job),
    })))
    .sort((a, b) => b.match.score - a.match.score);

  const openRoles = jobs.filter((job) => job.status === "open").length;
  const needsReview = applications.filter((application) => application.status === "applied").length;
  const averageMatch = applications.length
    ? Math.round(applications.reduce((total, application) => total + application.match.score, 0) / applications.length)
    : null;

  const metrics = [
    { label: "Open roles", value: openRoles, detail: openRoles === 1 ? "Role accepting applications" : "Roles accepting applications", icon: <BriefcaseIcon /> },
    { label: "Active candidates", value: applications.length, detail: "Across all open roles", icon: <PeopleIcon /> },
    { label: "Needs review", value: needsReview, detail: needsReview ? "New applications to assess" : "No pending applications", icon: <ReviewIcon />, attention: needsReview > 0 },
    { label: "Average match", value: averageMatch === null ? "—" : `${averageMatch}%`, detail: averageMatch === null ? "Available after candidates apply" : "Across calculated matches", icon: <MatchIcon /> },
  ];

  return (
    <main className="employer-dashboard">
      <div className="employer-dashboard__inner">
        <header className="employer-page-header">
          <div>
            <span className="employer-kicker">Employer overview</span>
            <h1>{ctx.employer.company}</h1>
            <p>Manage roles, review candidate evidence, and make informed hiring decisions.</p>
          </div>
          {verified ? (
            <Link className="employer-primary-action" href="/employer/jobs/new">
              <span aria-hidden="true">＋</span> Post a job
            </Link>
          ) : (
            <span className="employer-status employer-status--pending">Verification required</span>
          )}
        </header>

        <div className="employer-human-note">
          <span className="employer-human-note__icon" aria-hidden="true">i</span>
          <span>AI supports candidate discovery and explanation. Your hiring team makes every final decision.</span>
        </div>

        {!verified && (
          <div className={ctx.employer.verificationStatus === "REJECTED" ? "employer-alert employer-alert--error" : "employer-alert"}>
            {ctx.employer.verificationStatus === "REJECTED"
              ? `Your employer account was not approved${ctx.employer.reviewNote ? `: ${ctx.employer.reviewNote}` : "."} Contact support to appeal.`
              : "Your employer account is pending administrator verification. You can review the workspace, but posting is disabled until approval."}
          </div>
        )}

        <section className="employer-metrics" aria-label="Hiring overview">
          {metrics.map((metric) => (
            <article className="employer-metric" key={metric.label}>
              <div className={`employer-metric__icon${metric.attention ? " employer-metric__icon--attention" : ""}`}>{metric.icon}</div>
              <span className="employer-metric__label">{metric.label}</span>
              <strong>{metric.value}</strong>
              <span className="employer-metric__detail">{metric.detail}</span>
            </article>
          ))}
        </section>

        <div className="employer-workspace">
          <section className="employer-panel employer-roles-panel">
            <div className="employer-panel__header">
              <div>
                <h2>Open roles</h2>
                <p>{jobs.length} {jobs.length === 1 ? "role" : "roles"} in your workspace</p>
              </div>
              {verified && <Link href="/employer/jobs/new" className="employer-text-link">Post a job <span aria-hidden="true">→</span></Link>}
            </div>

            {jobs.length ? (
              <div className="employer-role-list">
                <div className="employer-role-list__head" aria-hidden="true">
                  <span>Role</span><span>Status</span><span>Candidates</span><span>Published</span><span></span>
                </div>
                {jobs.map((job) => {
                  const skills = job.requiredSkills.map((required) => required.skill.name);
                  return (
                    <div className="employer-role-row" key={job.id}>
                      <div className="employer-role-row__title">
                        <Link href={`/employer/jobs/${job.id}`}>{job.title}</Link>
                        <span>{skills.slice(0, 3).join(" · ") || "Skills not specified"}{skills.length > 3 ? ` · +${skills.length - 3}` : ""}</span>
                      </div>
                      <span className={`employer-status ${job.status === "open" ? "employer-status--open" : "employer-status--closed"}`}>{job.status}</span>
                      <span className="employer-role-row__count"><strong>{job.applications.length}</strong><small> candidates</small></span>
                      <time dateTime={job.createdAt.toISOString()}>{job.createdAt.toLocaleDateString("en-SA", { month: "short", day: "numeric" })}</time>
                      <Link className="employer-row-action" href={`/employer/jobs/${job.id}`} aria-label={`View ${job.title}`}>View <span aria-hidden="true">→</span></Link>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="employer-empty">
                <div className="employer-empty__icon"><BriefcaseIcon /></div>
                <h3>Post your first role</h3>
                <p>Create a structured role profile to begin receiving skills-based applications and explainable matches.</p>
                {verified && <Link className="employer-primary-action" href="/employer/jobs/new">Post a job</Link>}
              </div>
            )}
          </section>

          <aside className="employer-panel employer-candidates-panel">
            <div className="employer-panel__header employer-panel__header--stacked">
              <div>
                <span className="employer-ai-label"><span aria-hidden="true">✦</span> AI-assisted matching</span>
                <h2>Candidates to review</h2>
                <p>Potential matches based on role requirements and available evidence.</p>
              </div>
            </div>

            {applications.length ? (
              <div className="employer-candidate-list">
                {applications.slice(0, 4).map((application) => (
                  <Link className="employer-candidate" href={`/employer/jobs/${application.job.id}/candidates/${application.id}`} key={application.id}>
                    <div className="employer-candidate__top">
                      <span className="employer-avatar" aria-hidden="true">{application.student.user.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</span>
                      <div><strong>{application.student.user.name}</strong><span>{application.job.title}</span></div>
                      <b>{application.match.score}%</b>
                    </div>
                    <div className="employer-match-bar" aria-label={`${application.match.score}% skills alignment`}><i style={{ width: `${application.match.score}%` }} /></div>
                    <span className="employer-explain-link">Review evidence and match explanation <span aria-hidden="true">→</span></span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="employer-empty employer-empty--compact">
                <div className="employer-empty__icon employer-empty__icon--ai"><PeopleIcon /></div>
                <h3>No candidates yet</h3>
                <p>Candidates and transparent match explanations will appear here after they apply to an open role.</p>
                {jobs.length > 0 && <Link className="employer-text-link" href={`/employer/jobs/${jobs[0].id}`}>Review your open roles <span aria-hidden="true">→</span></Link>}
              </div>
            )}

            <div className="employer-ai-guardrail">
              <strong>Human decisions stay in control</strong>
              <p>Match scores summarize stated requirements and available evidence. They do not make hiring decisions.</p>
              <Link href="/policies/responsible-ai">How matching works <span aria-hidden="true">→</span></Link>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
