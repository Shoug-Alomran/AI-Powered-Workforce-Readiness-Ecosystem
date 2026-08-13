import Link from "next/link";
import { prisma } from "@/lib/db";

export default async function Home() {
  const [students, jobs, employers] = await Promise.all([
    prisma.student.count(), prisma.job.count({ where: { status: "open" } }), prisma.employer.count(),
  ]);
  return <main className="flex-1">
    <section className="hero"><div className="shell hero-grid">
      <div><span className="eyebrow" data-i18n="home.eyebrow">Built for Saudi Vision 2030</span><h1 data-i18n="home.title">Turn ambition into a career-ready path.</h1><p data-i18n="home.lead">Fursah connects students, employers and universities with explainable AI—showing every learner what to build next and every employer why a candidate fits.</p><div className="actions"><Link className="button primary" href="/login"><span data-i18n="home.explore">Explore the prototype</span></Link><Link className="button secondary" href="/workforce-intelligence"><span data-i18n="home.insights">View workforce insights</span></Link></div><div className="trust"><span data-i18n="home.human">Human oversight</span><span data-i18n="home.explainable">Explainable scores</span><span data-i18n="home.privacy">Privacy-first</span></div></div>
      <div className="hero-card"><div className="hero-card-head"><span>Career readiness</span><strong>Live profile</strong></div><div className="score-orbit"><div><b>74</b><span>Developing</span></div></div><div className="mini-progress"><span>Technical skills</span><b>82%</b><i style={{width:"82%"}} /></div><div className="mini-progress"><span>Experience</span><b>64%</b><i style={{width:"64%"}} /></div><div className="next-step"><span>Highest-impact next step</span><strong>Complete a cloud certification</strong><small>+8 projected readiness points</small></div></div>
    </div></section>
    <section className="shell section"><div className="section-kicker" data-i18n="home.ecosystem">One connected ecosystem</div><h2 data-i18n="home.ecosystemTitle">From learning to employment—and back again.</h2><div className="feature-grid">{[["01","Students","Personal roadmaps, a verified skills passport and clear next steps.","home.students"],["02","Employers","Structured job requirements and explainable candidate ranking.","home.employers"],["03","Universities","Aggregated demand signals and evidence for curriculum decisions.","home.universities"]].map(([n,t,d,key])=><article className="feature" key={n}><span>{n}</span><h3 data-i18n={key}>{t}</h3><p>{d}</p></article>)}</div></section>
    <section className="impact"><div className="shell impact-grid"><div><span className="eyebrow light" data-i18n="home.prototype">Working prototype</span><h2 data-i18n="home.realData">Real data. Transparent logic. Immediate feedback.</h2></div><div className="stats"><div><b>{students}</b><span>student profiles</span></div><div><b>{jobs}</b><span>live opportunities</span></div><div><b>{employers}</b><span>demo employers</span></div></div></div></section>
  </main>;
}
