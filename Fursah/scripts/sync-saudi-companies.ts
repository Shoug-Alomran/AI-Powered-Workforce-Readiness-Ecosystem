import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { companyDirectoryEmail, SAUDI_COMPANY_DIRECTORY } from "../src/lib/saudiCompanies";

const prisma = new PrismaClient({
  adapter: new PrismaLibSql({
    url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
    authToken: process.env.TURSO_AUTH_TOKEN,
  }),
});

async function main() {
  for (const entry of SAUDI_COMPANY_DIRECTORY) {
    const email = companyDirectoryEmail(entry.company);
    const user = await prisma.user.upsert({
      where: { email },
      update: { name: `${entry.company} directory`, role: "EMPLOYER" },
      create: { email, name: `${entry.company} directory`, role: "EMPLOYER" },
    });
    await prisma.employer.upsert({
      where: { userId: user.id },
      update: { company: entry.company, industry: entry.industry, verificationStatus: "APPROVED" },
      create: { userId: user.id, company: entry.company, industry: entry.industry, verificationStatus: "APPROVED" },
    });
  }
  console.log(`Saudi company directory synchronized: ${SAUDI_COMPANY_DIRECTORY.length} companies.`);
}

main().finally(() => prisma.$disconnect());
