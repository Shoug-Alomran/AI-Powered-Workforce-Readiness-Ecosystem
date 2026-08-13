import Link from "next/link";
import FirebaseAuthPanel from "@/components/auth/FirebaseAuthPanel";
import { firebaseClientConfigured } from "@/lib/firebase-client";
import { firebaseAdminConfigured } from "@/lib/firebase-admin";

export default function LoginPage() {
  return <main className="auth-page"><div className="auth-container">
    <Link href="/" className="auth-brand"><img src="/logo.svg" alt="" width={34} height={34} /> Fursah</Link>
    <div className="auth-heading"><span className="eyebrow" data-i18n="auth.eyebrow">Secure account access</span><h1 data-i18n="auth.title">Build your path to career readiness.</h1><p data-i18n="auth.lead">Sign in or create an account as a student, employer, or university representative.</p></div>
    <FirebaseAuthPanel configured={firebaseClientConfigured} serverReady={firebaseAdminConfigured} />
    <Link href="/login/demo" className="demo-link"><span data-i18n="auth.demo">Want to explore first? Click here to view prepared users.</span></Link>
  </div></main>;
}
