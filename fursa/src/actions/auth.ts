"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { setSessionUserId, clearSession } from "@/lib/session";
import { CAREER_TRACKS } from "@/lib/careerTracks";

export async function loginAsUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");
  await setSessionUserId(user.id);
  redirect(user.role === "STUDENT" ? "/student/dashboard" : user.role === "EMPLOYER" ? "/employer/dashboard" : user.role === "ADMIN" ? "/admin/dashboard" : "/university/dashboard");
}

export async function createUniversityAccount(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const institution = String(formData.get("institution") ?? "").trim();
  const region = String(formData.get("region") ?? "").trim();
  if (!name || !email || !institution) throw new Error("Name, email, and institution are required");
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) { await setSessionUserId(existing.id); redirect("/university/dashboard"); }
  const user = await prisma.user.create({ data: { role: "UNIVERSITY", name, email, university: { create: { institution, region: region || null } } } });
  await setSessionUserId(user.id);
  redirect("/university/dashboard");
}

export async function logout() {
  await clearSession();
  redirect("/");
}

export async function createStudentAccount(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const targetCareer = String(formData.get("targetCareer") ?? CAREER_TRACKS[0].id);
  const university = String(formData.get("university") ?? "").trim();
  const degree = String(formData.get("degree") ?? "").trim();

  if (!name || !email) throw new Error("Name and email are required");

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await setSessionUserId(existing.id);
    redirect("/student/dashboard");
  }

  const user = await prisma.user.create({
    data: {
      role: "STUDENT",
      name,
      email,
      student: {
        create: {
          targetCareer,
          university: university || null,
          degree: degree || null,
        },
      },
    },
  });

  await setSessionUserId(user.id);
  redirect("/student/dashboard");
}

export async function createEmployerAccount(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const company = String(formData.get("company") ?? "").trim();
  const industry = String(formData.get("industry") ?? "").trim();

  if (!name || !email || !company) throw new Error("Name, email, and company are required");

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await setSessionUserId(existing.id);
    redirect("/employer/dashboard");
  }

  const user = await prisma.user.create({
    data: {
      role: "EMPLOYER",
      name,
      email,
      employer: {
        create: {
          company,
          industry: industry || null,
        },
      },
    },
  });

  await setSessionUserId(user.id);
  redirect("/employer/dashboard");
}
