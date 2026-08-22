import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUniversity } from "@/lib/session";
import { createCurriculumAction, submitCurriculumActionForReview } from "@/actions/curriculum";
import DocumentUpload from "@/components/DocumentUpload";
import { getUniversityIntelligence } from "@/lib/intelligence";
import { MIN_COHORT } from "@/lib/cohort";

const steps = ["Created", "Approved", "Curriculum design", "Faculty review", "Implementation", "Student delivery", "Outcome"];

function ActionCard({ id, title, description, owner, due, department, completed, status, outcomeNote, openRoles, cohortMissingSharePct }: {
  id: string; title: string; description: string; owner: string; due: string; department: string; completed: number; status: string; outcomeNote?: string | null;
  /** Open roles currently requesting the skill this initiative names, when it maps to one. */
  openRoles: number | null;
  /** Share of the reported cohort missing that skill, or null when withheld. */
  cohortMissingSharePct: number | null;
}) {
  const detailId=`initiative-${title.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"")}`;
  return <article className="cap-action-card" id={detailId}>
    <div className="cap-action-title-row">
      <span className="cap-action-icon">▣</span>
      <div><div className="cap-title-line"><h3>{title}</h3><span className={`cap-tag ${status==="COMPLETED"?"cap-tag-green":status==="AWAITING_HUMAN_REVIEW"?"cap-tag-blue":"cap-tag-orange"}`}>{status==="COMPLETED"?"VERIFIED COMPLETE":status==="AWAITING_HUMAN_REVIEW"?"HUMAN REVIEW":status==="CHANGES_REQUESTED"?"CHANGES REQUESTED":status.replaceAll("_"," ")}</span><span className="cap-tag cap-tag-blue">{openRoles !== null && openRoles > 0 ? `${openRoles} OPEN ROLE(S)` : "NO LINKED DEMAND"}</span></div><p>{description}</p></div>
      <span className="cap-card-tools">⌕　•••</span>
    </div>
    <div className="cap-progress">
      {steps.map((step, index) => <div className={`cap-step ${index < completed ? "done" : ""}`} key={step}><b>{step}</b><span /></div>)}
    </div>
    <div className="cap-meta-grid">
      <div><small>OWNER</small><strong><i>{owner.split(" ").map(x => x[0]).join("").slice(0,2)}</i>{owner}</strong></div>
      <div><small>TARGET COMPLETION</small><strong>{due}</strong></div>
      <div><small>SKILL / AFFECTED COURSES</small><strong>{department}</strong></div>
      <div><small>COHORT MISSING THIS SKILL</small><strong className="cap-positive">{cohortMissingSharePct === null ? "Withheld" : `${cohortMissingSharePct}%`}</strong></div>
    </div>
    <div className="cap-card-footer">
      <span className="cap-collaborators">ⓘ　Owner: {owner}　·　Target: {due}</span>
      <div className="cap-action-controls"><details className="cap-verification"><summary>{status==="COMPLETED"?"View Verification":status==="AWAITING_HUMAN_REVIEW"?"Review Pending":"Request Completion"}</summary><div><h4>Completion verification</h4><p>AI checks submission quality first. A Fursah administrator then reviews the evidence and makes the final human decision.</p>{outcomeNote&&<pre>{outcomeNote}</pre>}{status==="COMPLETED"?<span className="cap-verified">✓ Human verified</span>:status==="AWAITING_HUMAN_REVIEW"?<span className="cap-awaiting">Awaiting administrator review</span>:<form action={submitCurriculumActionForReview}><input type="hidden" name="actionId" value={id}/><label>Completion evidence<textarea name="evidence" required minLength={40} placeholder="Describe what was implemented and cite the approved syllabus, meeting minutes, assessment report, or other evidence."/></label><DocumentUpload label="Completion documents"/><button className="primary" type="submit">Submit for Verification</button></form>}</div></details>{status==="COMPLETED"&&<span className="cap-verified-inline">✓ Verified</span>}</div>
    </div>
  </article>;
}

export default async function UniversityActionsPage() {
  const ctx = await getCurrentUniversity(); if (!ctx) redirect("/login");

  const [actions, intelligence] = await Promise.all([
    prisma.curriculumAction.findMany({ where: { universityId: ctx.university.id }, orderBy: { createdAt: "desc" } }),
    getUniversityIntelligence(ctx.university.id),
  ]);

  const byStatus = (status: string) => actions.filter((action) => action.status === status).length;
  const completed = byStatus("COMPLETED");
  const awaitingReview = byStatus("AWAITING_HUMAN_REVIEW");
  const inProgress = actions.filter((action) => !["COMPLETED", "AWAITING_HUMAN_REVIEW"].includes(action.status)).length;
  const { cohort } = intelligence;

  // Recommendations are generated from real uncovered demand, and each one
  // pre-fills a curriculum initiative rather than creating anything itself.
  const recommendations = intelligence.recommendations.slice(0, 2);

  const progressFromStatus = (status: string) =>
    status === "COMPLETED" ? 7 : status === "AWAITING_HUMAN_REVIEW" ? 5 : status === "IN_PROGRESS" ? 4 : status === "PLANNED" ? 2 : 1;

  return <main className="cap-page">
    <section className="cap-summary">
      <span className="cap-summary-icon">✦</span><div><b>EXECUTIVE SUMMARY</b>{intelligence.executiveSummary.map(line => <p key={line}>{line}</p>)}
      <div className="cap-summary-stats"><span><small>ACTIVE INITIATIVES</small><strong>{inProgress}</strong></span><span><small>COMPLETED ACTIONS</small><strong>{completed}</strong></span><span><small>AWAITING HUMAN REVIEW</small><strong className="orange">{awaitingReview}</strong></span><span><small>UNCOVERED SKILLS</small><strong className="green">{intelligence.gaps.length}</strong></span></div></div><span className="cap-brain">♧</span>
    </section>
    <section className="cap-metrics">
      <div><span className="blue">⌁</span><i>{intelligence.openRoleCount} roles</i><small>Demand coverage</small><strong>{intelligence.weightedDemandCoverage}%</strong><em>of weighted employer demand taught</em></div>
      <div><span className="violet">♧</span><i>{cohort.reportable ? "reported" : "withheld"}</i><small>Students in cohort</small><strong>{cohort.reportable ? cohort.students : "Withheld"}</strong><em>{cohort.reportable ? `avg readiness ${cohort.averageScore}/100` : `withheld below ${MIN_COHORT} students`}</em></div>
      <div><span className="orange-icon">◷</span><i className="delay">not recorded</i><small>Average completion time</small><strong>Not available</strong><em>No initiative completion durations are stored</em></div>
      <div><span className="green-icon">◎</span><i>{intelligence.compoundedGaps.length} compounded</i><small>Curriculum gaps</small><strong>{intelligence.gaps.length}</strong><em>Requested by employers, untaught here</em></div>
    </section>
    <section className="cap-lower">
      <div>
        <section className="cap-recommendations"><header><h2><span>✦</span> Priority Recommendations</h2></header><div className="cap-reco-grid">{recommendations.length ? recommendations.map((recommendation, index) => <article key={`${recommendation.type}-${recommendation.skillId}`}><b className={index ? "blue-label" : ""}>{recommendation.type.replaceAll("_", " ")}</b><h3>{recommendation.skillName}</h3><p>{recommendation.reason}</p><blockquote>Priority {Math.round(recommendation.priorityScore)} · {recommendation.relatedOpenRoles} open role(s) requesting · {recommendation.cohortMissingSharePct === null ? "cohort impact withheld" : `${recommendation.cohortMissingSharePct}% of the cohort missing it`}</blockquote><footer><span>{recommendation.alreadyPlanned ? "Initiative exists" : "No initiative yet"}</span><form action={createCurriculumAction}><input type="hidden" name="title" value={`Address ${recommendation.skillName} in the curriculum`}/><input type="hidden" name="skill" value={recommendation.skillName}/><input type="hidden" name="owner" value={ctx.user.name}/><input type="hidden" name="objective" value={recommendation.reason}/><button>Create Action</button></form></footer></article>) : <article><b>NO ACTION REQUIRED</b><h3>No uncovered employer demand</h3><p>Every skill currently requested by an open role is mapped to at least one offering in this catalogue.</p></article>}</div></section>
        <div className="cap-tracker-head" id="initiative-tracker"><h2>Initiative Tracker</h2><span className="active">All ({actions.length})</span><span>Active ({inProgress})</span><span>Completed ({completed})</span></div>
        {actions.length ? actions.map(action => <ActionCard
          key={action.id}
          id={action.id}
          title={action.title}
          description={action.outcomeNote?.split("\n\n")[0] || "Curriculum initiative created for institutional review and implementation."}
          owner={action.owner ?? ctx.user.name}
          due={action.dueDate?.toLocaleDateString() ?? "Date not set"}
          department={action.skill ?? "Institution-wide"}
          completed={progressFromStatus(action.status)}
          status={action.status}
          outcomeNote={action.outcomeNote}
          openRoles={intelligence.coveredSkills.find(skill => action.skill?.toLowerCase().includes(skill.skillName.toLowerCase()))?.openRoleCount ?? null}
          cohortMissingSharePct={intelligence.coveredSkills.find(skill => action.skill?.toLowerCase().includes(skill.skillName.toLowerCase()))?.cohortMissingSharePct ?? null}
        />) : <div className="cap-empty"><h3>No initiatives yet</h3><p>Create an action from a recommendation above. Completion requires evidence and human verification.</p></div>}
      </div>
      <aside className="cap-aside">
        <section className="cap-intel"><h2>✦ Intelligence Center</h2>
          {intelligence.compoundedGaps.slice(0, 3).map(gap => <div key={gap.skillId}><small>COMPOUNDED GAP</small><strong>{gap.skillName}</strong><p>{gap.openRoleCount} open role(s) request it <b>{gap.cohortMissingSharePct === null ? "cohort withheld" : `${gap.cohortMissingSharePct}% of cohort missing`}</b></p></div>)}
          {intelligence.compoundedGaps.length === 0 && <div><small>NO COMPOUNDED GAP</small><strong>Demand, cohort, and catalogue agree</strong><p>No skill is simultaneously requested by employers, untaught here, and missing across the cohort.</p></div>}
          <hr/><h4>WHAT THIS IS BASED ON</h4><em>{intelligence.openRoleCount} open role(s), {intelligence.offeringCount} offering(s), and {cohort.reportable ? `${cohort.students} cohort profile(s)` : "a cohort too small to report"}. Model {intelligence.modelVersion}.</em></section>
        <section className="cap-analytics"><h2>Action Analytics</h2><header><b>Initiatives by status</b><span>Total: {actions.length}</span></header>{[["Proposed", byStatus("PROPOSED")],["Planned", byStatus("PLANNED")],["In progress", byStatus("IN_PROGRESS")],["Awaiting review", awaitingReview],["Completed", completed]].map(([label, count]) => <label key={String(label)}>{label} <b>{count}</b><i><span style={{width:`${Math.round((Number(count) / Math.max(1, actions.length)) * 100)}%`}}/></i></label>)}<Link className="cap-analytics-link" href="/university/analytics">View Full Analytics</Link></section>
        <section className="cap-outcomes"><h2>Outcome Measurement</h2><p>Measured from current platform records, not projected.</p><label>Demand coverage <b>{intelligence.weightedDemandCoverage}%</b><i><span style={{width:`${intelligence.weightedDemandCoverage}%`}}/></i></label><label>Cohort readiness <b>{cohort.reportable ? `${cohort.averageScore} / 100` : "Withheld"}</b><i><span style={{width:`${cohort.averageScore ?? 0}%`}}/></i></label><label>Verified completions <b>{completed} / {actions.length}</b><i><span style={{width:`${Math.round((completed / Math.max(1, actions.length)) * 100)}%`}}/></i></label></section>
      </aside>
    </section>
  </main>;
}
