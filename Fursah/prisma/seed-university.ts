import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const ksuUser = await prisma.user.upsert({
    where: { email: "workforce@ksu.edu.sa" },
    update: { role: "UNIVERSITY", name: "Dr. Amal Al-Saud" },
    create: { role: "UNIVERSITY", name: "Dr. Amal Al-Saud", email: "workforce@ksu.edu.sa" },
  });

  await prisma.university.upsert({
    where: { userId: ksuUser.id },
    update: { institution: "King Saud University", region: "Riyadh" },
    create: { userId: ksuUser.id, institution: "King Saud University", region: "Riyadh" },
  });

  const psuUser = await prisma.user.upsert({
    where: { email: "workforce@psu.edu.sa" },
    update: { role: "UNIVERSITY", name: "Dr. Khalid Al-Fayez" },
    create: { role: "UNIVERSITY", name: "Dr. Khalid Al-Fayez", email: "workforce@psu.edu.sa" },
  });

  await prisma.university.upsert({
    where: { userId: psuUser.id },
    update: { institution: "Prince Sultan University", region: "Riyadh" },
    create: { userId: psuUser.id, institution: "Prince Sultan University", region: "Riyadh" },
  });

  console.log("University demo accounts are ready: workforce@ksu.edu.sa, workforce@psu.edu.sa");
}

main().finally(() => prisma.$disconnect());
