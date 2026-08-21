"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { setSessionUserId, clearSession } from "@/lib/session";
import { studentLandingPath } from "@/lib/studentOnboarding";
import { demoLoginEnabled, isDemoAccountEmail } from "@/lib/demoAccounts";

/**
 * Password-free shortcut into a prepared demo account.
 *
 * This is a server action, so the id is attacker-controlled: it cannot be
 * treated as "whatever the demo page rendered". Two guards therefore apply
 * before a session is issued — the shortcut has to be enabled, and the target
 * has to belong to the prepared demo set. Without the second guard the action
 * would open a session as any account on the platform, including one created
 * through the real sign-up flow, which is exactly the impersonation the
 * signed cookie is meant to prevent.
 */
export async function loginAsUser(userId: string) {
  if (!demoLoginEnabled()) throw new Error("Demo sign-in is disabled on this environment");

  const user = await prisma.user.findUnique({ where: { id: userId }, include: { student: true } });
  if (!user) throw new Error("User not found");
  if (!isDemoAccountEmail(user.email)) {
    throw new Error("This account is not a prepared demo account and cannot be opened without credentials");
  }
  if (!user.active) throw new Error("This demo account is disabled");

  await setSessionUserId(user.id);
  const destination =
    user.role === "STUDENT"
      ? user.student
        ? await studentLandingPath(user.student.id)
        : "/student/dashboard"
      : user.role === "EMPLOYER"
        ? "/employer/dashboard"
        : user.role === "ADMIN"
          ? "/admin/dashboard"
          : "/university/dashboard";
  redirect(destination);
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
  const targetCareer = "undecided";
  const university = String(formData.get("university") ?? "").trim();
  const degree = String(formData.get("degree") ?? "").trim();

  if (!name || !email) throw new Error("Name and email are required");

  const existing = await prisma.user.findUnique({ where: { email }, include: { student: true } });
  if (existing) {
    await setSessionUserId(existing.id);
    redirect(existing.student ? await studentLandingPath(existing.student.id) : "/student/dashboard");
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
  // A newly created student has no evidence yet, so this lands on the passport.
  redirect("/student/profile?setup=passport");
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
