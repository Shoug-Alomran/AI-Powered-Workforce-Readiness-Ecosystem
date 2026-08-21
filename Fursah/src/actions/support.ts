"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function createSupportTicket(formData: FormData) {
  const user = await getCurrentUser();
  const name = String(formData.get("name") ?? user?.name ?? "").trim();
  const email = String(formData.get("email") ?? user?.email ?? "").trim();
  const category = String(formData.get("category") ?? "GENERAL");
  const subject = String(formData.get("subject") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  if (!name || !email || !subject || !message) throw new Error("All support fields are required");
  const urgent = category === "PRIVACY" || category === "SAFETY";
  await prisma.supportTicket.create({ data: { userId: user?.id ?? null, name, email, category, subject, message, priority: urgent ? "URGENT" : "NORMAL" } });
  revalidatePath("/admin/support");
  redirect("/support?submitted=1");
}
