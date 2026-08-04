"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUniversity } from "@/lib/session";

export async function createCurriculumAction(formData: FormData) {
  const ctx = await getCurrentUniversity();
  if (!ctx) throw new Error("University access required");
  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("Action title is required");
  await prisma.curriculumAction.create({ data: { universityId: ctx.university.id, title, skill: String(formData.get("skill") ?? "").trim() || null, owner: String(formData.get("owner") ?? "").trim() || null } });
  revalidatePath("/university/actions");
}

export async function updateCurriculumAction(formData: FormData) {
  const ctx = await getCurrentUniversity();
  if (!ctx) throw new Error("University access required");
  const id = String(formData.get("actionId") ?? "");
  const status = String(formData.get("status") ?? "PROPOSED");
  const outcomeNote = String(formData.get("outcomeNote") ?? "").trim();
  await prisma.curriculumAction.updateMany({ where: { id, universityId: ctx.university.id }, data: { status, outcomeNote: outcomeNote || null } });
  revalidatePath("/university/actions");
}
