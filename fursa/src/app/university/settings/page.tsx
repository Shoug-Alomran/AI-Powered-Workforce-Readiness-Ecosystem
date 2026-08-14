import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUniversity } from "@/lib/session";

export default async function UniversitySettings() {
  const ctx = await getCurrentUniversity();
  if (!ctx) redirect("/login");

  return (
    <main className="page-shell">
      <span className="eyebrow">Administration</span>
      <h1 className="page-title">Settings</h1>
      <p className="muted">Manage your institution account, display preferences, and support access.</p>
      <div className="grid-2 settings-hub" style={{ marginTop: 20, alignItems: "start" }}>
        <section className="card">
          <span className="eyebrow">Account</span>
          <h2>Institution profile and security</h2>
          <p className="muted">Update your profile photo, verified-domain email address, or password.</p>
          <div className="data-row"><span className="muted">Signed in as</span><strong>{ctx.user.email}</strong></div>
          <Link className="button primary" href="/university/profile">Manage account</Link>
        </section>
        <section className="card">
          <span className="eyebrow">Workspace</span>
          <h2>Display and accessibility</h2>
          <p className="muted">Use the persistent display control in the lower corner to switch light or dark mode and change the interface language.</p>
          <Link className="button secondary" href="/policies/accessibility">Accessibility information</Link>
        </section>
        <section className="card">
          <span className="eyebrow">Help</span>
          <h2>Support</h2>
          <p className="muted">Report a problem or ask for help with curriculum evidence, reviews, and account access.</p>
          <Link className="button secondary" href="/support">Contact support</Link>
        </section>
      </div>
    </main>
  );
}
