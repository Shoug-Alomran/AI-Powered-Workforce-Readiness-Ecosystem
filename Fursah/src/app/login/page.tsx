import Link from "next/link";
import FirebaseAuthPanel from "@/components/auth/FirebaseAuthPanel";
import { firebaseClientConfigured } from "@/lib/firebase-client";
import { firebaseAdminConfigured } from "@/lib/firebase-admin";

export default function LoginPage() {
  return <main className="auth-page"><section className="auth-layout">
    <aside className="auth-intro">
      <div><span className="eyebrow">SECURE ACCOUNT ACCESS</span><h1>One platform for workforce readiness.</h1><p>Connect education, verified skills, and employment outcomes through a trusted Saudi workforce ecosystem.</p></div>
      <div className="auth-audiences"><article><b>Students</b><span>Build a verified skills passport and discover career opportunities.</span></article><article><b>Employers</b><span>Find evidence-backed talent and manage responsible hiring.</span></article><article><b>Universities</b><span>Align curricula with workforce demand and measurable outcomes.</span></article></div>
      <div className="auth-ai-note"><span>✦</span><p><b>Explainable AI by design</b>Recommendations support human decisions; they never replace them.</p></div>
    </aside>
    <div className="auth-form-panel">
      <div className="auth-form-heading"><span>WELCOME TO FURSAH</span><h2>Access your workspace</h2><p>Use your verified account or create one for your role.</p></div>
      <FirebaseAuthPanel configured={firebaseClientConfigured} serverReady={firebaseAdminConfigured} />
      <Link href="/login/demo" className="demo-link"><span>Explore with a prepared demo account</span><b>→</b></Link>
      <p className="auth-terms">By continuing, you agree to FURSAH&apos;s <Link href="/policies/terms">Terms of Service</Link> and <Link href="/policies/privacy">Privacy Policy</Link>.</p>
    </div>
  </section></main>;
}
