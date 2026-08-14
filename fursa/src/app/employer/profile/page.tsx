import { redirect } from "next/navigation";
import EmployerHeader from "@/components/EmployerHeader";
import AccountSettingsForm from "@/components/AccountSettingsForm";
import { getCurrentEmployer } from "@/lib/session";

export default async function EmployerProfile() {
  const ctx = await getCurrentEmployer();
  if (!ctx) redirect("/login");
  const verifiedDomain = ctx.user.email.split("@")[1] ?? "";
  const initials = ctx.user.name.split(" ").map(part=>part[0]).join("").slice(0,2).toUpperCase();
  return <main className="employer-detail-page employer-account-page">
    <EmployerHeader company={ctx.employer.company} userName={ctx.user.name} active="dashboard" pageLabel="Account Profile"/>
    <div className="employer-detail-content account-profile-content">
      <span className="eyebrow">Account profile</span><h1 className="page-title">Your profile</h1><p className="muted">View your organization identity and manage your sign-in details.</p>
      <div className="account-profile-grid">
        <section className="card account-identity"><i>{initials}</i><div><h2>{ctx.user.name}</h2><p>{ctx.employer.company}</p><span>Employer administrator</span></div></section>
        <section className="card account-verification"><span className="eyebrow">Verified organization</span><h2>@{verifiedDomain}</h2><p className="muted">Only email addresses on this domain can be used for this employer account.</p></section>
      </div>
      <section className="card account-security"><h2>Sign-in and security</h2><p className="muted">Changing your email requires continued access to your organization&apos;s verified domain.</p><AccountSettingsForm email={ctx.user.email} verifiedDomain={verifiedDomain}/></section>
    </div>
  </main>;
}
