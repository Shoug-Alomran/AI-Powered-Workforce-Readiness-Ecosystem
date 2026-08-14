import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUniversity } from "@/lib/session";

export default async function UniversityAnalytics() {
  const ctx = await getCurrentUniversity();
  if (!ctx) redirect("/login");

  return (
    <main className="page-shell">
      <span className="eyebrow">Curriculum Management</span>
      <h1 className="page-title">Analytics</h1>
      <p className="muted">A dedicated cross-program analytics view is coming soon. Existing workforce-demand and curriculum-alignment metrics live on the pages below.</p>
      <div className="grid-2" style={{ marginTop: 20 }}>
        <Link className="card" href="/university/dashboard">
          <strong>Executive Dashboard</strong>
          <p className="muted">Skill intelligence, curriculum gaps, and employer demand.</p>
        </Link>
        <Link className="card" href="/university/curriculum">
          <strong>Curriculum &amp; Certs</strong>
          <p className="muted">Course-level alignment, certification mapping, and skills coverage.</p>
        </Link>
      </div>
    </main>
  );
}
