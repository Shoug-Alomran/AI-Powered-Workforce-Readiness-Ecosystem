"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUniversity } from "@/lib/session";
import { storeEvidenceDocuments } from "@/lib/documents";

async function requireUniversity() {
  const ctx = await getCurrentUniversity();
  if (!ctx) throw new Error("Not signed in as a university");
  return ctx.university;
}

export async function createOffering(formData: FormData) {
  const university = await requireUniversity();
  const title = String(formData.get("title") ?? "").trim();
  const type = String(formData.get("type") ?? "course") === "certification" ? "certification" : "course";
  const description = String(formData.get("description") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  const skillsRaw = String(formData.get("skills") ?? ""); // comma-separated skill names
  const certName = String(formData.get("certificationName") ?? "").trim();

  if (!title) throw new Error("A title is required");

  let certificationId: string | null = null;
  if (certName) {
    const cert = await prisma.certification.upsert({
      where: { name: certName },
      update: {},
      create: { name: certName },
    });
    certificationId = cert.id;
  }

  const offering = await prisma.offering.create({
    data: {
      universityId: university.id,
      title,
      type,
      description: description || null,
      url: url || null,
      certificationId,
    },
  });

  const skillNames = skillsRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  for (const name of skillNames) {
    const skill = await prisma.skill.upsert({
      where: { name },
      update: {},
      create: { name, category: "technical" },
    });
    await prisma.offeringSkill.create({ data: { offeringId: offering.id, skillId: skill.id } });
  }

  const files=formData.getAll("documents");
  if(files.some(file=>file instanceof File&&file.size>0)) await storeEvidenceDocuments({files,ownerUserId:university.userId,contextType:"OFFERING",contextId:offering.id,purpose:"Approved course specification and curriculum evidence"});

  revalidatePath("/university/offerings");
  revalidatePath("/student/interests");
  redirect("/university/offerings?created=1");
}

export async function updateOffering(formData: FormData) {
  const university = await requireUniversity();
  const offeringId = String(formData.get("offeringId") ?? "");
  const existing = await prisma.offering.findFirst({ where: { id: offeringId, universityId: university.id } });
  if (!existing) throw new Error("Offering not found");

  const title = String(formData.get("title") ?? "").trim();
  const type = String(formData.get("type") ?? "course") === "certification" ? "certification" : "course";
  const description = String(formData.get("description") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  const skillsRaw = String(formData.get("skills") ?? "");
  const certName = String(formData.get("certificationName") ?? "").trim();

  if (!title) throw new Error("A title is required");

  let certificationId: string | null = null;
  if (certName) {
    const cert = await prisma.certification.upsert({ where: { name: certName }, update: {}, create: { name: certName } });
    certificationId = cert.id;
  }

  await prisma.offering.update({
    where: { id: existing.id },
    data: { title, type, description: description || null, url: url || null, certificationId },
  });

  const skillNames = [...new Set(
    skillsRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  )];

  const skillIds: string[] = [];
  for (const name of skillNames) {
    const skill = await prisma.skill.upsert({ where: { name }, update: {}, create: { name, category: "technical" } });
    skillIds.push(skill.id);
  }

  await prisma.offeringSkill.deleteMany({ where: { offeringId: existing.id, skillId: { notIn: skillIds } } });
  const kept = await prisma.offeringSkill.findMany({ where: { offeringId: existing.id }, select: { skillId: true } });
  const keptIds = new Set(kept.map((entry) => entry.skillId));
  for (const skillId of skillIds) {
    if (!keptIds.has(skillId)) await prisma.offeringSkill.create({ data: { offeringId: existing.id, skillId } });
  }

  const files = formData.getAll("documents");
  if (files.some((file) => file instanceof File && file.size > 0))
    await storeEvidenceDocuments({ files, ownerUserId: university.userId, contextType: "OFFERING", contextId: existing.id, purpose: "Approved course specification and curriculum evidence" });

  revalidatePath("/university/curriculum");
  revalidatePath("/university/offerings");
  revalidatePath("/student/interests");
  redirect(`/university/offerings/${existing.id}?saved=1`);
}

export async function deleteOffering(formData: FormData) {
  const university = await requireUniversity();
  const offeringId = String(formData.get("offeringId") ?? "");
  if (!offeringId) return;

  await prisma.offering.deleteMany({ where: { id: offeringId, universityId: university.id } });

  revalidatePath("/university/curriculum");
  revalidatePath("/university/offerings");
  revalidatePath("/student/interests");
  redirect("/university/curriculum?removed=1");
}
