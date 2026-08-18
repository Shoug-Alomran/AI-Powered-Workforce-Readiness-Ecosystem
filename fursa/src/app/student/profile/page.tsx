import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentStudent } from "@/lib/session";
import { allSkillNames, allCertificationNames } from "@/lib/careerTracks";
import { getAllCareerTracksAsync } from "@/lib/careerTracks.server";
import { computeReadinessScore } from "@/lib/ai";
import { updateStudentProfile, addOrUpdateSkill, addCertification, addExperience, addProject } from "@/actions/student";
import PageToc from "@/components/PageToc";
import DocumentUpload from "@/components/DocumentUpload";
import CareerMajorSelector from "@/components/CareerMajorSelector";
import AccountAvatar from "@/components/AccountAvatar";

export default async function Profile({ searchParams }: { searchParams: Promise<{ upload?: string; setup?: string }> }) {
  const ctx = await getCurrentStudent(); if (!ctx) redirect("/login");
  const query = await searchParams;
  const [s, tracks] = await Promise.all([
    prisma.student.findUniqueOrThrow({ where: { id: ctx.student.id }, include: { skills: { include: { skill: true } }, certifications: { include: { certification: true } }, experiences: true, projects: true } }),
    getAllCareerTracksAsync(),
  ]);
  const track = tracks.find(item => item.id === s.targetCareer) ?? tracks[0];
  const readiness = track ? computeReadinessScore(s, track) : { score: 0 };
  const verifiedCerts = s.certifications.filter(item => item.verificationStatus === "VERIFIED").length;
  const evidenceCount = s.skills.length + s.projects.length + s.certifications.length + s.experiences.length;
  const initials = ctx.user.name.split(" ").map(part => part[0]).slice(0,2).join("").toUpperCase();

  return <main className="page-shell student-passport-page">
    <section className="student-passport-hero">
      <div className="student-passport-identity"><div className="student-passport-avatar"><AccountAvatar initials={initials}/><span>✓</span></div><div><span className="eyebrow">AI SKILLS PASSPORT</span><h1>{ctx.user.name}</h1><h2>{track?.label ?? "Career profile"}</h2><p>{s.university || "University not added"}{s.degree ? ` · ${s.degree}` : ""}</p><div className="student-passport-status"><span><small>CAREER READINESS</small><b>{readiness.score}<i>/100</i></b></span><span><small>PROFILE EVIDENCE</small><b>{evidenceCount} items</b></span><span><small>STATUS</small><b className="verified">✓ Verified identity</b></span></div></div></div>
      <div className="student-passport-actions"><a href="#career-profile">Complete Profile</a><Link href="/student/passport-sharing">Share Passport</Link></div>
      <div className="student-ai-callout"><b>✦</b><p><strong>AI Profile Insight</strong>Your profile has {evidenceCount} evidence item(s). Add verified certifications and applied projects to improve readiness for {track?.label ?? "your target career"}.</p></div>
    </section>

    {(query.setup === "passport" || evidenceCount === 0) && <section className="notice student-passport-setup">
      <strong>Start with your Skills Passport</strong>
      <p>This is the record employers see. Add your skills, certifications, experience, and projects below. Each entry is checked automatically, then verified by a person before it counts as evidence.</p>
      <p className="muted">Once you have added your first entries, {s.targetCareer === "undecided" ? <>choose the career you are aiming at so your readiness can be scored against it.</> : <>your readiness is scored against {track?.label ?? "your target career"}.</>}</p>
      <div className="student-passport-setup-actions">
        <a className="button primary" href="#skills">Add your first skill</a>
        {s.targetCareer === "undecided" && <Link className="button secondary" href="/student/interests?setup=career">Choose your career direction</Link>}
      </div>
    </section>}

    {query.upload === "storage-unavailable" && <div className="auth-error student-upload-error">Document storage is not ready yet. Configure the private evidence bucket, then try again.</div>}
    <PageToc items={[{id:"career-profile",label:"Career profile"},{id:"skills",label:`Skills (${s.skills.length})`},{id:"certificates",label:`Certificates (${s.certifications.length})`},{id:"experience",label:`Experience (${s.experiences.length})`},{id:"projects",label:`Projects (${s.projects.length})`}]}/>

    <section className="student-passport-metrics"><article><small>VERIFIED SKILLS</small><strong>{s.skills.length}</strong><span>Evidence-backed</span></article><article><small>PROJECTS</small><strong>{s.projects.length}</strong><span>Portfolio entries</span></article><article><small>CERTIFICATES</small><strong>{s.certifications.length}</strong><span>{verifiedCerts} verified</span></article><article><small>EXPERIENCE</small><strong>{s.experiences.length}</strong><span>Total entries</span></article></section>

    <div className="student-passport-layout"><div className="stack">
      <section className="card passport-section" id="career-profile"><header><div><span className="eyebrow">PROFILE</span><h2>Career profile</h2></div><small>Keep your identity and goals current</small></header><form action={updateStudentProfile} className="form-grid passport-form"><CareerMajorSelector tracks={tracks.map(({id,label})=>({id,label}))} initialCareer={s.targetCareer}/><label>University<input className="input" name="university" defaultValue={s.university??""}/></label><label>Degree<input className="input" name="degree" defaultValue={s.degree??""}/></label><label className="wide">Bio<textarea className="input" name="bio" defaultValue={s.bio??""}/></label><button className="button primary">Save profile</button></form></section>
      <section className="card passport-section" id="skills"><header><div><span className="eyebrow">CAPABILITIES</span><h2>Verified skills</h2></div><small>{s.skills.length} recorded</small></header><div className="passport-list">{s.skills.map(x=><div className="data-row" key={x.id}><span>{x.skill.name}</span><span className="pill">Level {x.level}/5</span></div>)}</div><form action={addOrUpdateSkill} className="passport-inline-form"><select className="input" name="skillName">{allSkillNames().map(x=><option key={x.name}>{x.name}</option>)}</select><select className="input" name="level">{[1,2,3,4,5].map(n=><option key={n}>{n}</option>)}</select><button className="button secondary">Add skill</button></form></section>
    </div><div className="stack">
      <section className="card passport-section" id="certificates"><header><div><span className="eyebrow">VERIFICATION</span><h2>Certificates</h2></div><small>Administrator reviewed</small></header><p className="muted">Certificates affect readiness only after private evidence receives human verification.</p><div className="passport-list">{s.certifications.map(x=><div className="data-row" key={x.id}><div><strong>{x.certification.name}</strong><div className="muted">{x.reviewNote||x.evidenceName||"Evidence submitted"}</div></div><span className={`pill status-${x.verificationStatus.toLowerCase()}`}>{x.verificationStatus}</span></div>)}</div><form action={addCertification} className="form-grid"><label>Certification<select className="input" name="certName">{allCertificationNames().map(x=><option key={x}>{x}</option>)}</select></label><label>Certificate evidence<input className="input" type="file" name="evidence" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp" required/><small className="muted">PDF, Word, JPG, PNG, or WebP · maximum 25 MB.</small></label><button className="button secondary">Submit for verification</button></form></section>
      <section className="card passport-section" id="experience"><header><div><span className="eyebrow">WORK HISTORY</span><h2>Experience</h2></div><small>{s.experiences.length} entries</small></header><div className="passport-list">{s.experiences.map(x=><div className="data-row" key={x.id}><div><strong>{x.title}</strong><div className="muted">{x.org} · {x.months} month(s)</div></div><span className="pill">{x.type}</span></div>)}</div><form action={addExperience} className="form-grid"><label>Type<select className="input" name="type">{["internship","research","volunteer","competition","hackathon","workshop"].map(x=><option key={x}>{x}</option>)}</select></label><label>Title<input className="input" name="title" required/></label><label>Organization<input className="input" name="org"/></label><label>Months<input className="input" name="months" type="number" min="1" defaultValue="1"/></label><DocumentUpload label="Experience documents"/><button className="button secondary">Add experience</button></form></section>
      <section className="card passport-section" id="projects"><header><div><span className="eyebrow">PORTFOLIO</span><h2>Projects</h2></div><small>{s.projects.length} entries</small></header><div className="passport-list">{s.projects.map(x=><div className="data-row" key={x.id}><div><strong>{x.title}</strong><div className="muted">{x.description}</div></div></div>)}</div><form action={addProject} className="form-grid"><label>Title<input className="input" name="title" required/></label><label>Description<textarea className="input" name="description"/></label><DocumentUpload label="Project documents"/><button className="button secondary">Add project</button></form></section>
    </div></div>
  </main>;
}
