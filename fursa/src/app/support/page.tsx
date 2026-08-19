import { Suspense } from "react";
import Link from "next/link";
import { createSupportTicket } from "@/actions/support";

// The only per-request thing on this page is the post-submit confirmation, so
// it alone sits behind a boundary and the rest of the page prerenders.
async function SubmittedNotice({ searchParams }: { searchParams: Promise<{ submitted?: string }> }) {
  const { submitted } = await searchParams;
  if (submitted !== "1") return null;
  return <div className="notice" style={{ marginTop: 18 }}>Your support ticket was received. The support team can now assign, track, and resolve it.</div>;
}

export default function SupportPage({ searchParams }: { searchParams: Promise<{ submitted?: string }> }) {
  return <main className="page-shell reading-page"><span className="eyebrow">Help center</span><h1 className="page-title">Customer support</h1><p className="muted">Create a trackable request for account, evidence, opportunity, privacy, accessibility, or AI-result assistance.</p><Suspense fallback={null}><SubmittedNotice searchParams={searchParams} /></Suspense><div className="grid-2" style={{ marginTop: 26, alignItems: "start" }}><section className="card"><h2>Create a support ticket</h2><form action={createSupportTicket} className="form-grid"><label>Name<input className="input" name="name" required/></label><label>Email<input className="input" name="email" type="email" required/></label><label>Category<select className="input" name="category"><option value="ACCOUNT">Account</option><option value="EVIDENCE">Evidence verification</option><option value="APPLICATION">Application or employer</option><option value="AI_RESULT">AI-generated result</option><option value="ACCESSIBILITY">Accessibility</option><option value="PRIVACY">Privacy or data rights</option><option value="SAFETY">Urgent safety issue</option></select></label><label>Subject<input className="input" name="subject" required/></label><label>Message<textarea className="input" name="message" required/></label><button className="button primary">Submit ticket</button></form></section><section className="card"><h2>Specialized help</h2><div className="data-row"><div><strong>Challenge an AI result</strong><div className="muted">Request a human review of a readiness score or match.</div></div><Link className="link" href="/student/privacy">Appeal</Link></div><div className="data-row"><div><strong>Access, download, correct, or delete data</strong><div className="muted">Use the dedicated privacy workflow.</div></div><Link className="link" href="/student/data-rights">Data rights</Link></div><div className="data-row"><div><strong>Arabic support</strong><div className="muted">افتح نموذج الدعم باللغة العربية.</div></div><Link className="link" href="/ar/support">العربية</Link></div><div className="notice" style={{ marginTop: 18 }}>Do not submit passwords, identity documents, or confidential evidence in a support message.</div></section></div></main>;
}
