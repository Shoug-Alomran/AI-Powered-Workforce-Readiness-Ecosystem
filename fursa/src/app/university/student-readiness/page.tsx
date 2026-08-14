import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUniversity } from "@/lib/session";

export default async function StudentReadiness() {
  const ctx = await getCurrentUniversity();
  if (!ctx) redirect("/login");

  return (
    <main className="page-shell">
      <span className="eyebrow">Curriculum Management</span>
      <h1 className="page-title">Student Readiness</h1>
      <p className="muted">Per-student and per-cohort readiness scoring is being built out. In the meantime, cohort-level coverage against live employer demand is available on the Executive Dashboard and Curriculum &amp; Certs pages.</p>
      <div className="notice" style={{ marginTop: 20 }}>
        This section is not built yet. See <Link className="link" href="/university/dashboard">Executive Dashboard</Link> for aggregate curriculum-gap and coverage figures.
      </div>
    </main>
  );
}
