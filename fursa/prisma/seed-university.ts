import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "workforce@ksu.edu.sa" },
    update: { role: "UNIVERSITY", name: "Dr. Amal Al-Saud" },
    create: { role: "UNIVERSITY", name: "Dr. Amal Al-Saud", email: "workforce@ksu.edu.sa" },
  });

  await prisma.university.upsert({
    where: { userId: user.id },
    update: { institution: "King Saud University", region: "Riyadh" },
    create: { userId: user.id, institution: "King Saud University", region: "Riyadh" },
  });

  console.log("University demo account is ready: workforce@ksu.edu.sa");
}

main().finally(() => prisma.$disconnect());
