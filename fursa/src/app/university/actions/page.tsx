import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUniversity } from "@/lib/session";
import { createCurriculumAction, submitCurriculumActionForReview } from "@/actions/curriculum";
import DocumentUpload from "@/components/DocumentUpload";

const steps = ["Created", "Approved", "Curriculum design", "Faculty review", "Implementation", "Student delivery", "Outcome"];

function ActionCard({ id, title, description, owner, due, department, completed, status, outcomeNote, strategic = false }: {
  id: string; title: string; description: string; owner: string; due: string; department: string; completed: number; status: string; outcomeNote?: string | null; strategic?: boolean;
}) {
  const detailId=`initiative-${title.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"")}`;
  return <article className="cap-action-card" id={detailId}>
    <div className="cap-action-title-row">
      <span className="cap-action-icon">{strategic ? "◇" : "▣"}</span>
      <div><div className="cap-title-line"><h3>{title}</h3><span className={`cap-tag ${status==="COMPLETED"?"cap-tag-green":status==="AWAITING_HUMAN_REVIEW"?"cap-tag-blue":"cap-tag-orange"}`}>{status==="COMPLETED"?"VERIFIED COMPLETE":status==="AWAITING_HUMAN_REVIEW"?"HUMAN REVIEW":status==="CHANGES_REQUESTED"?"CHANGES REQUESTED":strategic?"STABLE":"IN PROGRESS"}</span><span className="cap-tag cap-tag-blue">{strategic ? "STRATEGIC" : "HIGH PRIORITY"}</span></div><p>{description}</p></div>
      <span className="cap-card-tools">⌕　•••</span>
    </div>
    <div className="cap-progress">
      {steps.map((step, index) => <div className={`cap-step ${index < completed ? "done" : ""}`} key={step}><b>{step}</b><span /></div>)}
    </div>
    <div className="cap-meta-grid">
      <div><small>OWNER</small><strong><i>{owner.split(" ").map(x => x[0]).join("").slice(0,2)}</i>{owner}</strong></div>
      <div><small>TARGET COMPLETION</small><strong>{due}</strong></div>
      <div><small>{strategic ? "DEPARTMENT" : "AFFECTED COURSES"}</small><strong>{department}</strong></div>
      <div><small>{strategic ? "EXPECTED STUDENT IMPACT" : "AI IMPACT SCORE"}</small><strong className={strategic ? "" : "cap-positive"}>{strategic ? "~850 students/year" : "↗ +9.2 pts Readiness"}</strong></div>
    </div>
    <div className="cap-card-footer">
      <span className={strategic ? "cap-risk" : "cap-collaborators"}>{strategic ? "ⓘ  Low Implementation Risk" : "◯◯  +4　 Collaborators　　▣  12 Comments"}</span>
      <div className="cap-action-controls"><details className="cap-verification"><summary>{status==="COMPLETED"?"View Verification":status==="AWAITING_HUMAN_REVIEW"?"Review Pending":"Request Completion"}</summary><div><h4>Completion verification</h4><p>AI checks submission quality first. A Fursa administrator then reviews the evidence and makes the final human decision.</p>{outcomeNote&&<pre>{outcomeNote}</pre>}{status==="COMPLETED"?<span className="cap-verified">✓ Human verified</span>:status==="AWAITING_HUMAN_REVIEW"?<span className="cap-awaiting">Awaiting administrator review</span>:<form action={submitCurriculumActionForReview}><input type="hidden" name="actionId" value={id}/><label>Completion evidence<textarea name="evidence" required minLength={40} placeholder="Describe what was implemented and cite the approved syllabus, meeting minutes, assessment report, or other evidence."/></label><DocumentUpload label="Completion documents"/><button className="primary" type="submit">Submit for Verification</button></form>}</div></details>{status==="COMPLETED"&&<span className="cap-verified-inline">✓ Verified</span>}</div>
    </div>
  </article>;
}

export default async function UniversityActionsPage() {
  const ctx = await getCurrentUniversity(); if (!ctx) redirect("/login");
  const actions = await prisma.curriculumAction.findMany({ where: { universityId: ctx.university.id }, orderBy: { createdAt: "desc" } });
  const first = actions[0]; const second = actions[1];
  return <main className="cap-page">
    <section className="cap-summary">
      <span className="cap-summary-icon">✦</span><div><b>AI EXECUTIVE SUMMARY</b><p>“Based on current labor market trends, introducing <strong>cloud computing, DevOps,</strong> and <strong>applied AI modules</strong> could increase curriculum alignment by approximately <em>11.4%</em> and improve graduate workforce readiness scores across the Engineering and Business faculties by <em>+8.2 points.</em>”</p>
      <div className="cap-summary-stats"><span><small>ACTIVE INITIATIVES</small><strong>24</strong></span><span><small>COMPLETED ACTIONS</small><strong>12</strong></span><span><small>HIGH PRIORITY</small><strong className="orange">08</strong></span><span><small>EXPECTED IMPROVEMENT</small><strong className="green">+14%</strong></span></div></div><span className="cap-brain">♧</span>
    </section>
    <section className="cap-metrics">
      <div><span className="blue">⌁</span><i>↗ +4.2%</i><small>Curriculum Alignment Score</small><strong>76.8%</strong><em>vs 72.6% prev. semester</em></div>
      <div><span className="violet">♧</span><i>↗ +12%</i><small>Estimated Students Impacted</small><strong>4,280</strong><em>Total undergraduate</em></div>
      <div><span className="orange-icon">◷</span><i className="delay">△ +2 days</i><small>Average Completion Time</small><strong>58 days</strong><em>Target: 45 days</em></div>
      <div><span className="green-icon">◎</span><i>↗ +9.1</i><small>Workforce Readiness Score</small><strong>42.4</strong><em>Out of 100</em></div>
    </section>
    <section className="cap-lower">
      <div>
        <section className="cap-recommendations"><header><h2><span>✦</span> AI Priority Recommendations</h2></header><div className="cap-reco-grid"><article><b>HIGH IMPACT</b><h3>Advanced Cybersecurity Fundamentals</h3><p>Labor market demand for entry-level security analysts has grown by 34% in the local tech corridor.</p><blockquote>“Integrate this as a mandatory module in CS-301 to bridge the gap with AWS Security certification standards.”</blockquote><footer><span>↗ +18% Ready</span><form action={createCurriculumAction}><input type="hidden" name="title" value="Advanced Cybersecurity Fundamentals"/><input type="hidden" name="skill" value="Cybersecurity"/><input type="hidden" name="owner" value={ctx.user.name}/><button>Create Action</button></form></footer></article><article><b className="blue-label">STRATEGIC</b><h3>NVIDIA Applied AI Partnership</h3><p>Local industry hub is seeking AI-trained graduates. High ROI for student placement rates.</p><blockquote>“Early partnership data suggests 22% increase in immediate post-grad job placement for similar institutions.”</blockquote><footer><span>↗ +24% Placement</span><form action={createCurriculumAction}><input type="hidden" name="title" value="NVIDIA Applied AI Partnership"/><input type="hidden" name="skill" value="Applied AI"/><input type="hidden" name="owner" value={ctx.user.name}/><button>Create Action</button></form></footer></article></div></section>
        <div className="cap-tracker-head" id="initiative-tracker"><h2>Initiative Tracker</h2><span className="active">All (24)</span><span>Active (18)</span><span>Completed (12)</span><input placeholder="⌕  Search initiatives..." /></div>
        {first&&<ActionCard id={first.id} title={first.title} description={first.outcomeNote?.split("\n\n")[0] || "Curriculum initiative created for institutional review and implementation."} owner={first.owner ?? ctx.user.name} due={first.dueDate?.toLocaleDateString() ?? "Date not set"} department={first.skill ?? "Institution-wide"} completed={first.status==="COMPLETED"?7:first.status==="IN_PROGRESS"?4:first.status==="PLANNED"?2:1} status={first.status} outcomeNote={first.outcomeNote}/>} 
        {second&&<ActionCard id={second.id} title={second.title} description="New partnership with local financial institutions for structured 3rd year internships." owner={second.owner ?? ctx.user.name} due={second.dueDate?.toLocaleDateString() ?? "Dec 01, 2024"} department="Faculty of Business" completed={second.status==="COMPLETED"?7:2} status={second.status} outcomeNote={second.outcomeNote} strategic/>}
        {!first&&<div className="cap-empty"><h3>No initiatives yet</h3><p>Create an action from an AI recommendation above. Completion will require evidence and human verification.</p></div>}
      </div>
      <aside className="cap-aside">
        <section className="cap-intel"><h2>✦ AI Intelligence Center</h2><div><small>MOST URGENT INITIATIVE</small><strong>Integrate Python Data Analysis in Year 1 Stats</strong><p>Alignment gap: -18% <b>ROI: High</b></p></div><div><small>HIGHEST ROI ACTION</small><strong>AWS Cloud Practitioner Certification</strong><p>Est. Readiness +24pts <b>ROI: Critical</b></p></div><div><small>SUGGESTED FACULTY DEV</small><strong>LLM Prompt Engineering Workshop</strong><p>Target: 45 Faculty members <b>Strategic</b></p></div><hr/><h4>IMPLEMENTATION RISK HEATMAP</h4><span className="cap-heat"><i/><b>85% CI</b></span><em>“AI predicts high implementation success based on current faculty engagement and budget allocation.”</em></section>
        <section className="cap-analytics"><h2>Action Analytics</h2><header><b>Actions by Department</b><span>Total: 24</span></header><div className="cap-bars"><i/><i/><i/><i/><i/></div><div className="cap-bar-labels"><span>CS</span><span>BUS</span><span>MED</span><span>ARTS</span><span>ENG</span></div><hr/><header><b>Readiness Score Trend</b><strong>+12% vs LY</strong></header><svg viewBox="0 0 400 100" aria-label="Readiness score rising"><path d="M112 78 C168 64 194 60 230 48 S305 12 328 22"/><circle cx="112" cy="78" r="4"/><circle cx="328" cy="22" r="4"/></svg><div className="cap-months"><span>JAN</span><span>MAR</span><span>JUN</span><span>SEP</span><span>NOV</span></div><Link className="cap-analytics-link" href="/university/analytics">View Full Analytics</Link></section>
        <section className="cap-outcomes"><h2>Outcome Measurement</h2><p>Aggregate impact of curriculum actions over the last 12 months.</p><label>Employment Rate <b>+12.4%</b><i><span style={{width:"76%"}}/></i></label><label>Employer Satisfaction <b>4.8/5.0</b><i><span style={{width:"92%"}}/></i></label><label>Student Readiness Index <b>72 / 100</b><i><span style={{width:"72%"}}/></i></label></section>
      </aside>
    </section>
  </main>;
}
