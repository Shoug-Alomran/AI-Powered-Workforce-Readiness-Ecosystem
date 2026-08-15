import Link from "next/link";
import Image from "next/image";
import { logout } from "@/actions/auth";
import AccountAvatar from "@/components/AccountAvatar";

function HeaderIcon({name}:{name:"search"}) {
  return <svg className="erd-svg" viewBox="0 0 24 24" aria-hidden="true">
    {name==="search"&&<><circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4 4"/></>}
  </svg>;
}

export default function EmployerHeader({company,userName,active,pageLabel}:{company:string;userName:string;active:"dashboard"|"post";pageLabel?:string}) {
  const initials=userName.split(" ").map(part=>part[0]).join("").slice(0,2);
  const currentPage=pageLabel??(active==="post"?"Create Job Opportunity":"Employer Dashboard");
  return <header className="erd-top employer-shared-header">
    <Link href="/employer/dashboard" className="erd-brand"><span className="brand-mark"><Image src="/logo.png" alt="" width={353} height={512}/></span><b>Fursah</b></Link>
    <Link href="/employer/dashboard" className="erd-org"><small>ORGANIZATION　/　{currentPage.toUpperCase()}</small><strong>{company||"Global Talent Acquisition"}　<em>ENTERPRISE</em></strong></Link>
    <nav className="erd-nav" aria-label="Employer navigation">
      <Link className={active==="dashboard"?"active":""} href="/employer/dashboard">Dashboard</Link>
      <Link className={active==="post"?"active":""} href="/employer/jobs/new">Post a Job</Link>
    </nav>
    <form className="erd-search" action="/employer/dashboard"><HeaderIcon name="search"/><input name="q" aria-label="Search employer roles" placeholder="Search roles"/></form>
    <div className="erd-user"><Link className="erd-user-profile" href="/employer/profile"><span><b>{userName}</b><small>HR Director</small></span><AccountAvatar initials={initials}/></Link><form action={logout}><button type="submit">Log out</button></form></div>
  </header>;
}
