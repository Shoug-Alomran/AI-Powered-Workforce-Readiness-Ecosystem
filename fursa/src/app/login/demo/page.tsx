import Link from "next/link";
import { cacheLife } from "next/cache";
import { prisma } from "@/lib/db";
import { loginAsUser } from "@/actions/auth";
import { isDemoAccountEmail } from "@/lib/demoAccounts";

// The prepared demo accounts change only when the prototype data is reseeded,
// so the list is cached and this page prerenders instead of querying on every
// visit.
async function getDemoUsers() {
  "use cache";
  cacheLife("hours");
  const users = await prisma.user.findMany({ orderBy: [{ role: "asc" }, { name: "asc" }] });
  // `loginAsUser` refuses anything outside the prepared demo set, so listing a
  // non-demo account here would render a button that throws when pressed.
  return users.filter((user) => user.active && isDemoAccountEmail(user.email)).slice(0, 24);
}

export default async function DemoUsersPage() {
  const users = await getDemoUsers();
  const roleLabel={STUDENT:"Student",EMPLOYER:"Employer",UNIVERSITY:"University",ADMIN:"Administrator"} as const;
  const roleDescription={STUDENT:"Explore career readiness and opportunities",EMPLOYER:"Review candidates and manage roles",UNIVERSITY:"Manage curriculum and workforce alignment",ADMIN:"Review credentials and platform governance"} as const;
  return <main className="demo-page"><div className="demo-shell">
    <Link href="/login" className="demo-back">← Back to sign in</Link>
    <header className="demo-heading"><span className="eyebrow">Prepared prototype users</span><h1>Choose a demo account</h1><p>Explore each Fursah workspace without entering a password.</p></header>
    <div className="demo-notice"><span>✦</span><div><strong>Prototype access</strong><p>These accounts contain prepared demonstration data. Admin shortcuts must be disabled before production launch.</p></div></div>
    <section className="demo-accounts" aria-label="Prepared demo accounts">{users.map(user => {
      const role=roleLabel[user.role]; const initials=user.name.split(" ").map(part=>part[0]).join("").slice(0,2).toUpperCase();
      return <form action={loginAsUser.bind(null,user.id)} className={`demo-account role-${user.role.toLowerCase()}`} key={user.id}>
        <i>{initials}</i><div><span>{role}</span><strong>{user.name}</strong><small>{user.email}</small><p>{roleDescription[user.role]}</p></div><button type="submit">Continue <b aria-hidden>→</b></button>
      </form>;
    })}</section>
    <p className="demo-privacy">Demo activity stays within the prepared prototype environment.</p>
  </div></main>;
}
