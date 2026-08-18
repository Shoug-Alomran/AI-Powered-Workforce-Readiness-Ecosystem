import Link from "next/link";
import Image from "next/image";
import { getCurrentUser } from "@/lib/session";

const anchors = [["Solutions", "solutions", "nav.solutions"], ["How it Works", "how-it-works", "nav.howItWorks"], ["Responsible AI", "ai-ethics", "nav.responsibleAi"]] as const;

/**
 * The landing-page navigation bar, shared by every public marketing page so the
 * header stays identical away from `/`. `onHome` keeps the section links as
 * in-page anchors; elsewhere they point back at the matching section on `/`.
 */
export default async function SiteHeader({ onHome = false }: { onHome?: boolean }) {
  const user = await getCurrentUser();
  const dashboard = user?.role === "STUDENT" ? "/student/dashboard" : user?.role === "EMPLOYER" ? "/employer/dashboard" : user?.role === "UNIVERSITY" ? "/university/dashboard" : user?.role === "ADMIN" ? "/admin/dashboard" : "/login";
  const anchor = (id: string) => onHome ? `#${id}` : `/#${id}`;
  return <header className="home-nav">
    <Link href="/" className="home-logo"><span className="brand-mark"><Image src="/logo.png" alt="" width={353} height={512} priority /></span><b>FURSAH</b></Link>
    <nav>
      {anchors.map(([label, id, key]) => <a key={id} href={anchor(id)} data-i18n={key}>{label}</a>)}
      <Link href="/impact" data-i18n="nav.impact">National Impact</Link>
      <Link href="/team" data-i18n="nav.team">Team</Link>
      <a href={anchor("metrics")} data-i18n="nav.prototype">Prototype</a>
    </nav>
    <div>
      {user ? <Link href={dashboard} data-i18n="nav.dashboard">Open Dashboard</Link> : <Link href="/login" data-i18n="nav.signin">Sign In</Link>}
      <Link className="primary" href={user ? dashboard : "/login/demo"} data-i18n={user ? "nav.continue" : "cta.explore"}>{user ? "Continue" : "Explore Prototype"}</Link>
    </div>
  </header>;
}
