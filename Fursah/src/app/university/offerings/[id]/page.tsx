import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUniversity } from "@/lib/session";
import { updateOffering } from "@/actions/university";
import DocumentUpload from "@/components/DocumentUpload";
import OfferingDeleteControl from "@/components/OfferingDeleteControl";

export default async function ManageOffering({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const ctx = await getCurrentUniversity();
  if (!ctx) redirect("/login");
  const { id } = await params;
  const query = await searchParams;

  const offering = await prisma.offering.findFirst({
    where: { id, universityId: ctx.university.id },
    include: { certification: true, skills: { include: { skill: true } } },
  });
  if (!offering) notFound();

  const skillNames = offering.skills.map((entry) => entry.skill.name);

  return <main className="uo-page">
    <header className="uo-heading">
      <div>
        <span>CURRICULUM MANAGEMENT　/　MANAGE OFFERING</span>
        <h1>{offering.title}</h1>
        <p>Edit the details, skills, and credential mapping used for curriculum and readiness analysis.</p>
      </div>
      <Link href={`/university/curriculum#offering-${offering.id}`}>← Back to Courses &amp; Certifications</Link>
    </header>

    {query.saved === "1" && <div className="uo-success" role="status">✓ Changes saved. Curriculum analysis has been updated.</div>}

    <div className="uo-layout">
      <form action={updateOffering} className="uo-form">
        <input type="hidden" name="offeringId" value={offering.id} />

        <section>
          <header><span>01</span><div><h2>Basic Information</h2><p>Identify the offering students and advisors will see.</p></div></header>
          <label>Title <input name="title" defaultValue={offering.title} required /></label>
          <label>Offering type
            <select name="type" defaultValue={offering.type}>
              <option value="course">Course</option>
              <option value="certification">Certification programme</option>
            </select>
          </label>
          <label>Description <textarea name="description" defaultValue={offering.description ?? ""} rows={5} /></label>
        </section>

        <section>
          <header><span>02</span><div><h2>Skills and Credential Mapping</h2><p>These fields drive gap analysis, student recommendations, and certification mapping.</p></div></header>
          <label>Skills covered <input name="skills" defaultValue={skillNames.join(", ")} placeholder="Python, Machine Learning, SQL" /><small>Separate skills with commas. Removing a skill here removes it from this offering.</small></label>
          <label>Certification awarded <input name="certificationName" defaultValue={offering.certification?.name ?? ""} placeholder="e.g. AWS Certified Cloud Practitioner" /><small>Clear this field to unmap the credential from this offering.</small></label>
        </section>

        <section>
          <header><span>03</span><div><h2>Access Information</h2><p>Provide the official page students should use to learn more or enroll.</p></div></header>
          <label>Course URL <input name="url" type="url" defaultValue={offering.url ?? ""} placeholder="https://university.edu.sa/courses/..." /><small>Optional. The link must begin with http:// or https://.</small></label>
          <DocumentUpload label="Updated syllabus or course specification" />
        </section>

        <footer>
          <Link href={`/university/curriculum#offering-${offering.id}`}>Cancel</Link>
          <button type="submit">Save changes</button>
        </footer>
      </form>

      <aside className="uo-aside">
        <section className="uo-help">
          <h2>Current mapping</h2>
          <p>
            {skillNames.length ? `${skillNames.length} skill(s) mapped: ${skillNames.join(", ")}.` : "No skills are mapped yet, so this offering does not count towards demand coverage."}
          </p>
          <p>
            {offering.certification ? `Grants ${offering.certification.name}.` : "No certification is mapped to this offering."}
          </p>
          <Link href="/university/curriculum#certification-mapping">View certification mapping</Link>
        </section>
        <section className="uo-help">
          <h2>Remove this offering</h2>
          <p>Deleting removes it from the catalogue, from certification mapping, and from student recommendations. This cannot be undone.</p>
          <OfferingDeleteControl offeringId={offering.id} offeringTitle={offering.title} />
        </section>
      </aside>
    </div>
  </main>;
}
