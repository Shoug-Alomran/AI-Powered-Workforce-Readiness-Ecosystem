import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentEmployer } from "@/lib/session";

function csv(value: unknown) {
  return `"${String(value ?? "").replaceAll('"','""')}"`;
}

export async function GET() {
  const context=await getCurrentEmployer();
  if (!context) return NextResponse.json({error:"Unauthorized"},{status:401});
  const jobs=await prisma.job.findMany({
    where:{employerId:context.employer.id},
    include:{applications:true,requiredSkills:{include:{skill:true}}},
    orderBy:{createdAt:"desc"},
  });
  const rows=[
    ["Title","Career track","Status","Applicants","Required skills","Created"],
    ...jobs.map(job=>[job.title,job.careerTrack,job.status,job.applications.length,job.requiredSkills.map(item=>item.skill.name).join("; "),job.createdAt.toISOString()]),
  ];
  const body=rows.map(row=>row.map(csv).join(",")).join("\n");
  return new NextResponse(body,{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":'attachment; filename="fursa-opportunities.csv"'}});
}
