import { Suspense } from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import BrandBolt from "@/components/BrandBolt";

const anchors = [["Who it’s for", "solutions"], ["How it works", "how-it-works"], ["Trust", "ai-ethics"]] as const;

/**
 * The landing-page navigation bar, shared by every public marketing page so the
 * header stays identical away from `/`. `onHome` keeps the section links as
 * in-page anchors; elsewhere they point back at the matching section on `/`.
 */
// Only the two account links depend on who is viewing. Keeping them behind
// their own boundary lets the rest of the header — and therefore the whole
// marketing page — be prerendered and served from the CDN.
async function SiteHeaderAccount() {
  const user = await getCurrentUser();
  const dashboard = user?.role === "STUDENT" ? "/student/dashboard" : user?.role === "EMPLOYER" ? "/employer/dashboard" : user?.role === "UNIVERSITY" ? "/university/dashboard" : user?.role === "ADMIN" ? "/admin/dashboard" : "/login";
  return <>
    {user ? <Link href={dashboard}>Dashboard</Link> : <Link href="/login">Sign In</Link>}
    <Link className="primary" href={user ? dashboard : "/login/demo"}>{user ? "Open workspace" : "Choose workspace"}</Link>
  </>;
}

export default function SiteHeader({ onHome = false }: { onHome?: boolean }) {
  const anchor = (id: string) => onHome ? `#${id}` : `/#${id}`;
  return <header className="home-nav">
    <Link href="/" className="home-logo"><BrandBolt /><b>FURSAH</b></Link>
    <nav>
      {anchors.map(([label, id]) => <a key={id} href={anchor(id)}>{label}</a>)}
      <Link href="/impact">Impact</Link>
      <Link href="/commercial-readiness">Pilot</Link>
    </nav>
    <div>
      {/* min-height holds the row's height so the streamed-in links do not
          shift the header when they arrive. */}
      <Suspense fallback={<span aria-hidden style={{ display: "inline-block", minHeight: 40 }} />}>
        <SiteHeaderAccount />
      </Suspense>
    </div>
  </header>;
}
