import Link from "next/link";
import { logout } from "@/actions/auth";
import AccountAvatar from "@/components/AccountAvatar";
import BrandBolt from "@/components/BrandBolt";

function HeaderIcon({name}:{name:"search"}) {
  return <svg className="erd-svg" viewBox="0 0 24 24" aria-hidden="true">
    {name==="search"&&<><circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4 4"/></>}
  </svg>;
}

export default function EmployerHeader({company,userName,active,pageLabel}:{company:string;userName:string;active:"dashboard"|"post";pageLabel?:string}) {
  const initials=userName.split(" ").map(part=>part[0]).join("").slice(0,2);
  const currentPage=pageLabel??(active==="post"?"Create Job Opportunity":"Employer Dashboard");
  return <header className="erd-top employer-shared-header">
    <Link href="/employer/dashboard" className="erd-brand"><BrandBolt/><b>FURSAH</b></Link>
    <Link href="/employer/dashboard" className="erd-org"><small>ORGANIZATION　/　{currentPage.toUpperCase()}</small><strong>{company||"Global Talent Acquisition"}　<em>ENTERPRISE</em></strong></Link>
    <nav className="erd-nav" aria-label="Employer navigation">
      <Link className={active==="dashboard"?"active":""} href="/employer/dashboard">Hiring</Link>
      <Link href="/employer/dashboard#candidate-ranking">Candidates</Link>
      <Link className={active==="post"?"active":""} href="/employer/jobs/new">New role</Link>
    </nav>
    <form className="erd-search" action="/employer/dashboard"><HeaderIcon name="search"/><input name="q" aria-label="Search employer roles" placeholder="Search roles or skills"/></form>
    <div className="erd-user"><Link className="erd-user-profile" href="/employer/profile"><span><b>{userName}</b><small>HR Director</small></span><AccountAvatar initials={initials}/></Link><form action={logout}><button type="submit">Log out</button></form></div>
  </header>;
}
