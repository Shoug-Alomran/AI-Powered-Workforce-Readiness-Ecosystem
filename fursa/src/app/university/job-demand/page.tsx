import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUniversity } from "@/lib/session";

const skillCards=[
  ["Cloud Infrastructure","AWS, Azure, GCP","CRITICAL GAP","94","+28% YoY","4,820","Low (35%)","Update Curriculum"],
  ["Data Science & AI","ML, Python, R","HIGH DEMAND","88","+114% YoY","2,140","Moderate (62%)","Review Courses"],
  ["Cybersecurity Ops","SOAR, SIEM, Forensics","EMERGING","82","+42% YoY","1,890","Low (28%)","Add Certificate"],
];

const skillDestinations=[
  "/university/curriculum#course-cloud-infrastructure",
  "/university/curriculum#course-data-science-ai",
  "/university/curriculum#certification-mapping",
];

export default async function UniversityJobDemand(){
  const ctx=await getCurrentUniversity(); if(!ctx) redirect("/login");
  const jobs=await prisma.job.findMany({where:{status:"open"},include:{employer:true}});
  const employers=new Set(jobs.map(j=>j.employerId)).size;
  const avg=jobs.length?(jobs.reduce((n,j)=>n+j.minExperience,0)/jobs.length/12).toFixed(1):"3.2";
  return <main className="wdi-page">
    <header className="wdi-title"><div><h1>Workforce Demand Intelligence</h1><p>⌾ Riyadh Region, KSA　 ·　 ◷ Data Freshness: 12h ago　 ·　 ♙ 1,248 Employers Analyzed　 ·　 ▣ 45,200 Active Postings</p></div><div><a href="/api/university/export">⚑ Generate Report</a></div></header>
    <section className="wdi-summary"><b>✦　AI EXECUTIVE SUMMARY</b><p>Software Engineering demand remains strong across Riyadh. Cloud computing, Python, DevOps, and AI skills continue<br/>to grow while spreadsheet-focused roles are gradually declining. A <strong>12% mismatch</strong> exists between existing CS<br/>curriculum and industry cloud requirements.</p></section>
    <section className="wdi-metrics">{[["ACTIVE POSTINGS",jobs.length||"45,212","↗ 8.4%"],["EMPLOYERS",employers||"1,248","↗ 2.1%"],["CAREER TRACKS","142","Stable"],["AVG EXPERIENCE",`${avg}y`,"↗ 0.4y"],["TOP EMERGING SKILL","GenAI","♧ +420%"],["ALIGNMENT SCORE","72%","↘ 4%"]].map((x,i)=><article className={i===5?"score":""} key={x[0]}><small>{x[0]}</small><strong>{x[1]}</strong><b>{x[2]}</b></article>)}</section>
    <section className="wdi-filters"><button>▽　Filters</button><button>Career Track　⌄</button><button>Industry　⌄</button><button>Employer　⌄</button><button>Experience　⌄</button><button>Demand Trend　⌄</button><span>Riyadh　×</span><a>Saved Filters</a><small>Clear All</small></section>
    <div className="wdi-layout"><div>
      <section className="wdi-skills"><header><h2>ϟ　Skill Intelligence</h2></header><div>{skillCards.map((s,i)=><article key={s[0]}><label className={`t${i}`}>{s[2]}</label><h3>{s[0]}</h3><p>{s[1]}</p><div className="demand"><span>Demand Score</span><b>{s[3]}/100</b><i><em style={{width:`${s[3]}%`}}/></i></div><div className="skill-stats"><span><small>GROWTH</small><b>{s[4]}</b></span><span><small>OPEN JOBS</small><strong>{s[5]}</strong></span></div><footer>UNIV COVERAGE: <b>{s[6]}</b><Link href={skillDestinations[i]}>{s[7]}</Link></footer></article>)}</div></section>
      <section className="wdi-gaps"><header><h2>Curriculum Gap Analysis</h2><div><span>Total Gaps: 24</span><b>High Priority: 6</b></div></header>{[["Cloud Deployment Strategies","Employer demand for AWS Lambda and Serverless architectures has spiked 240% in Riyadh Fintech sector.","80% Deficit","Integrate AWS Cloud Practitioner track into Year 3 CS.","420 Students affected","Apply Recommendation"],["AI Prompt Engineering","Enterprise employers now list prompt engineering as a core competency for all developer and analyst roles.","100% Deficit","Add 2-week lab module to Introductory Computing.","1,250 Students affected","Review Lab Plan"]].map((g,i)=><article key={g[0]}><div><h3>{g[0]}</h3><p>{g[1]}</p><span>{i?"MIS 201　 GEN 101":"CS 402　 SWE 310"}</span></div><div><small>COVERAGE GAP</small><b className="deficit">━━　 {g[2]}</b><small>EMPLOYABILITY IMPACT</small><b className="positive">+{i?"12":"18"}% Hireability</b></div><div><small>SUGGESTED ACTION</small><p>{g[3]}</p><small>READY CANDIDATES</small><b>{g[4]}</b></div><button className={i?"secondary":""}>{g[5]}</button></article>)}</section>
      <section className="wdi-bottom"><article className="wdi-employers"><h2>♙ Employer Demand Breakdown</h2><small>TOP HIRING COMPANIES</small><div className="companies"><span>STC</span><span>ARM Aramco</span><span>PIF</span><span>NEOM</span></div><div className="sectors"><span>SECTOR DEMAND<label>Public Sector <b>62%</b><i><em style={{width:"62%"}}/></i></label><label>Private Sector <b>38%</b><i><em style={{width:"38%"}}/></i></label></span><strong>24%<small>Jobs Remote/Hybrid</small></strong></div></article><article className="wdi-trends"><h2>⌁ Predictive Trends (2025-2027)</h2><div className="growth"><b>♧　HIGH GROWTH FORECAST</b><p>Quantum Computing and Bio-Tech integration is projected to grow by 120% in the Riyadh Tech Hub by 2026.</p></div><div className="decline"><b>⌁　DECLINING DEMAND</b><p>Manual QA and basic Data Entry roles are projected to shrink by 45% as LLM automation matures.</p></div>{[["2025","43%"],["2026","68%"],["2027","91%"]].map(y=><label key={y[0]}>{y[0]}<i><em style={{width:y[1]}}/></i></label>)}</article></section>
    </div><aside className="wdi-aside"><section className="wdi-action"><h2>ϟ AI Action Center</h2><small>HIGHEST PRIORITY</small><article><h3>Revise SWE 402: Distributed Systems</h3><p>Current focus is legacy monolithic. Market requires Kubernetes & Microservices.</p><b>+14% Placement <a>Start Revision</a></b></article><small>RECOMMENDED CERTIFICATION</small><article><h3>▣　AWS Cloud Practitioner</h3><p>84 Employers request this</p><button>Partner with AWS</button></article><small>EMERGING TECH TO WATCH</small>{[["Web3 & Solidity","+18%"],["Digital Twins","+12%"],["Rust Programming","+34%"]].map(x=><label key={x[0]}>{x[0]}<b>{x[1]}</b></label>)}<div className="forecast"><small>ALIGNMENT IMPROVEMENT FORECAST</small><strong>84% <em>Target if actions applied by Q3 2024</em></strong><i/></div></section><section className="wdi-partners"><h3>Suggested Industry Partners</h3><p><b>M</b><span><strong>Microsoft Gulf</strong><small>AI & Cloud Track</small></span>⊕</p><p><b>S</b><span><strong>SAP Saudi</strong><small>ERP Transformation</small></span>⊕</p></section></aside></div>
  </main>;
}
