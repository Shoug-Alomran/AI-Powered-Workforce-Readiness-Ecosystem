import { redirect } from "next/navigation";
import Link from "next/link";
import AccountSettingsForm from "@/components/AccountSettingsForm";
import { getCurrentStudent } from "@/lib/session";
import AccountAvatar from "@/components/AccountAvatar";
import ProfileImageForm from "@/components/ProfileImageForm";

export default async function StudentAccountPage() {
  const ctx = await getCurrentStudent();
  if (!ctx) redirect("/login");
  const initials = ctx.user.name.split(" ").map(part => part[0]).slice(0, 2).join("").toUpperCase();

  return <main className="page-shell account-profile-content student-account-page">
    <span className="eyebrow">Account profile</span>
    <h1 className="page-title">Your profile</h1>
    <p className="muted">Review your student identity and securely manage your sign-in information.</p>
    <div className="account-profile-grid">
      <section className="card account-identity"><AccountAvatar initials={initials} className="account-avatar--large"/><div><h2>{ctx.user.name}</h2><p>{ctx.student.university || "University not added"}</p><span>Student account</span></div></section>
      <section className="card account-verification student-account-passport"><span className="eyebrow">Skills Passport</span><h2>{ctx.student.degree || "Build your verified profile"}</h2><p className="muted">Manage skills, evidence, certificates, experience, and projects in your passport.</p><Link className="button secondary" href="/student/profile">Open Skills Passport</Link></section>
    </div>
    <section className="card account-security"><h2>Profile image</h2><p className="muted">Upload an image that will appear in your student header and Skills Passport.</p><ProfileImageForm/></section>
    <section className="card account-security"><h2>Sign-in and security</h2><p className="muted">Update your email address or choose a new password for your account.</p><AccountSettingsForm email={ctx.user.email}/></section>
  </main>;
}
