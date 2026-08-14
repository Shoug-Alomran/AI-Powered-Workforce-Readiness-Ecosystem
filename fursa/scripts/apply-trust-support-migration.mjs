import { readFile } from "node:fs/promises";
import { createClient } from "@libsql/client";

const url = process.env.DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !url.startsWith("libsql:")) throw new Error("A production libsql DATABASE_URL is required");
if (!authToken) throw new Error("TURSO_AUTH_TOKEN is required");

const client = createClient({ url, authToken });
const experienceColumns = await client.execute("PRAGMA table_info('Experience')");
if (!experienceColumns.rows.some((row) => row.name === "evidenceUrl")) {
  const migration = await readFile(
    new URL("../prisma/migrations/20260804194821_trust_support_and_sharing/migration.sql", import.meta.url),
    "utf8",
  );
  await client.executeMultiple(migration);
}

const documentColumns = await client.execute("PRAGMA table_info('EvidenceDocument')");
if (!documentColumns.rows.some((row) => row.name === "storageKey")) {
  const documentMigration = await readFile(
    new URL("../prisma/migrations/20260814190000_private_evidence_documents/migration.sql", import.meta.url),
    "utf8",
  );
  await client.executeMultiple(documentMigration);
}

const [experienceCheck, projectCheck, feedbackCheck, documentCheck] = await Promise.all([
  client.execute("PRAGMA table_info('Experience')"),
  client.execute("PRAGMA table_info('Project')"),
  client.execute("PRAGMA table_info('Feedback')"),
  client.execute("PRAGMA table_info('EvidenceDocument')"),
]);
if (!experienceCheck.rows.some((row) => row.name === "evidenceUrl")) throw new Error("Experience migration verification failed");
if (!projectCheck.rows.some((row) => row.name === "evidenceUrl")) throw new Error("Project migration verification failed");
if (!feedbackCheck.rows.some((row) => row.name === "checkpointDays")) throw new Error("Feedback migration verification failed");
if (!documentCheck.rows.some((row) => row.name === "storageKey")) throw new Error("Private document migration verification failed");

console.log("Production migration applied and verified.");
client.close();
