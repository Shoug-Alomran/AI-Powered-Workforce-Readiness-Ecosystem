import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/session";

const controls = [
  ["Role-scoped access", "Implemented", "Student, employer, university, and administrator boundaries are enforced server-side.", "/admin/governance"],
  ["Human evidence approval", "Implemented", "Automated extraction remains advisory until a named administrator records a decision.", "/admin/evidence"],
  ["Audit and oversight", "Implemented", "Appeals, overrides, monitoring snapshots, and reviewer attribution are available.", "/admin/governance"],
  ["Data-rights operations", "Implemented", "Access, correction, download, and deletion requests have an operational queue.", "/admin/data-requests"],
  ["Tenant administration", "Partial", "Organizations exist, but delegated tenant administrators and tenant policy configuration are not implemented.", "#roadmap"],
  ["Enterprise identity", "Planned", "SAML SSO and SCIM provisioning require an institutional identity-provider integration.", "#roadmap"],
  ["Integration administration", "Planned", "Managed webhooks, SIS/ATS connectors, credential rotation, and delivery logs require partner systems.", "#roadmap"],
  ["Service operations", "Partial", "Model monitoring exists; uptime objectives, incident response, and customer-facing status reporting need production ownership.", "/admin/monitoring"],
] as const;

export default async function EnterpriseReadinessPage() {
  const ctx = await getCurrentAdmin(); if (!ctx) redirect("/login");
  return <main className="page-shell enterprise-page"><div className="data-row"><div><span className="eyebrow">Enterprise operations</span><h1 className="page-title">Control readiness register</h1></div><Link className="button secondary" href="/admin/dashboard">Return to review queue</Link></div>
    <p className="muted">A transparent inventory of operational controls. “Planned” items are not presented as implemented functionality.</p>
    <section className="enterprise-register">{controls.map(([name,status,detail,href])=><article key={name}><div><h2>{name}</h2><p>{detail}</p></div><span className={`control-status control-${status.toLowerCase()}`}>{status}</span><Link href={href}>Inspect →</Link></article>)}</section>
    <section className="card" id="roadmap"><span className="eyebrow">Partner-dependent roadmap</span><h2>Production adoption gates</h2><div className="grid-3"><div><strong>Identity</strong><p className="muted">Choose an institutional IdP, configure SAML metadata, test provisioning and emergency access.</p></div><div><strong>Integrations</strong><p className="muted">Agree SIS/ATS schemas, least-privilege credentials, retry behavior, and reconciliation ownership.</p></div><div><strong>Service management</strong><p className="muted">Approve uptime objectives, escalation paths, incident communications, recovery testing, and support coverage.</p></div></div></section>
  </main>;
}
