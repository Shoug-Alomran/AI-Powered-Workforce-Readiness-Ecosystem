import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import AccountAvatar from "@/components/AccountAvatar";
import ProfileImageForm from "@/components/ProfileImageForm";
import AccountSettingsForm from "@/components/AccountSettingsForm";

export default async function AdminProfilePage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/login");
  const initials = user.name.split(" ").map(part => part[0]).join("").slice(0, 2).toUpperCase() || "AD";
  return <main className="page-shell account-profile-content">
    <span className="eyebrow">Administrator account</span>
    <h1 className="page-title">Your profile</h1>
    <p className="muted">Manage the identity and credentials used in the Fursa governance workspace.</p>
    <section className="card account-identity" style={{ marginTop: 24 }}>
      <AccountAvatar initials={initials} className="account-avatar--large"/>
      <div><h2>{user.name}</h2><p>{user.email}</p><span>Platform administrator</span></div>
    </section>
    <section className="card account-security"><h2>Profile photo</h2><p className="muted">Add a recognizable image for administrative reviews and audit records.</p><ProfileImageForm/></section>
    <section className="card account-security"><h2>Sign-in and security</h2><p className="muted">Update the email address or password associated with this administrator account.</p><AccountSettingsForm email={user.email}/></section>
  </main>;
}
