import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUniversity } from "@/lib/session";

type DemandSignal = {
  name: string;
  roles: Set<string>;
  employers: Set<string>;
  essentialJobs: number;
  preferredJobs: number;
  demandPoints: number;
};

export default async function UniversityJobDemand({ searchParams }: { searchParams: Promise<{ q?: string; track?: string }> }) {
  const ctx = await getCurrentUniversity();
  if (!ctx) redirect("/login");
  const query = await searchParams;
  const q = (query.q ?? "").trim().toLowerCase();
  const track = (query.track ?? "").trim();

  const [allJobs, students, offerings] = await Promise.all([
    prisma.job.findMany({
      where: { status: "open" },
      include: { employer: true, requiredSkills: { include: { skill: true } }, requiredCerts: { include: { certification: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.student.findMany({ where: { university: ctx.university.institution }, include: { skills: { include: { skill: true } } } }),
    prisma.offering.findMany({ where: { universityId: ctx.university.id }, include: { skills: { include: { skill: true } }, certification: true } }),
  ]);

  const tracks = [...new Set(allJobs.map(job => job.careerTrack))].sort();
  const jobs = allJobs.filter(job => (!track || job.careerTrack === track) && (!q || `${job.title} ${job.employer.company} ${job.description ?? ""} ${job.requiredSkills.map(s => s.skill.name).join(" ")}`.toLowerCase().includes(q)));
  const signals = new Map<string, DemandSignal>();
  for (const job of jobs) for (const requirement of job.requiredSkills) {
    const current = signals.get(requirement.skill.name) ?? { name: requirement.skill.name, roles: new Set(), employers: new Set(), essentialJobs: 0, preferredJobs: 0, demandPoints: 0 };
    current.roles.add(job.title); current.employers.add(job.employer.company); current.demandPoints += requirement.weight;
    if (requirement.requirementType === "PREFERRED") current.preferredJobs += 1; else current.essentialJobs += 1;
    signals.set(current.name, current);
  }
  const rankedSkills = [...signals.values()].sort((a, b) => b.essentialJobs - a.essentialJobs || b.demandPoints - a.demandPoints);
  const cohortCoverage = (skill: string) => students.length >= 20 ? Math.round(students.filter(student => student.skills.some(s => s.skill.name === skill && s.level >= 3)).length / students.length * 100) : null;
  const offeringFor = (skill: string) => offerings.find(offering => offering.skills.some(s => s.skill.name === skill));
  const averageExperience = jobs.length ? Math.round(jobs.reduce((sum, job) => sum + job.minExperience, 0) / jobs.length) : 0;
  const certificationDemand = new Map<string, number>();
  jobs.forEach(job => job.requiredCerts.forEach(cert => certificationDemand.set(cert.certification.name, (certificationDemand.get(cert.certification.name) ?? 0) + 1)));

  return <main className="page-shell">
    <div className="data-row"><div><span className="eyebrow">Live employer requirements</span><h1 className="page-title">What the job market is asking for</h1></div><Link className="button secondary" href="/university/actions">Open action plan</Link></div>
    <p className="muted">Every signal below comes from an open employer role in Fursah. Use it to decide which modules, practical experiences, and certifications should enter curriculum review.</p>
    <form className="card" style={{ marginTop: 26 }}><div className="grid-2"><label>Search roles, employers, or skills<input className="input" name="q" defaultValue={query.q ?? ""} placeholder="Machine Learning, analyst, cybersecurity…"/></label><label>Career track<select className="input" name="track" defaultValue={track}><option value="">All career tracks</option>{tracks.map(value => <option value={value} key={value}>{value.replaceAll("-", " ")}</option>)}</select></label></div><div className="actions"><button className="button primary">Apply filters</button><Link className="button secondary" href="/university/job-demand">Clear</Link></div></form>
    <div className="grid-3" style={{ marginTop: 18 }}><div className="card"><span className="muted">Open jobs analyzed</span><div className="metric">{jobs.length}</div></div><div className="card"><span className="muted">Employers represented</span><div className="metric">{new Set(jobs.map(j => j.employerId)).size}</div></div><div className="card"><span className="muted">Average minimum experience</span><div className="metric">{averageExperience}<small> months</small></div></div></div>

    <section className="card" style={{ marginTop: 18 }}><span className="eyebrow">Curriculum recommendations</span><h2>Highest-priority skills to address</h2><p className="muted">Priority rises when a skill is essential across several jobs, has low student coverage, or is not addressed by a current university offering.</p>{students.length < 20 && <div className="notice">Student coverage is hidden because this cohort contains fewer than 20 students. Employer-demand evidence remains available and does not expose student information.</div>}{rankedSkills.length ? rankedSkills.slice(0, 10).map((signal, index) => { const coverage = cohortCoverage(signal.name); const offering = offeringFor(signal.name); const suggestedTitle = offering ? `Review and expand ${signal.name} coverage in ${offering.title}` : `Add an applied ${signal.name} module`; return <div className="data-row" key={signal.name}><div style={{ flex: 1 }}><div><span className="pill">Priority {index + 1}</span> {signal.essentialJobs > 0 && <span className="pill">Essential in {signal.essentialJobs} job(s)</span>}</div><strong style={{ display: "block", marginTop: 8 }}>{signal.name}</strong><div className="muted">Requested by {signal.employers.size} employer(s) for: {[...signal.roles].join(", ")}</div><div className="muted">{coverage === null ? "Student coverage: hidden for small cohort" : `Student coverage at level 3+: ${coverage}%`} · {offering ? `Current offering: ${offering.title}` : "No mapped university offering"}</div>{coverage !== null && <div className="bar" style={{ marginTop: 8 }}><i style={{ width: `${coverage}%` }}/></div>}</div><Link className="button secondary" href={`/university/actions?skill=${encodeURIComponent(signal.name)}&title=${encodeURIComponent(suggestedTitle)}`}>{offering ? "Review course" : "Propose course"}</Link></div>; }) : <div className="notice">No open jobs match these filters.</div>}</section>

    <div className="grid-2" style={{ marginTop: 18, alignItems: "start" }}><section className="card"><span className="eyebrow">Roles behind the data</span><h2>Open jobs and exact requirements</h2>{jobs.map(job => <div className="data-row" key={job.id}><div><strong>{job.title}</strong><div className="muted">{job.employer.company} · Minimum {job.minExperience} month(s)</div><div style={{ marginTop: 6 }}>{job.requiredSkills.map(skill => <span className="pill" key={skill.id}>{skill.skill.name} · {skill.requirementType === "PREFERRED" ? "preferred" : "essential"}</span>)}</div>{job.requiredCerts.length > 0 && <div className="muted" style={{ marginTop: 6 }}>Certifications: {job.requiredCerts.map(c => c.certification.name).join(", ")}</div>}</div></div>)}</section><section className="card"><span className="eyebrow">Credential signals</span><h2>Certifications employers require</h2>{certificationDemand.size ? [...certificationDemand.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => { const mapped = offerings.find(o => o.certification?.name === name); return <div className="data-row" key={name}><div><strong>{name}</strong><div className="muted">Required by {count} open job(s) · {mapped ? `Supported by ${mapped.title}` : "No mapped preparation offering"}</div></div>{!mapped && <Link className="link" href={`/university/actions?skill=${encodeURIComponent(name)}&title=${encodeURIComponent(`Add preparation pathway for ${name}`)}`}>Add to plan →</Link>}</div>; }) : <div className="notice">The selected jobs do not require named certifications.</div>}</section></div>
  </main>;
}
