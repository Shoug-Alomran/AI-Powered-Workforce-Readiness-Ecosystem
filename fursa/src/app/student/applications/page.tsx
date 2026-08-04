import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentStudent } from "@/lib/session";

const STATUS_LABEL: Record<string, string> = {
  applied: "Applied",
  shortlisted: "Shortlisted",
  hired: "Hired",
  rejected: "Not selected",
};

export default async function StudentApplications() {
  const ctx = await getCurrentStudent();
  if (!ctx) redirect("/login");

  const applications = await prisma.application.findMany({
    where: { studentId: ctx.student.id },
    include: { job: { include: { employer: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="page-shell" style={{ maxWidth: 860 }}>
      <span className="eyebrow">Explainable outcomes</span>
      <h1 className="page-title">Your applications</h1>
      <p className="muted">Every status change comes with the employer&apos;s reasoning, not a silent rejection.</p>

      <div className="stack" style={{ marginTop: 26 }}>
        {applications.length ? (
          applications.map((a) => (
            <article className="card" key={a.id}>
              <div className="data-row">
                <div>
                  <strong>{a.job.title}</strong>
                  <div className="muted">{a.job.employer.company}</div>
                </div>
                <span className={`pill status-${a.status === "hired" ? "approved" : a.status === "rejected" ? "rejected" : "pending"}`}>
                  {STATUS_LABEL[a.status] ?? a.status}
                </span>
              </div>
              <div className="data-row">
                <span className="muted">AI match score at time of application</span>
                <strong>{a.matchScore}%</strong>
              </div>
              {a.note && <div className="notice" style={{ marginTop: 8 }}>{a.note}</div>}
            </article>
          ))
        ) : (
          <div className="notice">
            You haven&apos;t applied to anything yet. <a className="link" href="/student/jobs">Browse open opportunities →</a>
          </div>
        )}
      </div>
    </main>
  );
}
