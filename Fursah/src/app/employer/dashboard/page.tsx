import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { getCurrentEmployer } from "@/lib/session";
import { computeJobMatch } from "@/lib/ai";
import { getEmployerIntelligence } from "@/lib/intelligence";
import EmployerHeader from "@/components/EmployerHeader";
import FursahAssistant from "@/components/FursahAssistant";
import ActionQueue from "@/components/ActionQueue";
import ReasoningCard from "@/components/ReasoningCard";
import { assistantConfigured } from "@/lib/assistant/llm";

type IconName="briefcase"|"users"|"sparkle"|"calendar"|"mail"|"trend"|"medal"|"warning"|"chart"|"check"|"send";
function Icon({name}:{name:IconName}){const paths:Record<IconName,React.ReactNode>={
  briefcase:<><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5h8v2M3 12h18M10 12v2h4v-2"/></>,
  users:<><circle cx="9" cy="8" r="3"/><path d="M3 19v-1c0-3 2.5-5 6-5s6 2 6 5v1M16 5.5a3 3 0 0 1 0 5.5M17 13c2.5.4 4 2 4 4.5V19"/></>,
  sparkle:<path d="m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3Zm6 11 .8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8L18 14Z"/>,
  calendar:<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18m-13 5 3 3 5-6"/></>,
  mail:<><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></>,trend:<path d="m4 16 5-5 4 4 7-8m-5 0h5v5"/>,
  medal:<><circle cx="12" cy="14" r="5"/><path d="m8 3 4 6 4-6M9 18l-1 3 4-2 4 2-1-3"/></>,
  warning:<><circle cx="12" cy="12" r="9"/><path d="M12 7v6m0 4h.01"/></>,chart:<path d="M4 19V5m0 14h16M7 15l4-4 3 2 5-6"/>,
  check:<><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></>,send:<path d="m3 11 18-8-8 18-2-8-8-2Zm8 2 4-4"/>
};return <svg className="erd-svg" viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>}

function getWeekAgo() {
  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
}

type EmployerIntelligence = Awaited<ReturnType<typeof getEmployerIntelligence>>;

async function HiringIntelligence({
  intelligencePromise,
  priorityJob,
  pendingReview,
  jobsWithoutSkills,
  topSkills,
}: {
  intelligencePromise: Promise<EmployerIntelligence>;
  priorityJob: { id: string; title: string; applicationCount: number } | null;
  pendingReview: number;
  jobsWithoutSkills: number;
  topSkills: string[];
}) {
  const intelligence = await intelligencePromise;
  const intelligenceByJob = new Map(intelligence.jobs.map((entry) => [entry.jobId, entry]));
  const priorityIntelligence = priorityJob ? intelligenceByJob.get(priorityJob.id) : null;

  return <section className="erd-intel"><header><h2>✦　HIRING INTELLIGENCE</h2><p>Analysis of your current hiring data</p></header><div>{priorityJob?<><small>HIGHEST ACTIVITY ROLE</small><article><h3>{priorityJob.title}</h3><p>{priorityJob.applicationCount} application{priorityJob.applicationCount===1?"":"s"} received for this opportunity.</p></article><small>CURRENT BOTTLENECKS</small><p>ⓘ　 {pendingReview} application{pendingReview===1?"":"s"} awaiting initial review.</p><p>ⓘ　 {jobsWithoutSkills} role{jobsWithoutSkills===1?"":"s"} without mapped skill requirements.</p><small>MOST REQUESTED SKILLS</small><div className="erd-tags">{topSkills.length?topSkills.map(skill=><span key={skill}>{skill}</span>):<span>No skills mapped</span>}</div>
    <small>TALENT AVAILABILITY</small><p>ⓘ　 {intelligence.totalCandidatePool} of {intelligence.studentPoolSize} student profile(s) score 60% or above against at least one of your open roles.</p>
    {priorityIntelligence&&<><small>HIRING DIFFICULTY</small><p>ⓘ　 {priorityJob.title}: {priorityIntelligence.hiringDifficulty.toLowerCase()}. {priorityIntelligence.strongCandidateCount} profile(s) score 80% or above.</p></>}
    {intelligence.recurringGaps.length>0&&<><small>RECURRING CANDIDATE GAPS</small>{intelligence.recurringGaps.slice(0,3).map(gap=><p key={gap.skillName}>ⓘ　 {gap.skillName}: unevidenced by {gap.applicantCount} applicant(s) ({gap.sharePct}%).</p>)}</>}
    <small>DECISION SUPPORT ONLY</small><p>ⓘ　 Rankings are explainable and evidence-based. Fursah does not make hiring decisions; every outcome is recorded against a human reviewer.</p></>:<div className="erd-empty"><h3>Not enough data yet</h3><p>Post a role and map its required skills to receive hiring intelligence.</p></div>}</div></section>;
}

export default async function EmployerDashboard({searchParams}:{searchParams:Promise<{q?:string;all?:string}>}){
  const ctx=await getCurrentEmployer(); if(!ctx) redirect("/login");
  const params=await searchParams;
  const query=String(params.q||"").trim().toLowerCase();
  const showAllRoles=params.all==="1";
  // Start the broad talent-pool analysis immediately, but do not hold the
  // dashboard's useful content behind it. The right-hand insight panel streams
  // in independently once its all-student scan finishes.
  const intelligencePromise=getEmployerIntelligence(ctx.employer.id);
  const jobs=await prisma.job.findMany({where:{employerId:ctx.employer.id},include:{applications:{include:{student:{include:{skills:{include:{skill:true}},certifications:{include:{certification:true}},experiences:true,projects:true,user:true}}}},requiredSkills:{include:{skill:true}},requiredCerts:{include:{certification:true}}},orderBy:{createdAt:"desc"}});
  const applications=jobs.flatMap(job=>job.applications.map(a=>({...a,job,match:computeJobMatch(a.student,job)}))).sort((a,b)=>b.match.score-a.match.score);
  const visibleJobs=query?jobs.filter(job=>[job.title,job.careerTrack,...job.requiredSkills.map(item=>item.skill.name)].some(value=>value.toLowerCase().includes(query))):jobs;
  const roles=(showAllRoles?visibleJobs:visibleJobs.slice(0,3)).map(job=>({id:job.id,title:job.title,dept:job.careerTrack.replaceAll("-"," "),skills:job.requiredSkills.map(s=>s.skill.name).slice(0,3),applicants:job.applications.length,match:job.applications.length?Math.round(job.applications.reduce((n,a)=>n+computeJobMatch(a.student,job).score,0)/job.applications.length):null,status:job.status==="open"?"Published":"Closed"}));
  const open=jobs.filter(j=>j.status==="open").length;
  const activeApplications=applications.filter(a=>!["rejected","hired"].includes(a.status));
  const avg=applications.length?Math.round(applications.reduce((n,a)=>n+a.match.score,0)/applications.length):0;
  const shortlisted=applications.filter(a=>a.status==="shortlisted").length;
  const weekAgo=getWeekAgo();
  const newThisWeek=applications.filter(a=>a.createdAt>=weekAgo).length;
  const pendingReview=applications.filter(a=>a.status==="applied").length;
  const priorityJob=[...jobs].sort((a,b)=>b.applications.length-a.applications.length)[0];
  const skillCounts=new Map<string,number>(); jobs.forEach(job=>job.requiredSkills.forEach(item=>skillCounts.set(item.skill.name,(skillCounts.get(item.skill.name)||0)+1)));
  const topSkills=[...skillCounts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,4).map(([name])=>name);
  const activity=[...applications.map(a=>({id:`app-${a.id}`,date:a.createdAt,text:`${a.student.user.name} applied for ${a.job.title}`,kind:"application" as const})),...jobs.map(job=>({id:`job-${job.id}`,date:job.createdAt,text:`Role created: ${job.title}`,kind:"job" as const}))].sort((a,b)=>b.date.getTime()-a.date.getTime()).slice(0,5);
  const topApplication=applications[0]??null;
  const nextActions=[
    ...(pendingReview>0&&topApplication?[{title:`Review ${pendingReview} new application${pendingReview===1?"":"s"}`,reason:`Start with ${topApplication.student.user.name} for ${topApplication.job.title}; the evidence-linked match is ${topApplication.match.score}%.`,href:`/employer/jobs/${topApplication.job.id}/candidates/${topApplication.id}`,action:"Open candidate review",priority:"high" as const,meta:"Human decision required"}]:[]),
    ...(jobs.filter(job=>job.requiredSkills.length===0).slice(0,1).map(job=>({title:`Complete requirements for ${job.title}`,reason:"This role has no mapped skills, so candidate comparisons cannot be meaningfully explained.",href:`/employer/jobs/${job.id}`,action:"Review role",priority:"high" as const,meta:"Improves match quality"}))),
    ...(open===0?[{title:"Publish the first opportunity",reason:"A published role is required before candidates and hiring intelligence can enter the workflow.",href:"/employer/jobs/new",action:"Create opportunity",priority:"medium" as const}]:[]),
  ].slice(0,3);
  return <main className="erd-page">
    <EmployerHeader company={ctx.employer.company} userName={ctx.user.name} active="dashboard"/>
    <div className="erd-inner">
      <h1 className="sr-only">Hiring dashboard: {ctx.employer.company}</h1>
      <section className="erd-metrics">{[["briefcase",open,"OPEN ROLES","Active recruitment pipelines"],["users",activeApplications.length,"ACTIVE CANDIDATES","In active hiring stages"],["sparkle",applications.length?`${avg}%`:"-","AVG MATCH SCORE",applications.length?"Across current applicants":"Available after applications"],["calendar",shortlisted,"SHORTLISTED","Candidates selected for review"],["mail",newThisWeek,"NEW THIS WEEK","Applications received recently"]].map((m,i)=><article className={i===4?"accent":""} key={String(m[2])}><span className={`icon i${i}`}><Icon name={m[0] as IconName}/></span><strong>{m[1]}</strong><h3>{m[2]}</h3><p>{m[3]}</p></article>)}</section>
      <ActionQueue eyebrow="HIRING WORK QUEUE" title="Decisions requiring attention" items={nextActions}/>
      <div className="erd-layout"><div>
        <section className="erd-positions"><header><h2>{query?`Search results for “${query}”`:"Current Positions"}</h2><div><Link href="/employer/jobs/new">Post a Job</Link><a href="/api/employer/jobs/export">Export</a>{visibleJobs.length>3&&<Link className="erd-view-all" href={`/employer/dashboard?${new URLSearchParams({...(query?{q:query}:{}),...(showAllRoles?{}:{all:"1"})}).toString()}`}>{showAllRoles?"Show fewer":`View all ${visibleJobs.length}`}</Link>}</div></header>{roles.length?<><div className="erd-table-head"><b>JOB TITLE &amp; TRACK</b><b>CORE SKILLS</b><b>APPLICANTS</b><b>AI MATCH</b><b>STATUS</b></div>{roles.map(role=><article key={role.id}><div><h3><Link href={`/employer/jobs/${role.id}`}>{role.title}</Link></h3><p>{role.dept}</p></div><div>{role.skills.map(s=><span key={s}>{s}</span>)}</div><strong>{role.applicants}</strong><b className="match">{role.match===null?"-":`${role.match}%`}</b><label className={role.status==="Closed"?"paused":""}>● {role.status}</label><Link className="erd-row-link" href={`/employer/jobs/${role.id}`}>→</Link></article>)}</>:<div className="erd-empty"><h3>{query?"No matching roles":"No roles posted yet"}</h3><p>{query?"Try another job title, career track, or skill.":"Create your first opportunity to begin receiving applications."}</p>{query?<Link href="/employer/dashboard">Clear search</Link>:<Link href="/employer/jobs/new">Create an opportunity</Link>}</div>}<footer>Showing {roles.length} of {visibleJobs.length} roles{!showAllRoles&&visibleJobs.length>roles.length&&<Link href={`/employer/dashboard?${new URLSearchParams({...(query?{q:query}:{}),all:"1"}).toString()}`}>View all roles</Link>}</footer></section>
        <section className="erd-ranking" id="candidate-ranking"><header><h2><Icon name="medal"/>Evidence-ranked candidates</h2>{applications.length>0&&<span>Advisory ordering; human decision required</span>}</header>{applications.length?applications.slice(0,3).map(a=><article key={a.id}><i>{a.student.user.name.split(" ").map(n=>n[0]).join("").slice(0,2)}</i><div><h3>{a.student.user.name} <label className={`candidate-status candidate-status--${a.status}`}>{a.status.toUpperCase()}</label></h3><p>Applied for {a.job.title}</p><b>EVIDENCE MATCH:　<strong>{a.match.score}%</strong></b></div><blockquote>{a.match.explanation}</blockquote><span><Link href={`/employer/jobs/${a.job.id}/candidates/${a.id}`}>Evidence</Link><Link href={`/employer/jobs/${a.job.id}/candidates/${a.id}`}>Record review</Link></span></article>):<div className="erd-empty"><h3>No candidates yet</h3><p>Candidate comparisons will appear after students apply to your published roles.</p></div>}</section>
        {topApplication&&<ReasoningCard title={`Why ${topApplication.student.user.name} appears first`} summary={topApplication.match.explanation} confidence={topApplication.match.score} evidence={[`${topApplication.student.skills.length} skill record(s) available`,`${topApplication.student.certifications.filter(item=>item.verificationStatus==="APPROVED").length} verified certification(s)`,`${topApplication.job.requiredSkills.length} mapped role requirement(s)`]} limitations={["The score compares only published requirements and available profile evidence.","Fursah does not infer protected characteristics or recommend a hiring outcome.","A hiring manager must inspect the underlying evidence before changing status."]}/>} 
      </div><aside><Suspense fallback={<section className="erd-intel" aria-busy="true"><header><h2>✦　HIRING INTELLIGENCE</h2><p>Analyzing your current hiring data…</p></header></section>}><HiringIntelligence intelligencePromise={intelligencePromise} priorityJob={priorityJob?{id:priorityJob.id,title:priorityJob.title,applicationCount:priorityJob.applications.length}:null} pendingReview={pendingReview} jobsWithoutSkills={jobs.filter(job=>job.requiredSkills.length===0).length} topSkills={topSkills}/></Suspense><section className="erd-activity"><h2>Recent Activity</h2>{activity.length?activity.map((item,i)=><article key={item.id}><i className={`a${i}`}>{item.kind==="application"?"＋":"▣"}</i><div><p>{item.text}</p><small>{item.date.toLocaleDateString("en-SA",{month:"short",day:"numeric",year:"numeric"})}</small></div></article>):<div className="erd-empty"><h3>No activity yet</h3><p>New roles and applications will appear here.</p></div>}</section></aside></div>
      {assistantConfigured() && <div style={{marginTop:20}}>
        <FursahAssistant
          eyebrow="FURSAH ASSISTANT"
          heading="Ask about your roles and pipeline"
          intro="Ask about your own postings and the candidates who applied to them. The assistant explains the evidence behind a match; it never makes or recommends a hiring decision."
          suggestions={[
            "Why is this job difficult to fill?",
            "Which requirement is shrinking my candidate pool?",
            "What skills are applicants commonly missing?",
            "Why does my top applicant match this role?",
          ]}
        />
      </div>}
    </div>
  </main>;
}
