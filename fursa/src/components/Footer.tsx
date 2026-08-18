import Link from "next/link";
import Image from "next/image";
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
    <section><Link href="/" className="site-footer-brand"><span className="brand-mark"><Image src="/logo.png" alt="" width={353} height={512}/></span><b>FURSAH</b></Link><p data-i18n="footer.tagline">An intelligent AI platform purpose-built for the Saudi workforce ecosystem.</p>{user&&<small>Signed in as {user.name}</small>}</section>
    <section><h2 data-i18n={user?"footer.workspace":"footer.platform"}>{user?"Your Workspace":"Platform"}</h2>{accountLinks?accountLinks.map(([label,href])=><Link href={href} key={href}>{label}</Link>):<><Link href="/#how-it-works" data-i18n="nav.howItWorks">How it Works</Link><Link href="/#ai-ethics" data-i18n="principle.explainable.title">Explainable AI</Link><Link href="/#solutions" data-i18n="footer.skillMapping">Skill Mapping</Link><Link href="/workforce-intelligence" data-i18n="nav.intelligence">Workforce Intelligence</Link><Link href="/impact" data-i18n="nav.impact">National Impact</Link><Link href="/team" data-i18n="footer.team">Our Team</Link></>}</section>
    <section><h2 data-i18n={user?"footer.account":"footer.solutions"}>{user?"Account & Help":"Solutions"}</h2>{user?<><Link href="/support" data-i18n="footer.support">Customer Support</Link>{user.role==="STUDENT"&&<><Link href="/student/privacy">Privacy Controls</Link><Link href="/student/data-rights">Data Requests</Link><Link href="/student/passport-sharing">Passport Sharing</Link></>}</>:<><Link href="/#solutions" data-i18n="solutions.students">For Students</Link><Link href="/#solutions" data-i18n="solutions.employers">For Employers</Link><Link href="/#solutions" data-i18n="solutions.universities">For Universities</Link><Link href="/login" data-i18n="nav.signin">Sign In</Link></>}</section>
    <section><h2 data-i18n="footer.company">Company</h2><Link href="/policies/privacy" data-i18n="footer.privacy">Privacy Policy</Link><Link href="/policies/terms" data-i18n="footer.terms">Terms of Service</Link><Link href="/policies/responsible-ai" data-i18n="nav.responsibleAi">Responsible AI</Link><Link href="/policies/accessibility" data-i18n="footer.accessibility">Accessibility</Link><a href="/fursah-ai-readiness-hackathon-submission.pdf" target="_blank" rel="noopener noreferrer" data-i18n="footer.report">AI Readiness Report (PDF)</a></section>
    <section><h2 data-i18n="footer.contact">Contact</h2><a href="mailto:info@fursah.org">info@fursah.org</a><a href="tel:+966110000000">+966 53 100 7472</a><p data-i18n="footer.location">Riyadh, Saudi Arabia</p></section>
  </div><div className="site-footer-bottom"><span>© {new Date().getFullYear()} Fursah AI. All rights reserved.</span></div></footer>;
}
