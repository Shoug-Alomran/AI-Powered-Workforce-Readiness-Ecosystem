"use server";

import { prisma } from "@/lib/db";
import { setSessionUserId } from "@/lib/session";
import { studentLandingPath } from "@/lib/studentOnboarding";
import { hashPassword, localAuthEnabled, passwordProblem, verifyPassword } from "@/lib/localAuth";
import type { FirebaseRole } from "@/lib/firebase-types";

export type LocalAuthResult = { error: string } | { redirectTo: string };

const SIGNUP_ROLES = new Set<FirebaseRole>(["STUDENT", "EMPLOYER", "UNIVERSITY"]);

function field(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

async function landingPath(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { student: true } });
  if (!user) return "/";
  if (user.role === "STUDENT") {
    return user.student ? await studentLandingPath(user.student.id) : "/student/profile?setup=passport";
  }
  if (user.role === "EMPLOYER") return "/employer/dashboard";
  if (user.role === "ADMIN") return "/admin/dashboard";
  return "/university/dashboard";
}

/**
 * Create an account with an email and password held by this server.
 *
 * Only reachable while Firebase is unconfigured — see `localAuthEnabled`. The
 * profile fields mirror the Firebase sign-up path so both routes produce the
 * same User plus role-profile shape.
 */
export async function localSignUp(formData: FormData): Promise<LocalAuthResult> {
  if (!localAuthEnabled()) return { error: "Local sign-up is disabled because Firebase authentication is configured." };

  const name = field(formData, "name");
  const email = field(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = field(formData, "role") as FirebaseRole;

  if (!name || !email) return { error: "Your name and email are required." };
  if (!SIGNUP_ROLES.has(role)) return { error: "Choose an account type." };
  const weak = passwordProblem(password);
  if (weak) return { error: weak };

  // Profile text is rendered publicly on the Skills Passport, so a value that
  // autofill dropped in from the password field is discarded rather than saved.
  const profileField = (key: string) => {
    const value = field(formData, key);
    return value && value !== password ? value : "";
  };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "An account already exists for this email. Sign in instead." };

  const passwordHash = await hashPassword(password);
  const company = profileField("company");
  const institution = profileField("institution");

  if (role === "EMPLOYER" && !company) return { error: "Your company name is required." };
  if (role === "UNIVERSITY" && !institution) return { error: "Your institution name is required." };

  const user = await prisma.user.create({
    data: {
      role,
      name,
      email,
      passwordHash,
      ...(role === "STUDENT"
        ? { student: { create: { targetCareer: "undecided", university: profileField("university") || null } } }
        : {}),
      ...(role === "EMPLOYER"
        ? { employer: { create: { company, industry: profileField("industry") || null } } }
        : {}),
      ...(role === "UNIVERSITY"
        ? { university: { create: { institution, region: profileField("region") || null } } }
        : {}),
    },
  });

  await setSessionUserId(user.id);
  return { redirectTo: await landingPath(user.id) };
}

/** Sign in against a locally stored credential. */
export async function localSignIn(formData: FormData): Promise<LocalAuthResult> {
  if (!localAuthEnabled()) return { error: "Local sign-in is disabled because Firebase authentication is configured." };

  const email = field(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };

  const user = await prisma.user.findUnique({ where: { email } });
  // One message for "no such account", "no local password on this account" and
  // "wrong password", so the form cannot be used to enumerate addresses.
  const failure = { error: "That email and password do not match an account." };
  if (!user || !user.active) return failure;
  if (!(await verifyPassword(password, user.passwordHash))) return failure;

  await setSessionUserId(user.id);
  return { redirectTo: await landingPath(user.id) };
}
