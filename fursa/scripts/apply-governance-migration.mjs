import { readFile } from "node:fs/promises";
import { createClient } from "@libsql/client";

const url = process.env.DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !url.startsWith("libsql:")) throw new Error("A production libsql DATABASE_URL is required");
if (!authToken) throw new Error("TURSO_AUTH_TOKEN is required");

const client = createClient({ url, authToken });
const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table'");
if (tables.rows.some((row) => row.name === "RoadmapItem")) {
  console.log("Production schema is already current.");
  client.close();
  process.exit(0);
}

const migration = await readFile(
  new URL("../prisma/migrations/20260804183412_governance_and_adaptive_workflows/migration.sql", import.meta.url),
  "utf8",
);

await client.executeMultiple(migration);

const [roadmapCheck, jobCheck, jobSkillCheck] = await Promise.all([
  client.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='RoadmapItem'"),
  client.execute("PRAGMA table_info('Job')"),
  client.execute("PRAGMA table_info('JobSkill')"),
]);
if (roadmapCheck.rows.length === 0) throw new Error("RoadmapItem migration verification failed");
if (!jobCheck.rows.some((row) => row.name === "blindReview")) throw new Error("Job migration verification failed");
if (!jobSkillCheck.rows.some((row) => row.name === "requirementType")) throw new Error("JobSkill migration verification failed");

console.log("Governance migration applied and verified.");
client.close();
