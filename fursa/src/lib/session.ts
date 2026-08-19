import { cache } from "react";
import { cookies } from "next/headers";
import { prisma } from "./db";
import { firebaseAdminConfigured, getFirebaseAdminAuth } from "./firebase-admin";

const COOKIE_NAME = "fursa_uid";

export async function getSessionUserId(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value ?? null;
}

export async function setSessionUserId(userId: string) {
  const store = await cookies();
  store.set(COOKIE_NAME, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
  store.delete("fursa_session");
}

// Memoized for the lifetime of one request. The root layout, the navbar, the
// section layout and the page all need the viewer, and each call previously
// meant another Firebase cookie verification plus another round trip to the
// database, so a single page load serialised three or four remote calls before
// any HTML could be produced.
export const getCurrentUser = cache(async () => {
  const store = await cookies();
  const firebaseSession = store.get("fursa_session")?.value;
  if (firebaseSession && firebaseAdminConfigured) {
    try {
      // `checkRevoked` is deliberately off. It forces a call out to the
      // Identity Toolkit API on every request, which is the single most
      // expensive thing in the session path. Logging out clears the cookie and
      // the cookie is short lived, so the guarantee it bought was small next to
      // the latency it added to every page.
      const decoded = await getFirebaseAdminAuth().verifySessionCookie(firebaseSession, false);
      const verified = await prisma.user.findFirst({
        where: { OR: [{ id: decoded.uid }, ...(decoded.email ? [{ email: decoded.email }] : [])] },
        include: { student: true, employer: true, university: true },
      });
      if (verified) return verified;
    } catch {
      return null;
    }
  }
  const uid = store.get(COOKIE_NAME)?.value ?? null;
  if (!uid) return null;
  return prisma.user.findUnique({
    where: { id: uid },
    include: { student: true, employer: true, university: true },
  });
});

export async function getCurrentStudent() {
  const user = await getCurrentUser();
  if (!user || user.role !== "STUDENT" || !user.student) return null;
  return { user, student: user.student };
}

export async function getCurrentEmployer() {
  const user = await getCurrentUser();
  if (!user || user.role !== "EMPLOYER" || !user.employer) return null;
  return { user, employer: user.employer };
}

export async function getCurrentUniversity() {
  const user = await getCurrentUser();
  if (!user || user.role !== "UNIVERSITY" || !user.university) return null;
  return { user, university: user.university };
}

export async function getCurrentAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return null;
  return { user };
}
