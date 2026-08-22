import { cache } from "react";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "./db";
import { firebaseAdminConfigured, getFirebaseAdminAuth } from "./firebase-admin";

const COOKIE_NAME = "fursa_uid";

/**
 * The session cookie used to be the bare user id, unsigned. Anyone who could
 * name an id could mint a session as that account by setting one header —
 * including for an account created through the real Firebase sign-up flow,
 * since `getCurrentUser` falls back to this cookie for every user.
 *
 * The value is now `<userId>.<hmac>` and is rejected unless the signature
 * verifies, so only this server can issue one. Verification fails closed: a
 * legacy unsigned cookie is treated as no session, which logs those browsers
 * out once rather than continuing to honour a forgeable credential.
 *
 * The key is taken from SESSION_SECRET when present. It falls back to the
 * Worker credential that production already sets, so signing switches on
 * without a new environment variable having to be configured first — a
 * deployment that lost its sessions on rollout would be a worse outcome than
 * the reuse. The last resort is a fixed development key, which warns.
 */
function sessionKey(): string {
  const configured = process.env.SESSION_SECRET || process.env.EVIDENCE_AI_SECRET || process.env.ASSISTANT_AI_SECRET;
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") {
    console.warn(
      "No SESSION_SECRET or Worker secret is set; session cookies are signed with a well-known development key.",
    );
  }
  return "fursah-development-session-key";
}

function signature(userId: string): string {
  return createHmac("sha256", sessionKey()).update(userId).digest("base64url");
}

function signSession(userId: string): string {
  return `${userId}.${signature(userId)}`;
}

/**
 * Signed cookie value for a user id, for callers that write the cookie onto a
 * NextResponse themselves rather than through `setSessionUserId`.
 */
export function signSessionValue(userId: string): string {
  return signSession(userId);
}

/** Returns the user id only when the signature verifies. */
function readSession(value: string | undefined): string | null {
  if (!value) return null;
  const separator = value.lastIndexOf(".");
  if (separator <= 0) return null;

  const userId = value.slice(0, separator);
  const presented = value.slice(separator + 1);
  const expected = signature(userId);

  const presentedBytes = Buffer.from(presented);
  const expectedBytes = Buffer.from(expected);
  if (presentedBytes.length !== expectedBytes.length) return null;
  if (!timingSafeEqual(presentedBytes, expectedBytes)) return null;

  return userId;
}

export async function getSessionUserId(): Promise<string | null> {
  const store = await cookies();
  return readSession(store.get(COOKIE_NAME)?.value);
}

export async function setSessionUserId(userId: string) {
  const store = await cookies();
  store.set(COOKIE_NAME, signSession(userId), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    // `secure` in production only, so local http development still works.
    secure: process.env.NODE_ENV === "production",
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
  const uid = readSession(store.get(COOKIE_NAME)?.value);
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
