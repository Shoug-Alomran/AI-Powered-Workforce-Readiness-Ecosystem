import { prisma } from "@/lib/db";
import { getCurrentUniversity } from "@/lib/session";
import { computeReadinessScore } from "@/lib/ai";
import { getAllCareerTracksAsync } from "@/lib/careerTracks.server";

function csvCell(value: string | number): string {
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function csvRow(cells: (string | number)[]): string {
  return cells.map(csvCell).join(",") + "\n";
}

export async function GET() {
  const ctx = await getCurrentUniversity();
  if (!ctx) return new Response("Unauthorized", { status: 401 });

  const [students, jobs, applications, tracks] = await Promise.all([
    prisma.student.findMany({
      where: { university: ctx.university.institution },
      include: { skills: { include: { skill: true } }, certifications: { include: { certification: true } }, experiences: true, projects: true },
    }),
    prisma.job.findMany({ where: { status: "open" }, include: { requiredSkills: { include: { skill: true } } } }),
    prisma.application.findMany({ where: { student: { university: ctx.university.institution } } }),
    getAllCareerTracksAsync(),
  ]);

  const trackById = new Map(tracks.map((t) => [t.id, t]));
  const scored = students.map((student) =>
    computeReadinessScore(student, trackById.get(student.targetCareer) ?? tracks[0]).score
  );
  const average = scored.length ? Math.round(scored.reduce((a, b) => a + b, 0) / scored.length) : 0;
  const ready = scored.filter((s) => s >= 80).length;

  const demand = new Map<string, number>();
  jobs.forEach((job) => job.requiredSkills.forEach((item) => demand.set(item.skill.name, (demand.get(item.skill.name) ?? 0) + item.weight)));
  const skillsHeld = new Set(students.flatMap((student) => student.skills.map((item) => item.skill.name)));
  const topDemand = [...demand.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);

  const tracksCount = new Map<string, number>();
  students.forEach((student) => tracksCount.set(student.targetCareer, (tracksCount.get(student.targetCareer) ?? 0) + 1));

  let csv = "";
  csv += `Fursah workforce intelligence export — ${ctx.university.institution}\n`;
  csv += `Generated,${new Date().toISOString()}\n\n`;

  csv += "Section,Metric,Value\n";
  csv += csvRow(["Summary", "Cohort size", students.length]);
  csv += csvRow(["Summary", "Average readiness score", average]);
  csv += csvRow(["Summary", "Career-ready learners (score >= 80)", ready]);
  csv += csvRow(["Summary", "Applications submitted by cohort", applications.length]);
  csv += "\n";

  csv += "Section,Skill,Demand points,Covered by cohort\n";
  for (const [skill, points] of topDemand) {
    csv += csvRow(["Industry demand", skill, points, skillsHeld.has(skill) ? "Yes" : "Gap"]);
  }
  csv += "\n";

  csv += "Section,Career track,Learner count\n";
  for (const [trackId, count] of tracksCount.entries()) {
    csv += csvRow(["Career pathways", (trackById.get(trackId) ?? tracks[0])?.label ?? trackId, count]);
  }

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="fursah-workforce-intelligence-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
