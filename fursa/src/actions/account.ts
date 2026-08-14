"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { firebaseAdminConfigured, getFirebaseAdminAuth, getFirebaseAdminDb } from "@/lib/firebase-admin";

export type AccountUpdateState = { error?: string; success?: string };

function emailDomain(email: string) {
  return email.split("@")[1]?.toLowerCase() ?? "";
}

export async function updateAccountCredentials(_previous: AccountUpdateState, formData: FormData): Promise<AccountUpdateState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Your session has expired. Please sign in again." };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  if (!email || !email.includes("@")) return { error: "Enter a valid email address." };

  const protectedOrganizationAccount = user.role === "EMPLOYER" || user.role === "UNIVERSITY";
  const verifiedDomain = emailDomain(user.email);
  if (protectedOrganizationAccount && emailDomain(email) !== verifiedDomain) {
    return { error: `Use your verified organization domain: @${verifiedDomain}` };
  }
  if (password && password.length < 8) return { error: "Your new password must be at least 8 characters." };
  if (password !== confirmPassword) return { error: "The password confirmation does not match." };

  const duplicate = await prisma.user.findFirst({ where: { email, NOT: { id: user.id } } });
  if (duplicate) return { error: "That email address is already connected to another account." };

  let firebaseUid: string | null = null;
  if (firebaseAdminConfigured) {
    const auth = getFirebaseAdminAuth();
    try {
      firebaseUid = (await auth.getUser(user.id)).uid;
    } catch {
      try { firebaseUid = (await auth.getUserByEmail(user.email)).uid; } catch { firebaseUid = null; }
    }
    if (password && !firebaseUid) return { error: "Password changes are unavailable for prepared demo accounts. Sign in with a registered account to manage a password." };
    if (firebaseUid) {
      await auth.updateUser(firebaseUid, { ...(email !== user.email ? { email, emailVerified: false } : {}), ...(password ? { password } : {}) });
      await getFirebaseAdminDb().collection("users").doc(firebaseUid).set({ email, updatedAt: new Date().toISOString() }, { merge: true });
    }
  } else if (password) {
    return { error: "Password changes require the secure authentication service to be configured." };
  }

  if (email !== user.email) await prisma.user.update({ where: { id: user.id }, data: { email } });
  revalidatePath("/employer/profile");
  revalidatePath("/university/profile");
  return { success: password ? "Email and password updated." : "Email updated." };
}
