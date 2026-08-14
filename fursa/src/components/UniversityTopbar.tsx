"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/actions/auth";
import AccountAvatar from "@/components/AccountAvatar";

const links = [
  ["/university/dashboard", "Dashboard"], ["/university/curriculum", "Courses & Certifications"],
  ["/university/job-demand", "Workforce Demand"], ["/university/actions", "Action Plan"],
];
const titles:Record<string,[string,string]>={
  "/university/dashboard":["University Dashboard","Workforce readiness overview"],
  "/university/curriculum":["Courses & Certifications","Curriculum Management"],
  "/university/offerings":["Add Course","Curriculum Management"],
  "/university/job-demand":["Workforce Demand Intelligence","Live labor-market signals"],
  "/university/actions":["Curriculum Action Plan","Transforming intelligence into academic excellence"],
  "/university/actions/new":["Create New Action","Curriculum Action Plan"],
  "/university/student-readiness":["Student Readiness","Cohort skills and career preparedness"],
  "/university/analytics":["Analytics","Institutional workforce outcomes"],
  "/university/profile":["University Profile","Institution information"], "/university/settings":["Settings","Portal preferences"],
};
export default function UniversityTopbar({institution,personName}:{institution:string;personName:string}){
  const pathname=usePathname()||"/university/dashboard"; const [title,subtitle]=titles[pathname]||[institution,"Fursah Intelligence Portal"];
  const initials=personName.split(" ").map(x=>x[0]).join("").slice(0,2).toUpperCase();
  return <header className="uni-only-header"><div className="uni-only-main">
    <Link className="uni-only-brand" href="/university/dashboard"><span>🎓</span><b>FURSAH</b></Link>
    <nav>{links.map(([href,label])=><Link className={pathname===href||(href==="/university/actions"&&pathname.startsWith("/university/actions/"))?"active":""} href={href} key={href}>{label}</Link>)}</nav>
    <div className="uni-only-user"><Link href="/university/profile"><AccountAvatar initials={initials||"U"}/><span><b>{personName}</b><small>{institution}</small></span></Link><Link href="/university/settings" aria-label="Settings">⚙</Link><form action={logout}><button type="submit">Log out</button></form></div>
  </div><div className="uni-only-context"><div><small>{subtitle}</small><h1>{title}</h1></div><div className="uni-only-actions">
    {pathname==="/university/actions"&&<><a href="/api/university/export">⇧ Export Report</a><Link className="primary" href="/university/actions/new">＋ Create New Action</Link></>}
    {pathname==="/university/curriculum"&&<><a href="/api/university/export">⇩ Export</a><Link className="primary" href="/university/offerings#add-course">⊕ Add Course</Link></>}
    {pathname==="/university/job-demand"&&<a href="/api/university/export">⚑ Generate Report</a>}
  </div></div></header>;
}
