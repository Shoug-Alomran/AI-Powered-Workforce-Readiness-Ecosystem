import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentStudent } from "@/lib/session";
import { syncRoadmap, updateRoadmapItem } from "@/actions/student";
import Link from "next/link";
import { getCareerTrackAsync } from "@/lib/careerTracks.server";
import { computeReadinessScore } from "@/lib/ai";

const LABEL: Record<string, string> = { NOT_STARTED: "Not started", IN_PROGRESS: "In progress", COMPLETED: "Completed", SKIPPED: "Skipped", STRUGGLING: "Needs an alternative" };

export default async function RoadmapPage() {
  const ctx = await getCurrentStudent();
  if (!ctx) redirect("/login");
  const [items,student]=await Promise.all([prisma.roadmapItem.findMany({ where: { studentId: ctx.student.id }, orderBy: [{ status: "asc" }, { createdAt: "desc" }] }),prisma.student.findUniqueOrThrow({where:{id:ctx.student.id},include:{skills:{include:{skill:true}},certifications:{include:{certification:true}},experiences:true,projects:true}})]);
  if(student.targetCareer==="undecided") redirect("/student/interests?setup=career");
  const track=await getCareerTrackAsync(student.targetCareer); const readiness=computeReadinessScore(student,track);
  const completed = items.filter((item) => item.status === "COMPLETED").length;
  return <main className="page-shell student-career-roadmap">
    <section className="student-design-hero student-roadmap-hero"><div><span className="eyebrow">✦ ADAPTIVE LEARNING PLAN</span><h1>Your Living Roadmap</h1><p><strong>AI Insight:</strong> Completing the next milestones can raise your readiness and unlock additional roles aligned with {track.label}.</p></div><div className="student-hero-actions"><Link href="#milestones">View Next Milestone　→</Link><form action={syncRoadmap}><button>Refresh Roadmap　↻</button></form></div><footer><span><small>TARGET CAREER</small><b>{track.label}</b></span><span><small>CURRENT READINESS</small><b className="blue">{readiness.score}%</b></span><span><small>COMPLETED</small><b>{completed}/{items.length}</b></span><span><small>POTENTIAL GAIN</small><b className="green">+{items.filter(i=>i.status!=="COMPLETED").reduce((n,i)=>n+i.expectedImpact,0)}</b></span></footer></section>
    <section className="student-roadmap-analytics"><article><h2>Readiness trajectory</h2><div className="roadmap-chart">{[18,26,readiness.score,Math.min(100,readiness.score+14),Math.min(100,readiness.score+28),Math.min(100,readiness.score+44)].map((score,index)=><i key={index} style={{height:`${Math.max(12,score)}%`}} className={index===2?"current":index>2?"future":""}><span>{index===2?`${score}%`:""}</span></i>)}</div></article><article><h2>Milestone analytics</h2><p><span>Remaining milestones</span><b>{items.length-completed} items</b></p><p><span>Current readiness</span><b>{readiness.score}%</b></p><p><span>Potential readiness gain</span><b className="green">+{items.filter(i=>i.status!=="COMPLETED").reduce((n,i)=>n+i.expectedImpact,0)}</b></p><div className="student-ai-callout"><b>✦</b><p>{items.find(i=>i.status!=="COMPLETED")?.title || "Refresh recommendations for your next milestone."}</p></div></article></section>
    <section className="card student-milestones" id="milestones"><h2>Milestones and alternatives</h2>{items.length ? items.map((item,index) => <form action={updateRoadmapItem} className="data-row" key={item.id} style={{ alignItems: "end" }}><input type="hidden" name="itemId" value={item.id}/><i className="milestone-number">{String(index+1).padStart(2,"0")}</i><div style={{ flex: 1 }}><div><span className="pill">{item.category}</span> <span className="pill">{item.source}</span></div><strong style={{ display: "block", marginTop: 8 }}>{item.title}</strong><div className="muted">Expected impact: +{item.expectedImpact} · {LABEL[item.status] ?? item.status}</div><input className="input" name="note" defaultValue={item.studentNote ?? ""} placeholder="Optional progress note" style={{ marginTop: 8 }}/></div><select className="input" name="status" defaultValue={item.status}>{Object.entries(LABEL).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><button className="button secondary">Save</button></form>) : <div className="notice">Refresh recommendations to create your first persistent roadmap.</div>}</section>
  </main>;
}
