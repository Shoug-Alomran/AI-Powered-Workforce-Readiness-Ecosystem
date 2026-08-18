import Link from "next/link";
import Image from "next/image";
import { getCurrentUser } from "@/lib/session";

const anchors = [["Solutions", "solutions"], ["How it Works", "how-it-works"], ["Responsible AI", "ai-ethics"]] as const;

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
      {anchors.map(([label, id]) => <a key={id} href={anchor(id)}>{label}</a>)}
      <Link href="/impact">National Impact</Link>
      <Link href="/team">Team</Link>
      <a href={anchor("metrics")}>Prototype</a>
    </nav>
    <div>
      {user ? <Link href={dashboard}>Open Dashboard</Link> : <Link href="/login">Sign In</Link>}
      <Link className="primary" href={user ? dashboard : "/login/demo"}>{user ? "Continue" : "Explore Prototype"}</Link>
    </div>
  </header>;
}
