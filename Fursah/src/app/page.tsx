import Link from "next/link";
import { cacheLife } from "next/cache";
import { prisma } from "@/lib/db";
import SiteHeader from "@/components/SiteHeader";
import { allSkillNames } from "@/lib/careerTracks";

const principles=[["⊙","Explainable AI","No black boxes. Every recommendation includes clear reasoning based on evidence-based data points."],["♧","Human Oversight","AI acts as a co-pilot. Decisions are reviewed and validated by university career advisors and hiring managers."],["♢","Privacy-First","Privacy-conscious data handling. Students own their data and control who can see their professional profile."]] as const;
const solutions=[["student","I’m a student",["Prove what you can do","See what is missing","Take the next best action"]],["employer","I’m hiring",["Define evidence-based requirements","Compare qualified applicants","Record a human decision"]],["university","I represent a university",["See verified cohort gaps","Connect demand to curriculum","Assign measurable interventions"]]] as const;
const workflow=[["1","Upload & Extract","Students upload certificates, projects, and experience. Fursah reads each document and proposes the skills it evidences, with the supporting text and a confidence level, for a human to confirm."],["2","Identify & Upskill","Receive a Readiness Score and a custom roadmap to bridge gaps identified by real employer demands."],["3","Match & Hire","Smart matching pairs ready candidates with roles and gives employers an explanation report for each fit."]] as const;

const fallback=[10,8,4] as const;
function SolutionIcon({kind}:{kind:(typeof solutions)[number][0]}){
  if(kind==="student") return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="7" r="3"/><path d="M5.5 20v-1.5a6.5 6.5 0 0 1 13 0V20M8.5 20v-2.5m7 2.5v-2.5"/></svg>;
  if(kind==="employer") return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7M3 12h18M10 11v2h4v-2"/></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 9 9-5 9 5-9 5-9-5Z"/><path d="M6 11.5V18m4-4.5V18m4-4.5V18m4-6.5V18M4 20h16"/></svg>;
}
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

export default async function Home(){const [students,jobs,employers]=await getHomeCounts();const metrics=[[students,"Illustrative student records"],[jobs,"Illustrative opportunities"],[employers,"Illustrative employers"],[allSkillNames().length,"Skills in shared taxonomy"]] as const;return <main className="home-design">
  <SiteHeader onHome />
  <section className="home-hero"><div><Link href="/impact" className="home-vision">●　BUILT FOR SAUDI WORKFORCE READINESS</Link><h1><span>Turn verified student evidence into </span><em>workforce-ready talent.</em></h1><p>Fursah helps students prove readiness, employers identify qualified applicants, and universities close curriculum gaps—all through one inspectable evidence layer.</p><div className="home-ctas"><Link href="/login/demo">Choose your workspace</Link><a href="#how-it-works" className="secondary">See how evidence flows</a></div><p className="home-hero-proof">Deterministic scoring · Grounded AI explanations · Human decisions</p></div><div className="home-preview"><header><i/><i/><i/><small>STUDENT CAREER HUB</small><span/></header><div className="home-preview-body"><section className="home-score"><div><small>Career Readiness Score</small><b>84%</b></div><i><em/></i></section><div className="home-preview-grid"><article><small>VERIFIED SKILLS</small><p><span>Python</span><span>Data Analysis</span></p></article><article><small>NEXT ACTION</small><p><span>Evidence public speaking</span></p></article></div><section className="home-opportunity"><small>RECOMMENDED OPPORTUNITY</small><div><i>▦</i><span><b>AI Research Intern</b><small>Aramco • Dhahran</small></span><em><b>5/6 requirements</b><small>Evidence-linked</small></em></div></section></div></div></section>
  <section className="home-principles">{principles.map(([icon,title,body],i)=><article key={title}><i className={`p${i}`}>{icon}</i><div><h3>{title}</h3><p>{body}</p></div></article>)}</section>
  <section id="solutions" className="home-section home-solutions"><header><h2>Start with the decision you need to make</h2><p>Every workspace turns verified evidence into a specific next action.</p></header><div>{solutions.map(([icon,title,items],i)=><article key={title}><i className={`s${i}`}><SolutionIcon kind={icon}/></i><h3>{title}</h3><ul>{items.map(label=><li key={label}>✓　{label}</li>)}</ul><Link href="/login/demo">Open workspace →</Link></article>)}</div></section>
  <section id="how-it-works" className="home-section home-workflow"><h2>Seamless Workflow</h2><div>{workflow.map(([step,title,body])=><article key={step}><b>{step}</b><h3>{title}</h3><p>{body}</p></article>)}</div></section>
  <section id="ai-ethics" className="home-section home-ethics"><div><h2>Explainable AI: The Foundation of Trust</h2><p>Unlike traditional algorithms, Fursah provides “Reasoning Cards” for every recommendation. AI should be a tool for empowerment, not a black box for exclusion.</p><ul><li>✓　No gender, nationality, age or GPA is collected — so none can affect a score</li><li>✓　Published scoring weights, not a trained black box</li><li>✓　Every decision logged with its ruleset version and reasoning</li></ul><a className="home-ethics-doc" href="/fursah-ai-readiness-hackathon-submission.pdf" target="_blank" rel="noopener noreferrer">▤　Read the AI Readiness Report (PDF)</a></div><article><header><b>AI RECOMMENDATION LOGIC</b><span>Confidence: 94%</span></header><div className="home-candidate"><i>S.A.</i><span><b>Sara Al-Otaibi</b><small>Candidate ID: #88219</small></span></div><section><b>Why this match?</b><p>Candidate demonstrated advanced problem solving through CS401 coursework and achieved 98th percentile in the 2024 Coding Olympiad.</p></section><section className="violet"><b>Skill Alignment</b><p><em>Full-Stack Engineering</em> <span>High</span></p><i><em/></i></section></article></section>
  <section id="metrics" className="home-metrics">{metrics.map(([value,label],i)=><div key={label} className={`m${i}`}><b>{value}</b><span>{label}</span></div>)}</section>
  <section className="home-final"><h2>Start with one readiness decision.</h2><p>Explore an illustrative workspace, inspect the evidence behind every result, and follow the next action through to completion.</p><div><Link href="/login/demo">Choose a workspace</Link><Link href="/support" className="secondary">Discuss a controlled pilot</Link></div></section>
  </main>}
