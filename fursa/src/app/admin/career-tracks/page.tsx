import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/session";
import { createCareerTrack, updateCareerTrackSkillWeight, removeCareerTrackSkill, addCareerTrackSkill } from "@/actions/admin";
import PageToc from "@/components/PageToc";

export default async function CareerTracksAdmin() {
  const ctx = await getCurrentAdmin();
  if (!ctx) redirect("/login");

  const tracks = await prisma.careerTrack.findMany({
    include: {
      trackSkills: { include: { skill: true }, orderBy: { weight: "desc" } },
      trackCerts: { include: { certification: true } },
    },
    orderBy: { label: "asc" },
  });

  return (
    <main className="page-shell">
      <div className="data-row">
        <div>
          <span className="eyebrow">Career taxonomy</span>
          <h1 className="page-title">Career tracks & skill weights</h1>
        </div>
        <Link className="link" href="/admin/dashboard">← Back to admin dashboard</Link>
      </div>
      <p className="muted">
        This is the reference table every readiness score, roadmap, and job-matching calculation reads from. Changes here
        take effect immediately, with no code deploy needed.
      </p>

      {tracks.length === 0 && (
        <div className="notice" style={{ marginTop: 18 }}>
          No career tracks in the database yet. The app is currently falling back to the built-in defaults in{" "}
          <code>careerTracks.ts</code>. Create one below to start managing the taxonomy here.
        </div>
      )}

      <PageToc
        items={[
          ...tracks.map((t) => ({ id: `track-${t.id}`, label: t.label })),
          { id: "new-track", label: "+ New track" },
        ]}
      />

      <div className="stack" style={{ marginTop: 26 }}>
        {tracks.map((track) => (
          <section className="card" id={`track-${track.id}`} style={{ scrollMarginTop: 80 }} key={track.id}>
            <div className="data-row">
              <div>
                <strong style={{ fontSize: 18 }}>{track.label}</strong>
                <div className="muted">{track.id} · {track.recommendedExperienceMonths} recommended experience month(s)</div>
              </div>
            </div>

            <div className="grid-2" style={{ marginTop: 12 }}>
              <div>
                <strong>Skills & weights</strong>
                {track.trackSkills.map((ts) => (
                  <div className="data-row" key={ts.id}>
                    <span>{ts.skill.name} <span className="muted">({ts.category})</span></span>
                    <div className="actions">
                      <form action={updateCareerTrackSkillWeight} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <input type="hidden" name="trackSkillId" value={ts.id} />
                        <select className="input" name="weight" defaultValue={String(ts.weight)} style={{ padding: "4px 6px", width: 62 }}>
                          {[1, 2, 3].map((n) => <option key={n} value={n}>{n}</option>)}
                        </select>
                        <button className="button secondary" style={{ padding: "6px 10px" }}>Save</button>
                      </form>
                      <form action={removeCareerTrackSkill}>
                        <input type="hidden" name="trackSkillId" value={ts.id} />
                        <button className="button danger" style={{ padding: "6px 10px" }}>Remove</button>
                      </form>
                    </div>
                  </div>
                ))}
                <form action={addCareerTrackSkill} className="form-grid" style={{ marginTop: 12 }}>
                  <input type="hidden" name="careerTrackId" value={track.id} />
                  <div className="grid-3">
                    <label>Skill<input className="input" name="skillName" required /></label>
                    <label>Category
                      <select className="input" name="category" defaultValue="technical">
                        <option value="technical">Technical</option>
                        <option value="soft">Soft</option>
                      </select>
                    </label>
                    <label>Weight
                      <select className="input" name="weight" defaultValue="2">
                        {[1, 2, 3].map((n) => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </label>
                  </div>
                  <button className="button secondary">Add skill to track</button>
                </form>
              </div>

              <div>
                <strong>Recommended certifications</strong>
                {track.trackCerts.length ? track.trackCerts.map((c) => (
                  <div className="data-row" key={c.id}><span>{c.certification.name}</span></div>
                )) : <p className="muted">None configured.</p>}
              </div>
            </div>
          </section>
        ))}
      </div>

      <section className="card" id="new-track" style={{ marginTop: 18, scrollMarginTop: 80 }}>
        <span className="eyebrow">New track</span>
        <h2>Create a career track</h2>
        <form action={createCareerTrack} className="form-grid">
          <label>Label<input className="input" name="label" placeholder="e.g. Cloud Solutions Architect" required /></label>
          <label>Recommended experience (months)<input className="input" type="number" name="recommendedExperienceMonths" min="0" defaultValue="6" /></label>
          <label>
            Skills
            <input className="input" name="skills" placeholder="Python:3:technical, Communication:2:soft" />
            <small className="muted">Format: name:weight(1-3):category(technical|soft), comma-separated.</small>
          </label>
          <label>Recommended certifications<input className="input" name="certifications" placeholder="AWS Certified Cloud Practitioner, PMI Project Management" /></label>
          <button className="button primary">Create career track</button>
        </form>
      </section>
    </main>
  );
}
