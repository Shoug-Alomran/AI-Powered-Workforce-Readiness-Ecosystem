import { redirect } from "next/navigation";
import { getCurrentUniversity } from "@/lib/session";

export default async function UniversitySettings() {
  const ctx = await getCurrentUniversity();
  if (!ctx) redirect("/login");

  return (
    <main className="page-shell">
      <span className="eyebrow">Administration</span>
      <h1 className="page-title">Settings</h1>
      <div className="card" style={{ marginTop: 20, maxWidth: 520 }}>
        <div className="data-row"><span className="muted">Signed in as</span><strong>{ctx.user.email}</strong></div>
        <div className="data-row"><span className="muted">Role</span><strong>University administrator</strong></div>
      </div>
      <p className="muted" style={{ marginTop: 16 }}>Theme and language preferences are available from the floating controls in the bottom corner of every page. Account-level settings are coming soon.</p>
    </main>
  );
}
