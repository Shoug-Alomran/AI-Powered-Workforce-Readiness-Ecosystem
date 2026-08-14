import { redirect } from "next/navigation";
import { getCurrentUniversity } from "@/lib/session";
import AccountSettingsForm from "@/components/AccountSettingsForm";

export default async function UniversityProfile() {
  const ctx = await getCurrentUniversity();
  if (!ctx) redirect("/login");
  const verifiedDomain = ctx.user.email.split("@")[1] ?? "";
  const initials = ctx.user.name.split(" ").map(part => part[0]).join("").slice(0, 2).toUpperCase();

  return (
    <main className="page-shell account-profile-content university-profile-page">
      <span className="eyebrow">Institution account</span>
      <h1 className="page-title">Your university profile</h1>
      <p className="muted">Review your institutional identity and securely manage your sign-in information.</p>

      <div className="account-profile-grid">
        <section className="card account-identity">
          <i>{initials || "U"}</i>
          <div>
            <h2>{ctx.user.name}</h2>
            <p>{ctx.university.institution}</p>
            <span>University administrator</span>
          </div>
        </section>
        <section className="card account-verification">
          <span className="eyebrow">Verified institution</span>
          <h2>@{verifiedDomain}</h2>
          <p className="muted">University account emails must remain on this verified domain.</p>
        </section>
      </div>

      <section className="card university-profile-details">
        <div>
          <span className="muted">Institution</span>
          <strong>{ctx.university.institution}</strong>
        </div>
        <div>
          <span className="muted">Region</span>
          <strong>{ctx.university.region ?? "Not set"}</strong>
        </div>
        <div>
          <span className="muted">Account email</span>
          <strong>{ctx.user.email}</strong>
        </div>
      </section>

      <section className="card account-security">
        <h2>Sign-in and security</h2>
        <p className="muted">Update your email or password. A new email must continue to use <strong>@{verifiedDomain}</strong> so the institution stays verified.</p>
        <AccountSettingsForm email={ctx.user.email} verifiedDomain={verifiedDomain}/>
      </section>
    </main>
  );
}
