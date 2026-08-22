import { PrismaClient } from "@/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { createFirestorePrisma } from "./firestore-prisma";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const relationalPrisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = relationalPrisma;

// Firestore is opt-in until the compatibility verification suite passes. This
// keeps Turso available as an immediate rollback during the staged cutover.
export const prisma = process.env.DATA_BACKEND === "firestore"
  ? createFirestorePrisma(relationalPrisma)
  : relationalPrisma;
