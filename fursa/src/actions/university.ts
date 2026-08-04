"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUniversity } from "@/lib/session";

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

  revalidatePath("/university/offerings");
  revalidatePath("/student/interests");
}

export async function deleteOffering(formData: FormData) {
  const university = await requireUniversity();
  const offeringId = String(formData.get("offeringId") ?? "");
  if (!offeringId) return;

  await prisma.offering.deleteMany({ where: { id: offeringId, universityId: university.id } });

  revalidatePath("/university/offerings");
  revalidatePath("/student/interests");
}
