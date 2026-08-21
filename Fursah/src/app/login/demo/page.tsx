import Link from "next/link";
import { prisma } from "@/lib/db";
import { loginAsUser } from "@/actions/auth";
import { isDemoAccountEmail } from "@/lib/demoAccounts";

export const instant = false;

// Read the prepared accounts on each request. This page is an operational demo
// switcher, so showing a stale list after reseeding is worse than the tiny user
// query required to keep it accurate.
//
// Every prepared role gets a place on the page. The cohort seed adds dozens of
// filler students, so a plain "first N by role" slice pushed the university
// accounts off the list entirely and left the administrator surviving only by
// where ADMIN happens to sort. Each role is taken separately instead, and
// students are taken oldest-first so the named scenario accounts come before
// the cohort filler.
const ROLE_ORDER = ["ADMIN", "EMPLOYER", "UNIVERSITY", "STUDENT"] as const;
const ROLE_LIMIT: Record<(typeof ROLE_ORDER)[number], number> = {
  ADMIN: 2,
  EMPLOYER: 6,
  UNIVERSITY: 4,
  STUDENT: 12,
};

async function getDemoUsers() {
  const users = await prisma.user.findMany({ orderBy: [{ createdAt: "asc" }, { name: "asc" }] });
  // `loginAsUser` refuses anything outside the prepared demo set, so listing a
  // non-demo account here would render a button that throws when pressed.
  const openable = users.filter((user) => user.active && isDemoAccountEmail(user.email));
  return ROLE_ORDER.flatMap((role) =>
    openable.filter((user) => user.role === role).slice(0, ROLE_LIMIT[role]),
  );
}

export default async function DemoUsersPage() {
  const users = await getDemoUsers();
  const adminUsers = users.filter((user) => user.role === "ADMIN");
  const workspaceUsers = users.filter((user) => user.role !== "ADMIN");
  const roleLabel={STUDENT:"Student",EMPLOYER:"Employer",UNIVERSITY:"University",ADMIN:"Administrator"} as const;
  const roleDescription={STUDENT:"Explore career readiness and opportunities",EMPLOYER:"Review candidates and manage roles",UNIVERSITY:"Manage curriculum and workforce alignment",ADMIN:"Review credentials and platform governance"} as const;
  const renderAccount = (user: (typeof users)[number]) => {
    const role=roleLabel[user.role]; const initials=user.name.split(" ").map(part=>part[0]).join("").slice(0,2).toUpperCase();
    return <form action={loginAsUser.bind(null,user.id)} className={`demo-account role-${user.role.toLowerCase()}`} key={user.id}>
      <i>{initials}</i><div><span>{role}</span><strong>{user.name}</strong><small>{user.email}</small><p>{roleDescription[user.role]}</p></div><button type="submit">Continue <b aria-hidden>→</b></button>
    </form>;
  };
  return <main className="demo-page"><div className="demo-shell">
    <Link href="/login" className="demo-back">← Back to sign in</Link>
    <header className="demo-heading"><span className="eyebrow">Prepared prototype users</span><h1>Choose a demo account</h1><p>Explore each Fursah workspace without entering a password.</p></header>
    <div className="demo-notice"><span>✦</span><div><strong>Prototype access</strong><p>These accounts contain prepared demonstration data. Admin shortcuts must be disabled before production launch.</p></div></div>
    <section className="demo-admin-access" aria-labelledby="demo-admin-heading">
      <div><span>Platform administration</span><h2 id="demo-admin-heading">Administrator access</h2></div>
      {adminUsers.length > 0 ? adminUsers.map(renderAccount) : <p className="demo-admin-missing">The prepared administrator account is unavailable. Run the demo seed before presenting this environment.</p>}
    </section>
    <section className="demo-workspaces" aria-labelledby="demo-workspaces-heading">
      <h2 id="demo-workspaces-heading">Workspace accounts</h2>
      <div className="demo-accounts">{workspaceUsers.map(renderAccount)}</div>
    </section>
    <p className="demo-privacy">Demo activity stays within the prepared prototype environment.</p>
  </div></main>;
}
