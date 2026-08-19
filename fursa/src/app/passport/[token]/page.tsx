import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";

// A share link resolved from an opaque per-passport token, so there is no
// shell worth prerendering.
export const instant = false;

export default async function PublicPassport({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const share = await prisma.passportShare.findUnique({ where: { token }, include: { student: { include: { user: true, skills: { include: { skill: true } }, certifications: { include: { certification: true } }, experiences: true, projects: true } } } });
  if (!share || share.revokedAt || share.expiresAt <= new Date()) notFound();
  const s = share.student;
  return <main className="page-shell reading-page"><span className="eyebrow">Verified, time-limited Skills Passport</span><h1 className="page-title">{s.user.name}</h1><p className="muted">{s.degree ?? "Student"} · Target: {s.targetCareer} · Link expires {share.expiresAt.toLocaleDateString()}</p><div className="grid-2" style={{ marginTop: 26, alignItems: "start" }}><section className="card"><h2>Skills</h2>{s.skills.map(x => <div className="data-row" key={x.id}><span>{x.skill.name}</span><span className="pill">Level {x.level}/5</span></div>)}<h2 style={{ marginTop: 24 }}>Certifications</h2>{s.certifications.map(x => <div className="data-row" key={x.id}><span>{x.certification.name}</span><span className="pill">{x.verificationStatus}</span></div>)}</section><section className="card"><h2>Projects and experience</h2>{s.projects.map(x => <div className="data-row" key={x.id}><div><strong>{x.title}</strong><div className="muted">{x.description}</div></div><span className="pill">{x.verificationStatus}</span></div>)}{s.experiences.map(x => <div className="data-row" key={x.id}><div><strong>{x.title}</strong><div className="muted">{x.org} · {x.months} month(s)</div></div><span className="pill">{x.verificationStatus}</span></div>)}</section></div><div className="notice" style={{ marginTop: 18 }}>This link does not authorize reuse for another purpose. Contact the student for renewed access.</div></main>;
}
