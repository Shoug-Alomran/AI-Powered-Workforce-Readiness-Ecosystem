import "dotenv/config";
import { getFirebaseAdminAuth, getFirebaseAdminDb } from "../src/lib/firebase-admin";
import { prisma } from "../src/lib/db";

async function main() {
  const email = String(process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD ?? "");
  const name = String(process.env.ADMIN_NAME ?? "Fursa Verification Admin").trim();
  if (!email) throw new Error("Set ADMIN_EMAIL");
  const auth = getFirebaseAdminAuth();
  let user;
  try { user = await auth.getUserByEmail(email); }
  catch {
    if (password.length < 12) throw new Error("For a new user, set an ADMIN_PASSWORD of at least 12 characters");
    user = await auth.createUser({ email, password, displayName: name, emailVerified: true });
  }
  await auth.setCustomUserClaims(user.uid, { admin: true });
  const now = new Date().toISOString();
  await getFirebaseAdminDb().collection("users").doc(user.uid).set({ uid: user.uid, name, email, role: "ADMIN", createdAt: now, updatedAt: now }, { merge: true });
  await prisma.user.upsert({ where: { email }, update: { role: "ADMIN", name }, create: { id: user.uid, role: "ADMIN", name, email } });
  console.log(`Admin account ready: ${email}`);
}

main().finally(() => prisma.$disconnect());
