import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUniversity } from "@/lib/session";
import { createOffering, deleteOffering } from "@/actions/university";

export default async function UniversityOfferings() {
  const ctx = await getCurrentUniversity();
  if (!ctx) redirect("/login");

  const offerings = await prisma.offering.findMany({
    where: { universityId: ctx.university.id },
    include: { skills: { include: { skill: true } }, certification: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="page-shell">
      <div className="data-row">
        <div>
          <span className="eyebrow">{ctx.university.institution}</span>
          <h1 className="page-title">Courses & certifications</h1>
        </div>
        <Link className="link" href="/university/dashboard">← Back to dashboard</Link>
      </div>
      <p className="muted">
        List the courses and certifications you offer. When a student is following a career track or company and is missing a
        skill your offering teaches, the AI recommends it directly to them.
      </p>

      <div className="stack" style={{ marginTop: 26 }}>
        {offerings.length ? offerings.map((o) => (
          <article className="card" key={o.id}>
            <div className="data-row">
              <div>
                <strong>{o.title}</strong>
                <div className="muted">{o.type}{o.certification ? ` · grants "${o.certification.name}"` : ""}</div>
              </div>
              <form action={deleteOffering}>
                <input type="hidden" name="offeringId" value={o.id} />
                <button className="button danger">Remove</button>
              </form>
            </div>
            {o.description && <p className="muted">{o.description}</p>}
            <p className="muted" style={{ fontSize: 13 }}>
              Skills covered: {o.skills.map((s) => s.skill.name).join(", ") || "None specified"}
            </p>
            {o.url && <a className="link" href={o.url} target="_blank" rel="noreferrer">{o.url}</a>}
          </article>
        )) : <div className="notice">No offerings listed yet. Add your first course or certification below.</div>}
      </div>

      <section className="card" style={{ marginTop: 18 }}>
        <span className="eyebrow">New offering</span>
        <h2>Add a course or certification</h2>
        <form action={createOffering} className="form-grid">
          <div className="grid-2">
            <label>Title<input className="input" name="title" placeholder="e.g. Intro to Machine Learning" required /></label>
            <label>
              Type
              <select className="input" name="type" defaultValue="course">
                <option value="course">Course</option>
                <option value="certification">Certification</option>
              </select>
            </label>
          </div>
          <label>Description<textarea className="input" name="description" placeholder="What students will learn" /></label>
          <label>Link (optional)<input className="input" name="url" type="url" placeholder="https://..." /></label>
          <label>
            Skills covered
            <input className="input" name="skills" placeholder="Python, Machine Learning, SQL" />
            <small className="muted">Comma-separated. Matched against career-track skill gaps for recommendations.</small>
          </label>
          <label>
            Grants certification (optional)
            <input className="input" name="certificationName" placeholder="e.g. Google Data Analytics" />
            <small className="muted">Only fill this in if completing the offering awards a recognized certification.</small>
          </label>
          <button className="button primary">Add offering</button>
        </form>
      </section>
    </main>
  );
}
