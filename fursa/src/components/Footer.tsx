import Link from "next/link";
import { getCurrentUser } from "@/lib/session";

const roleLinks = {
  STUDENT: [["Dashboard","/student/dashboard"],["Opportunities","/student/jobs"],["Career Roadmap","/student/roadmap"],["Skills Passport","/student/profile"]],
  EMPLOYER: [["Employer Dashboard","/employer/dashboard"],["Post a Job","/employer/jobs/new"]],
  UNIVERSITY: [["University Dashboard","/university/dashboard"],["Courses & Certifications","/university/curriculum"],["Workforce Demand","/university/job-demand"],["Action Plan","/university/actions"]],
  ADMIN: [["Admin Dashboard","/admin/dashboard"],["Career Taxonomy","/admin/career-tracks"],["Trust & Governance","/admin/governance"],["Model Monitoring","/admin/monitoring"]],
} as const;

export default async function Footer(){
  const user=await getCurrentUser();
  const accountLinks=user?roleLinks[user.role]:null;
  return <footer className="site-footer"><div className="site-footer-grid">
    <section><Link href="/" className="site-footer-brand"><span>ϟ</span><b>FURSAH</b></Link><p>An intelligent AI platform purpose-built for the Saudi workforce ecosystem.</p>{user&&<small>Signed in as {user.name}</small>}</section>
    <section><h2>{user?"Your Workspace":"Platform"}</h2>{accountLinks?accountLinks.map(([label,href])=><Link href={href} key={href}>{label}</Link>):<><Link href="/#how-it-works">How it Works</Link><Link href="/#ai-ethics">Explainable AI</Link><Link href="/#solutions">Skill Mapping</Link><Link href="/workforce-intelligence">Workforce Intelligence</Link></>}</section>
    <section><h2>{user?"Account & Help":"Solutions"}</h2>{user?<><Link href="/support">Customer Support</Link>{user.role==="STUDENT"&&<><Link href="/student/privacy">Privacy Controls</Link><Link href="/student/data-rights">Data Requests</Link><Link href="/student/passport-sharing">Passport Sharing</Link></>}</>:<><Link href="/#solutions">For Students</Link><Link href="/#solutions">For Employers</Link><Link href="/#solutions">For Universities</Link><Link href="/login">Sign In</Link></>}</section>
    <section><h2>Company</h2><Link href="/policies/privacy">Privacy Policy</Link><Link href="/policies/terms">Terms of Service</Link><Link href="/policies/responsible-ai">Responsible AI</Link><Link href="/policies/accessibility">Accessibility</Link></section>
    <section><h2>Contact</h2><a href="mailto:info@fursah.sa">info@fursah.sa</a><a href="tel:+966110000000">+966 11 000 0000</a><p>Riyadh, Saudi Arabia</p></section>
  </div><div className="site-footer-bottom"><span>© {new Date().getFullYear()} Fursah AI. All rights reserved.</span></div></footer>;
}
