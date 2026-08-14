import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUniversity } from "@/lib/session";
import { createOffering } from "@/actions/university";
import DocumentUpload from "@/components/DocumentUpload";

export default async function UniversityOfferings({searchParams}:{searchParams:Promise<{created?:string}>}) {
  const ctx=await getCurrentUniversity();
  if(!ctx)redirect("/login");
  const params=await searchParams;

  return <main className="uo-page">
    <header className="uo-heading">
      <div><span>CURRICULUM MANAGEMENT　/　NEW COURSE</span><h1>Add a Course</h1><p>Create a course that can be matched to student skill gaps and workforce demand.</p></div>
      <Link href="/university/curriculum">← Back to Courses &amp; Certifications</Link>
    </header>

    {params.created==="1"&&<div className="uo-success" role="status">✓ Course added successfully. It is now available for curriculum matching.</div>}

    <div className="uo-layout">
      <form action={createOffering} className="uo-form" id="add-course">
        <section>
          <header><span>01</span><div><h2>Basic Information</h2><p>Identify the offering students and advisors will see.</p></div></header>
          <label>Course title <input name="title" placeholder="e.g. Advanced Cloud Architecture" required autoFocus/></label>
          <label>Course description <textarea name="description" placeholder="Describe the learning outcomes, subject coverage, and intended students." rows={5}/></label>
        </section>

        <section>
          <header><span>02</span><div><h2>Skills and Outcomes</h2><p>These fields power readiness analysis and student recommendations.</p></div></header>
          <label>Skills covered <input name="skills" placeholder="Python, Machine Learning, SQL"/><small>Separate skills with commas. Use clear, recognized skill names.</small></label>
          <label>Certification awarded <input name="certificationName" placeholder="e.g. AWS Cloud Practitioner"/><small>Optional. Add only when completing this offering awards the credential.</small></label>
        </section>

        <section>
          <header><span>03</span><div><h2>Access Information</h2><p>Provide the official page students should use to learn more or enroll.</p></div></header>
          <label>Course URL <input name="url" type="url" placeholder="https://university.edu.sa/courses/..."/><small>Optional. The link must begin with http:// or https://.</small></label>
          <DocumentUpload label="Approved syllabus or course specification"/>
        </section>

        <footer><Link href="/university/curriculum">Cancel</Link><button type="submit">Add Course</button></footer>
      </form>

      <aside className="uo-aside">
        <section className="uo-ai"><header><span>✦</span><div><h2>AI Curriculum Guidance</h2><p>Recommendations update as offering data improves.</p></div></header><ul><li>Use a specific title that describes the subject level.</li><li>Map only skills directly taught and assessed.</li><li>Add a recognized credential only when it is awarded.</li><li>Include an official URL so students can verify details.</li></ul><div><small>EXPECTED IMPACT</small><strong>Better skill-gap matching</strong><p>Complete course data helps Fursa recommend the right learning pathway.</p></div></section>
        <section className="uo-help"><h2>Before publishing</h2><p>Confirm that curriculum information is approved by the responsible academic department.</p><Link href="/support">Contact support</Link></section>
      </aside>
    </div>

  </main>;
}
