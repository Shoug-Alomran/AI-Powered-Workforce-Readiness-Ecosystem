import Link from "next/link";
import { redirect } from "next/navigation";
import { createCurriculumAction } from "@/actions/curriculum";
import DocumentUpload from "@/components/DocumentUpload";
import { getCurrentUniversity } from "@/lib/session";
import { prisma } from "@/lib/db";

type ActionPlanSearchParams = { source?: string; skill?: string; type?: string; priority?: string; roles?: string; cohort?: string; reason?: string };

export default async function NewCurriculumActionPage({ searchParams }: { searchParams: Promise<ActionPlanSearchParams> }) {
  const ctx = await getCurrentUniversity();
  if (!ctx) redirect("/login");
  const recommendation = await searchParams;
  const isAdvisorDraft = recommendation.source === "advisor" && Boolean(recommendation.skill);
  const skill = recommendation.skill?.trim() ?? "";
  const relatedRoles = Math.max(0, Number(recommendation.roles ?? 0));
  const cohortShare = recommendation.cohort === "withheld" ? null : Number(recommendation.cohort ?? 0);
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + 90);
  const dueDate = targetDate.toISOString().slice(0, 10);
  const draftTitle = isAdvisorDraft ? `${recommendation.type === "EXPAND_OFFERING" ? "Expand" : "Add"} ${skill} curriculum coverage` : "";
  const draftObjective = isAdvisorDraft
    ? `${recommendation.reason ?? `${skill} is not sufficiently covered by the current curriculum.`}\n\nProposed action plan:\n1. Review the ${skill} requirements in the identified employer roles.\n2. Map the requirements against current courses and assessments.\n3. Design or revise an offering with assessed learning outcomes.\n4. Obtain curriculum committee approval.\n5. Deliver the change and evaluate student evidence.`
    : "";
  const draftOutcome = isAdvisorDraft
    ? cohortShare === null
      ? `Map ${skill} to at least one assessed offering and establish a reportable cohort baseline.`
      : `Map ${skill} to at least one assessed offering and reduce the cohort evidence gap from ${cohortShare}%.`
    : "";
  const offerings = await prisma.offering.findMany({
    where: { universityId: ctx.university.id },
    select: { title: true },
    orderBy: { title: "asc" },
    take: 30,
  });

  return <main className="cap-create-page">
    <div className="cap-create-heading">
      <div><span>CURRICULUM INITIATIVE</span><h1>{isAdvisorDraft ? `Action plan for ${skill}` : "Create a new action plan"}</h1><p>{isAdvisorDraft ? "The Curriculum Advisor prepared this draft from current employer demand and cohort evidence. Review and edit every field before submitting it." : "Define the work, accountable owner, evidence, and intended outcome before implementation begins."}</p></div>
      <Link href="/university/actions">← Back to Action Plan</Link>
    </div>

    <form action={createCurriculumAction} className="cap-create-layout">
      <input type="hidden" name="returnTo" value="actions"/>
      <div className="cap-create-form">
        <section>
          <header><span>01</span><div><h2>Action details</h2><p>State exactly what the university intends to change.</p></div></header>
          <label>Action title <b>*</b><input name="title" required maxLength={140} defaultValue={draftTitle} placeholder="e.g. Introduce Cloud Security module in CS-402"/></label>
          <label>Objective and proposed steps <b>*</b><textarea name="objective" required minLength={30} rows={isAdvisorDraft ? 11 : 5} defaultValue={draftObjective} placeholder="Describe the curriculum gap, proposed change, and what is included in this initiative."/></label>
          <div className="cap-create-fields">
            <label>Primary skill area <b>*</b><input name="skill" required defaultValue={skill} placeholder="e.g. Cloud Security"/></label>
            <label>Affected courses or department <b>*</b><input name="affectedCourses" required defaultValue={isAdvisorDraft ? "Relevant programme curriculum" : ""} list="university-course-list" placeholder="e.g. CS-402, Faculty of Engineering"/><datalist id="university-course-list">{offerings.map(item=><option value={item.title} key={item.title}/>)}</datalist></label>
          </div>
        </section>

        <section>
          <header><span>02</span><div><h2>Ownership and timeline</h2><p>Assign responsibility and set a measurable delivery target.</p></div></header>
          <div className="cap-create-fields">
            <label>Accountable owner <b>*</b><input name="owner" required defaultValue={ctx.user.name}/></label>
            <label>Target completion date <b>*</b><input name="dueDate" type="date" required defaultValue={isAdvisorDraft ? dueDate : ""}/></label>
            <label>Starting stage <b>*</b><select name="status" defaultValue="PROPOSED"><option value="PROPOSED">Proposed: awaiting approval</option><option value="PLANNED">Planned: approved for scheduling</option><option value="IN_PROGRESS">In progress: work has started</option></select></label>
            <label>Expected outcome <b>*</b><input name="expectedOutcome" required defaultValue={draftOutcome} placeholder="e.g. Improve readiness score by 8 points"/></label>
          </div>
        </section>

        <section>
          <header><span>03</span><div><h2>Planning evidence</h2><p>Attach the needs analysis, minutes, syllabus draft, approval memo, or other supporting files.</p></div></header>
          <DocumentUpload label="Supporting documents"/>
        </section>

        <footer><Link href="/university/actions">Cancel</Link><button type="submit">Create Action Plan</button></footer>
      </div>

      <aside className="cap-create-aside">
        <section className="cap-create-ai"><span>✦</span><div><h2>{isAdvisorDraft ? "Curriculum Advisor draft" : "AI planning guidance"}</h2>{isAdvisorDraft ? <><p>This draft is based on the selected recommendation. It is decision support and does not change the curriculum until the institution approves it.</p><dl className="cap-create-evidence"><div><dt>Priority</dt><dd>{recommendation.priority ?? "Not scored"}</dd></div><div><dt>Employer demand</dt><dd>{relatedRoles} open role{relatedRoles === 1 ? "" : "s"}</dd></div><div><dt>Cohort evidence gap</dt><dd>{cohortShare === null ? "Withheld for privacy" : `${cohortShare}%`}</dd></div></dl></> : <p>Use a specific action, a named owner, a target date, and an outcome that can be measured.</p>}</div></section>
        <section><h2>Human verification</h2><p>Creating this plan does not mark it complete. When implementation finishes, the owner submits evidence for an initial AI completeness check.</p><p>A FURSAH administrator then reviews the evidence and makes the final approval or requests changes.</p><strong>AI assists. A human verifies.</strong></section>
        <section><h2>Required fields</h2><ul><li>Title and objective</li><li>Skill and affected curriculum</li><li>Accountable owner</li><li>Target completion date</li><li>Expected measurable outcome</li></ul></section>
      </aside>
    </form>
  </main>;
}
