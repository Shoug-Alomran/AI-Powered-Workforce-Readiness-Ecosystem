import Link from "next/link";
import { cacheLife } from "next/cache";
import { prisma } from "@/lib/db";
import SiteHeader from "@/components/SiteHeader";
import { allSkillNames } from "@/lib/careerTracks";

const principles=[["⊙","Explainable AI","No black boxes. Every recommendation includes clear reasoning based on evidence-based data points."],["♧","Human Oversight","AI acts as a co-pilot. Decisions are reviewed and validated by university career advisors and hiring managers."],["♢","Privacy-First","Privacy-conscious data handling. Students own their data and control who can see their professional profile."]] as const;
const solutions=[["♙","For Students",["Personalized Skill Maps","Verified Digital Credentials","Transparent Job Matches"]],["▣","For Employers",["Data-Driven Talent Sourcing","Reduced Time-to-Hire","Explainable Candidate Ranking"]],["♧","For Universities",["Curriculum-Market Alignment","Graduate Tracking Insights","Automated Accreditation Reporting"]]] as const;
const workflow=[["1","Upload & Extract","Students upload certificates, projects, and experience. Fursah reads each document and proposes the skills it evidences, with the supporting text and a confidence level, for a human to confirm."],["2","Identify & Upskill","Receive a Readiness Score and a custom roadmap to bridge gaps identified by real employer demands."],["3","Match & Hire","Smart matching pairs ready candidates with roles and gives employers an explanation report for each fit."]] as const;

const fallback=[10,8,4] as const;
// The stats band. Cached rather than read per request so the landing page —
// far and away the most visited route — is prerendered and served from the
// CDN. The counts refresh on the cache's schedule, which is ample for figures
// that move a few times a week. The old 2s timeout race is gone: it existed to
// stop a slow database blocking the render, which caching now prevents outright.
async function getHomeCounts(): Promise<readonly [number, number, number]> {
  "use cache";
  cacheLife("hours");
  try {
    return await Promise.all([
      prisma.student.count(),
      prisma.job.count({ where: { status: "open" } }),
      prisma.employer.count(),
    ]);
  } catch {
    return fallback;
  }
}

export default async function Home(){const [students,jobs,employers]=await getHomeCounts();const metrics=[[students,"Demo Students"],[jobs,"Sample Opportunities"],[employers,"Demo Employers"],[allSkillNames().length,"Skills in Taxonomy"]] as const;return <main className="home-design">
  <SiteHeader onHome />
  <section className="home-hero"><div><Link href="/impact" className="home-vision">●　ALIGNING WITH SAUDI VISION 2030</Link><h1><span>Bridging Education &amp; </span><em>Career Readiness</em><span> with Explainable AI.</span></h1><p>Fursah connects students, employers, and universities through a transparent, evidence-based matching engine. Empowering the next generation of Saudi talent.</p><div className="home-ctas"><Link href="/login/demo">Explore Prototype</Link><a href="#how-it-works" className="secondary">▷　Watch Demo</a></div></div><div className="home-preview"><header><i/><i/><i/><small>STUDENT CAREER HUB</small><span/></header><div className="home-preview-body"><section className="home-score"><div><small>Career Readiness Score</small><b>84%</b></div><i><em/></i></section><div className="home-preview-grid"><article><small>VERIFIED SKILLS</small><p><span>Python</span><span>Data Analysis</span></p></article><article><small>GAP ANALYSIS</small><p><span>Public Speaking</span></p></article></div><section className="home-opportunity"><small>RECOMMENDED OPPORTUNITY</small><div><i>▦</i><span><b>AI Research Intern</b><small>Aramco • Dhahran</small></span><em><b>96% Match</b><small>Explainable Rec</small></em></div></section></div></div></section>
  <section className="home-principles">{principles.map(([icon,title,body],i)=><article key={title}><i className={`p${i}`}>{icon}</i><div><h3>{title}</h3><p>{body}</p></div></article>)}</section>
  <section id="solutions" className="home-section home-solutions"><header><h2>A Unified Workforce Ecosystem</h2><p>Fursah creates a feedback loop that benefits all stakeholders in the employment journey.</p></header><div>{solutions.map(([icon,title,items],i)=><article key={title}><i className={`s${i}`}>{icon}</i><h3>{title}</h3><ul>{items.map(label=><li key={label}>✓　{label}</li>)}</ul></article>)}</div></section>
  <section id="how-it-works" className="home-section home-workflow"><h2>Seamless Workflow</h2><div>{workflow.map(([step,title,body])=><article key={step}><b>{step}</b><h3>{title}</h3><p>{body}</p></article>)}</div></section>
  <section id="ai-ethics" className="home-section home-ethics"><div><h2>Explainable AI: The Foundation of Trust</h2><p>Unlike traditional algorithms, Fursah provides “Reasoning Cards” for every recommendation. AI should be a tool for empowerment, not a black box for exclusion.</p><ul><li>✓　No gender, nationality, age or GPA is collected — so none can affect a score</li><li>✓　Published scoring weights, not a trained black box</li><li>✓　Every decision logged with its ruleset version and reasoning</li></ul><a className="home-ethics-doc" href="/fursah-ai-readiness-hackathon-submission.pdf" target="_blank" rel="noopener noreferrer">▤　Read the AI Readiness Report (PDF)</a></div><article><header><b>AI RECOMMENDATION LOGIC</b><span>Confidence: 94%</span></header><div className="home-candidate"><i>S.A.</i><span><b>Sara Al-Otaibi</b><small>Candidate ID: #88219</small></span></div><section><b>Why this match?</b><p>Candidate demonstrated advanced problem solving through CS401 coursework and achieved 98th percentile in the 2024 Coding Olympiad.</p></section><section className="violet"><b>Skill Alignment</b><p><em>Full-Stack Engineering</em> <span>High</span></p><i><em/></i></section></article></section>
  <section id="metrics" className="home-metrics">{metrics.map(([value,label],i)=><div key={label} className={`m${i}`}><b>{value}</b><span>{label}</span></div>)}</section>
  <section className="home-final"><h2>Ready to transform the future of workforce readiness?</h2><p>Start exploring the Fursah prototype today and see how explainable AI is making a difference.</p><div><Link href="/login/demo">Get Started Now</Link><Link href="/support" className="secondary">Contact Us</Link></div></section>
  </main>}
