/**
 * Copies every scalar Prisma record to a same-named Firestore collection.
 *
 * Safety properties:
 * - dry-run unless --write is supplied;
 * - merge writes preserve Firebase-only fields already present on users;
 * - Turso is never modified;
 * - --verify compares source and destination counts after a copy.
 *
 * Usage:
 *   npm run db:migrate:firestore
 *   npm run db:migrate:firestore -- --write --verify
 */
import "server-only";

import { getFirebaseAdminDb } from "../src/lib/firebase-admin";
import { prisma } from "../src/lib/db";

type PrismaDelegate = {
  findMany(args?: { select?: Record<string, boolean> }): Promise<Array<Record<string, unknown>>>;
};

const WRITE = process.argv.includes("--write");
const VERIFY = process.argv.includes("--verify");

// Kept explicit so a newly-added model cannot silently begin exporting private
// data. Adding a Prisma model requires a conscious migration review here.
const MODELS = [
  "User", "EvidenceDocument", "University", "Student", "Skill",
  "StudentSkill", "Certification", "CareerTrack", "CareerTrackSkill",
  "CareerTrackCertification", "StudentCertification", "Experience", "Project",
  "Employer", "Job", "JobSkill", "JobCertification", "Application",
  "RoadmapItem", "ConsentRecord", "PassportShare", "DataRequest", "Appeal",
  "Notification", "AuditEvent", "GovernanceScenario", "MonitoringSnapshot",
  "SupportTicket", "CurriculumAction", "Feedback", "BookmarkedJob",
  "FavoriteCompany", "FavoriteCareerTrack", "Offering", "OfferingSkill",
] as const;

function delegateName(model: string) {
  return model[0].toLowerCase() + model.slice(1);
}

function collectionName(model: string) {
  return delegateName(model);
}

function normalize(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, normalize(item)]),
    );
  }
  return value;
}

function getDelegate(model: string): PrismaDelegate {
  const candidate = (prisma as unknown as Record<string, unknown>)[delegateName(model)];
  if (!candidate || typeof (candidate as PrismaDelegate).findMany !== "function") {
    throw new Error(`Missing Prisma delegate for ${model}`);
  }
  return candidate as PrismaDelegate;
}

async function sourceRows(model: string) {
  return getDelegate(model).findMany();
}

async function destinationCount(collection: string) {
  const snapshot = await getFirebaseAdminDb().collection(collection).count().get();
  return snapshot.data().count;
}

async function migrate() {
  const db = getFirebaseAdminDb();
  const sourceCounts = new Map<string, number>();

  console.log(WRITE ? "Firestore migration: WRITE mode" : "Firestore migration: DRY RUN");

  for (const model of MODELS) {
    const rows = await sourceRows(model);
    const collection = collectionName(model);
    sourceCounts.set(collection, rows.length);
    console.log(`${collection}: ${rows.length} source record(s)`);

    if (!WRITE || rows.length === 0) continue;

    const writer = db.bulkWriter();
    for (const row of rows) {
      const id = String(row.id ?? "");
      if (!id) throw new Error(`${model} contains a record without an id`);
      writer.set(db.collection(collection).doc(id), normalize(row) as Record<string, unknown>, { merge: true });
    }
    await writer.close();
  }

  if (VERIFY) {
    let mismatch = false;
    for (const [collection, source] of sourceCounts) {
      const destination = await destinationCount(collection);
      const ok = destination >= source;
      console.log(`${collection}: source=${source}, firestore=${destination} ${ok ? "OK" : "MISMATCH"}`);
      mismatch ||= !ok;
    }
    if (mismatch) throw new Error("Firestore verification failed");
  }

  if (!WRITE) console.log("Dry run complete. Re-run with --write only after reviewing the counts.");
}

migrate()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
