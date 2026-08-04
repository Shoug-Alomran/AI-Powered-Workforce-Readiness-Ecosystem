import { NextResponse } from "next/server";
import { getFirebaseAdminAuth, getFirebaseAdminDb } from "@/lib/firebase-admin";
import type { FirebaseRole, FirebaseUserProfile } from "@/lib/firebase-types";
import { prisma } from "@/lib/db";

const SESSION_COOKIE = "fursa_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 5;
const signupRoles = new Set<FirebaseRole>(["STUDENT", "EMPLOYER", "UNIVERSITY"]);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const idToken = String(body.idToken ?? "");
    const requestedRole = String(body.role ?? "") as FirebaseRole;
    if (!idToken) return NextResponse.json({ error: "Missing Firebase ID token" }, { status: 400 });

    const auth = getFirebaseAdminAuth();
    const decoded = await auth.verifyIdToken(idToken);
    if (Date.now() / 1000 - decoded.auth_time > 5 * 60) {
      return NextResponse.json({ error: "Please sign in again" }, { status: 401 });
    }

    const db = getFirebaseAdminDb();
    const ref = db.collection("users").doc(decoded.uid);
    const existing = await ref.get();
    const existingData = existing.data() as FirebaseUserProfile | undefined;
    const isAdmin = decoded.admin === true && existingData?.role === "ADMIN";
    const role: FirebaseRole = isAdmin ? "ADMIN" : existingData?.role ?? requestedRole;
    if (role !== "ADMIN" && !signupRoles.has(role)) return NextResponse.json({ error: "A valid account role is required" }, { status: 400 });

    const now = new Date().toISOString();
    const requestedName = String(body.name ?? "").trim();
    const profile: FirebaseUserProfile = {
      uid: decoded.uid,
      name: requestedName || String(existingData?.name ?? decoded.name ?? "").trim(),
      email: String(decoded.email ?? existingData?.email ?? "").toLowerCase(),
      role,
      createdAt: existingData?.createdAt ?? now,
      updatedAt: now,
      ...(role === "STUDENT" ? { targetCareer: String(body.targetCareer ?? existingData?.targetCareer ?? "software-engineer"), university: String(body.university ?? existingData?.university ?? "") } : {}),
      ...(role === "EMPLOYER" ? { company: String(body.company ?? existingData?.company ?? ""), industry: String(body.industry ?? existingData?.industry ?? "") } : {}),
      ...(role === "UNIVERSITY" ? { institution: String(body.institution ?? existingData?.institution ?? ""), region: String(body.region ?? existingData?.region ?? "") } : {}),
    };
    if (!profile.name || !profile.email) return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    await ref.set(profile, { merge: true });

    // Temporary local compatibility mirror while the remaining prototype datasets
    // are migrated from SQLite to Firestore collections.
    const local = await prisma.user.findUnique({ where: { email: profile.email } });
    if (!local) {
      await prisma.user.create({ data: {
        id: decoded.uid, role,
        name: profile.name, email: profile.email,
        ...(role === "STUDENT" ? { student: { create: { targetCareer: profile.targetCareer ?? "software-engineer", university: profile.university || null } } } : {}),
        ...(role === "EMPLOYER" ? { employer: { create: { company: profile.company || "Independent Employer", industry: profile.industry || null } } } : {}),
        ...(role === "UNIVERSITY" ? { university: { create: { institution: profile.institution || "University", region: profile.region || null } } } : {}),
      } });
    }

    const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn: MAX_AGE_SECONDS * 1000 });
    const response = NextResponse.json({ role });
    response.cookies.set(SESSION_COOKIE, sessionCookie, {
      maxAge: MAX_AGE_SECONDS, httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/",
    });
    response.cookies.set("fursa_uid", local?.id ?? decoded.uid, { maxAge: MAX_AGE_SECONDS, httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" });
    return response;
  } catch (error) {
    console.error("Firebase session creation failed", error);
    return NextResponse.json({ error: "Unable to create the account session" }, { status: 401 });
  }
}
