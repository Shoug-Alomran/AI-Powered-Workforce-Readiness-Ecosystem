import Link from "next/link";
import { prisma } from "@/lib/db";
import { logout } from "@/actions/auth";
import { getCurrentEmployer } from "@/lib/session";
import AccountAvatar from "@/components/AccountAvatar";
import BrandBolt from "@/components/BrandBolt";
import PortalNotifications from "@/components/PortalNotifications";

function HeaderIcon({name}:{name:"search"}) {
  return <svg className="erd-svg" viewBox="0 0 24 24" aria-hidden="true">
    {name==="search"&&<><circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4 4"/></>}
  </svg>;
}

export default async function EmployerHeader({company,userName,active,pageLabel}:{company:string;userName:string;active:"dashboard"|"post";pageLabel?:string}) {
  // Account verification and incoming applications are written as
  // notifications for this account; without a bell they were unreadable.
  const ctx=await getCurrentEmployer();
  const notifications=ctx?await prisma.notification.findMany({where:{userId:ctx.user.id},orderBy:{createdAt:"desc"},take:8}):[];
  const initials=userName.split(" ").map(part=>part[0]).join("").slice(0,2);
  const currentPage=pageLabel??(active==="post"?"Create Job Opportunity":"Employer Dashboard");
  return <header className="erd-top employer-shared-header">
    <Link href="/employer/dashboard" className="erd-brand"><BrandBolt/><b>FURSAH</b></Link>
    <Link href="/employer/dashboard" className="erd-org"><small>ORGANIZATION　/　{currentPage.toUpperCase()}</small><strong>{company||"Global Talent Acquisition"}　<em>ENTERPRISE</em></strong></Link>
    <nav className="erd-nav" aria-label="Employer navigation">
      <Link className={active==="dashboard"?"active":""} href="/employer/dashboard">Hiring</Link>
      <Link className={active==="post"?"active":""} href="/employer/jobs/new">New role</Link>
    </nav>
    <form className="erd-search" action="/employer/dashboard"><HeaderIcon name="search"/><input name="q" aria-label="Search employer roles" placeholder="Search roles or skills"/></form>
    <div className="erd-user"><PortalNotifications emptyHint="Account verification decisions and new applications appear here." notifications={notifications.map(notification=>({id:notification.id,title:notification.title,body:notification.body,read:notification.readAt!==null,createdAt:notification.createdAt.toISOString()}))}/><Link className="erd-user-profile" href="/employer/profile"><span><b>{userName}</b><small>HR Director</small></span><AccountAvatar initials={initials}/></Link><form action={logout}><button type="submit">Log out</button></form></div>
  </header>;
}
