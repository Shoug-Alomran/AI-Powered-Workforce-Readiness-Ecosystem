import Link from "next/link";
import { prisma } from "@/lib/db";
import { loginAsUser } from "@/actions/auth";

export default async function DemoUsersPage() {
  const users = await prisma.user.findMany({ orderBy: [{ role: "asc" }, { name: "asc" }], take: 20 });
  return <main className="page-shell" style={{maxWidth:760}}><Link href="/login" className="link">← Back to sign in</Link><span className="eyebrow" data-i18n="demo.eyebrow" style={{display:"block",marginTop:28}}>Prepared prototype users</span><h1 className="page-title" data-i18n="demo.title">Choose a demo account</h1><p className="muted">Explore the student, employer, university, and certificate-review administrator experiences without entering a password.</p><div className="notice" style={{marginTop:18}}>Prototype only: the administrator shortcut must be disabled before production launch.</div><section className="card" style={{marginTop:24}}>{users.map(user => <form action={loginAsUser.bind(null, user.id)} className="data-row" key={user.id}><div><strong>{user.name}</strong><div className="muted" style={{fontSize:12}}>{user.email} · {user.role === "ADMIN" ? "Certificate review administrator" : `${user.role.toLowerCase()} demo`}</div></div><button className={`button ${user.role === "ADMIN" ? "primary" : "secondary"}`}>Continue as {user.role === "STUDENT" ? "student" : user.role === "EMPLOYER" ? "employer" : user.role === "ADMIN" ? "admin" : "university"}</button></form>)}</section></main>;
}
