import Link from "next/link";
import { redirect } from "next/navigation";
import { createCurriculumAction } from "@/actions/curriculum";
import DocumentUpload from "@/components/DocumentUpload";
import { getCurrentUniversity } from "@/lib/session";
import { prisma } from "@/lib/db";

export default async function NewCurriculumActionPage() {
  const ctx = await getCurrentUniversity();
  if (!ctx) redirect("/login");
  const offerings = await prisma.offering.findMany({
    where: { universityId: ctx.university.id },
    select: { title: true },
    orderBy: { title: "asc" },
    take: 30,
  });

  return <main className="cap-create-page">
    <div className="cap-create-heading">
      <div><span>CURRICULUM INITIATIVE</span><h1>Create a new action plan</h1><p>Define the work, accountable owner, evidence, and intended outcome before implementation begins.</p></div>
      <Link href="/university/actions">← Back to Action Plan</Link>
    </div>

    <form action={createCurriculumAction} className="cap-create-layout">
      <input type="hidden" name="returnTo" value="actions"/>
      <div className="cap-create-form">
        <section>
          <header><span>01</span><div><h2>Action details</h2><p>State exactly what the university intends to change.</p></div></header>
          <label>Action title <b>*</b><input name="title" required maxLength={140} placeholder="e.g. Introduce Cloud Security module in CS-402"/></label>
          <label>Objective and scope <b>*</b><textarea name="objective" required minLength={30} rows={5} placeholder="Describe the curriculum gap, proposed change, and what is included in this initiative."/></label>
          <div className="cap-create-fields">
            <label>Primary skill area <b>*</b><input name="skill" required placeholder="e.g. Cloud Security"/></label>
            <label>Affected courses or department <b>*</b><input name="affectedCourses" required list="university-course-list" placeholder="e.g. CS-402, Faculty of Engineering"/><datalist id="university-course-list">{offerings.map(item=><option value={item.title} key={item.title}/>)}</datalist></label>
          </div>
        </section>

        <section>
          <header><span>02</span><div><h2>Ownership and timeline</h2><p>Assign responsibility and set a measurable delivery target.</p></div></header>
          <div className="cap-create-fields">
            <label>Accountable owner <b>*</b><input name="owner" required defaultValue={ctx.user.name}/></label>
            <label>Target completion date <b>*</b><input name="dueDate" type="date" required/></label>
            <label>Starting stage <b>*</b><select name="status" defaultValue="PROPOSED"><option value="PROPOSED">Proposed — awaiting approval</option><option value="PLANNED">Planned — approved for scheduling</option><option value="IN_PROGRESS">In progress — work has started</option></select></label>
            <label>Expected outcome <b>*</b><input name="expectedOutcome" required placeholder="e.g. Improve readiness score by 8 points"/></label>
          </div>
        </section>

        <section>
          <header><span>03</span><div><h2>Planning evidence</h2><p>Attach the needs analysis, minutes, syllabus draft, approval memo, or other supporting files.</p></div></header>
          <DocumentUpload label="Supporting documents"/>
        </section>

        <footer><Link href="/university/actions">Cancel</Link><button type="submit">Create Action Plan</button></footer>
      </div>

      <aside className="cap-create-aside">
        <section className="cap-create-ai"><span>✦</span><div><h2>AI planning guidance</h2><p>Use a specific action, a named owner, a target date, and an outcome that can be measured.</p></div></section>
        <section><h2>Human verification</h2><p>Creating this plan does not mark it complete. When implementation finishes, the owner submits evidence for an initial AI completeness check.</p><p>A FURSA administrator then reviews the evidence and makes the final approval or requests changes.</p><strong>AI assists. A human verifies.</strong></section>
        <section><h2>Required fields</h2><ul><li>Title and objective</li><li>Skill and affected curriculum</li><li>Accountable owner</li><li>Target completion date</li><li>Expected measurable outcome</li></ul></section>
      </aside>
    </form>
  </main>;
}
