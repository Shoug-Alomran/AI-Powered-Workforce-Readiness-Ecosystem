import { readFile } from "node:fs/promises";
import { createClient } from "@libsql/client";

const url = process.env.DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

/*
 * Runs against whatever DATABASE_URL points at, hosted or file-backed.
 *
 * It used to return early for anything that was not a `libsql:` URL, on the
 * reasoning that file-backed databases get their schema from
 * `prisma migrate deploy`. That reasoning is sound and the consequence was not:
 * it meant no local run and no CI run ever executed this file, so the only
 * environment that exercised it was production, on a deploy. A column added to
 * the schema could therefore reach production having never once been through
 * the runner that is supposed to add it.
 *
 * Every step below is guarded on the current shape of the table, so running it
 * against an already-migrated database does nothing at all. Being a no-op is
 * exactly what makes it safe to put on the default build path, which is where
 * it now lives: Vercel invokes `npm run build`, not `build:production`, so the
 * migration step was never reached on a deploy either.
 */
if (!url) {
  console.log(
    "Skipping schema migration: DATABASE_URL is not set."
  );
  process.exit(0);
}

const isHosted = url.startsWith("libsql:");

if (isHosted && !authToken) {
  throw new Error(
    "TURSO_AUTH_TOKEN is required for a libsql DATABASE_URL"
  );
}

const client = createClient(
  isHosted ? { url, authToken } : { url }
);

/*
 * A database with no tables yet is not a database this script can migrate: the
 * schema is created by `prisma migrate deploy`, which has not run. Adding
 * columns to a table that does not exist would fail the build for a state that
 * is simply "not ready yet", so it stops instead.
 */
const bootstrapped = await client.execute(
  "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'Job'"
);

if (bootstrapped.rows.length === 0) {
  console.log(
    "Skipping schema migration: no schema present yet (run `prisma migrate deploy` first)."
  );
  client.close();
  process.exit(0);
}

console.log(
  `Checking schema against ${isHosted ? "the hosted database" : url}...`
);

try {
  // =========================================================
  // TRUST, SUPPORT, AND SHARING MIGRATION
  // =========================================================

  const experienceColumns =
    await client.execute(
      "PRAGMA table_info('Experience')"
    );

  const hasExperienceEvidenceUrl =
    experienceColumns.rows.some(
      (row) => row.name === "evidenceUrl"
    );

  if (!hasExperienceEvidenceUrl) {
    console.log(
      "Applying trust/support/sharing migration..."
    );

    const migration =
      await readFile(
        new URL(
          "../prisma/migrations/20260804194821_trust_support_and_sharing/migration.sql",
          import.meta.url
        ),
        "utf8"
      );

    await client.executeMultiple(
      migration
    );

    console.log(
      "Trust/support/sharing migration applied."
    );
  }


  // =========================================================
  // PRIVATE EVIDENCE DOCUMENT MIGRATION
  // =========================================================

  const documentColumns =
    await client.execute(
      "PRAGMA table_info('EvidenceDocument')"
    );

  const hasEvidenceDocumentTable =
    documentColumns.rows.some(
      (row) => row.name === "storageKey"
    );

  if (!hasEvidenceDocumentTable) {
    console.log(
      "Applying private evidence document migration..."
    );

    const documentMigration =
      await readFile(
        new URL(
          "../prisma/migrations/20260814190000_private_evidence_documents/migration.sql",
          import.meta.url
        ),
        "utf8"
      );

    await client.executeMultiple(
      documentMigration
    );

    console.log(
      "Private evidence document migration applied."
    );
  }


  // =========================================================
  // AI EVIDENCE ANALYSIS MIGRATION
  // =========================================================

  const aiDocumentColumns =
    await client.execute(
      "PRAGMA table_info('EvidenceDocument')"
    );

  const hasAiAnalysis =
    aiDocumentColumns.rows.some(
      (row) => row.name === "aiAnalysis"
    );

  const hasAiAnalyzedAt =
    aiDocumentColumns.rows.some(
      (row) => row.name === "aiAnalyzedAt"
    );

  if (
    !hasAiAnalysis ||
    !hasAiAnalyzedAt
  ) {
    console.log(
      "Applying evidence AI analysis migration..."
    );

    const aiMigration =
      await readFile(
        new URL(
          "../prisma/migrations/20260819034500_evidence_ai_analysis/migration.sql",
          import.meta.url
        ),
        "utf8"
      );

    await client.executeMultiple(
      aiMigration
    );

    console.log(
      "Evidence AI analysis migration applied."
    );
  }


  // =========================================================
  // ROADMAP INTELLIGENCE METADATA MIGRATION
  // =========================================================
  // Adds the columns the intelligence engine writes when it generates a
  // roadmap recommendation (career direction, skill/offering/certification the
  // recommendation addresses, its explanation, score, generation time, and an
  // explicit dismissal marker). Additive only: existing roadmap rows keep
  // their values and simply carry NULL metadata until the next sync.

  const roadmapColumns =
    await client.execute(
      "PRAGMA table_info('RoadmapItem')"
    );

  const hasRecommendationReason =
    roadmapColumns.rows.some(
      (row) => row.name === "recommendationReason"
    );

  const hasDismissedAt =
    roadmapColumns.rows.some(
      (row) => row.name === "dismissedAt"
    );

  if (
    !hasRecommendationReason ||
    !hasDismissedAt
  ) {
    console.log(
      "Applying roadmap intelligence metadata migration..."
    );

    const intelligenceMigration =
      await readFile(
        new URL(
          "../prisma/migrations/20260819030000_intelligence_metadata/migration.sql",
          import.meta.url
        ),
        "utf8"
      );

    await client.executeMultiple(
      intelligenceMigration
    );

    console.log(
      "Roadmap intelligence metadata migration applied."
    );
  }


  // =========================================================
  // VERIFY DATABASE STATE
  // =========================================================

  const [
    experienceCheck,
    projectCheck,
    feedbackCheck,
    documentCheck,
  ] = await Promise.all([
    client.execute(
      "PRAGMA table_info('Experience')"
    ),

    client.execute(
      "PRAGMA table_info('Project')"
    ),

    client.execute(
      "PRAGMA table_info('Feedback')"
    ),

    client.execute(
      "PRAGMA table_info('EvidenceDocument')"
    ),
  ]);


  // Experience verification
  if (
    !experienceCheck.rows.some(
      (row) =>
        row.name === "evidenceUrl"
    )
  ) {
    throw new Error(
      "Experience migration verification failed"
    );
  }


  // Project verification
  if (
    !projectCheck.rows.some(
      (row) =>
        row.name === "evidenceUrl"
    )
  ) {
    throw new Error(
      "Project migration verification failed"
    );
  }


  // Feedback verification
  if (
    !feedbackCheck.rows.some(
      (row) =>
        row.name === "checkpointDays"
    )
  ) {
    throw new Error(
      "Feedback migration verification failed"
    );
  }


  // EvidenceDocument verification
  if (
    !documentCheck.rows.some(
      (row) =>
        row.name === "storageKey"
    )
  ) {
    throw new Error(
      "Private document migration verification failed"
    );
  }


  // AI analysis verification
  if (
    !documentCheck.rows.some(
      (row) =>
        row.name === "aiAnalysis"
    )
  ) {
    throw new Error(
      "Evidence AI migration verification failed: aiAnalysis column missing"
    );
  }

  if (
    !documentCheck.rows.some(
      (row) =>
        row.name === "aiAnalyzedAt"
    )
  ) {
    throw new Error(
      "Evidence AI migration verification failed: aiAnalyzedAt column missing"
    );
  }


  // Roadmap intelligence verification
  const roadmapCheck =
    await client.execute(
      "PRAGMA table_info('RoadmapItem')"
    );

  for (const column of [
    "careerTrackId",
    "skillId",
    "offeringId",
    "certificationId",
    "recommendationReason",
    "recommendationScore",
    "generatedAt",
    "dismissedAt",
  ]) {
    if (
      !roadmapCheck.rows.some(
        (row) => row.name === column
      )
    ) {
      throw new Error(
        `Roadmap intelligence migration verification failed: ${column} column missing`
      );
    }
  }



  // =========================================================
  // JOB POSTING DETAIL MIGRATION
  // =========================================================
  // The role form has always collected department, employment type, location,
  // work arrangement, education level and languages. None of them had a column,
  // so every answer was discarded on submit. All additive and nullable, so
  // existing roles keep working and simply carry no detail.
  //
  // Each column is checked and added on its own rather than the whole set being
  // gated behind one sentinel column. A partially-applied table is a real state
  // to be in - an interrupted run, or a column added to the file later - and an
  // all-or-nothing guard handles it in the worst possible way: it either skips
  // the columns that are genuinely missing, or fails on "duplicate column name"
  // for the ones already there. Per-column is idempotent from any starting
  // state, which is the only property that matters for a migration that runs on
  // every deploy.

  const jobDetailColumns = [
    ["department", "TEXT"],
    ["employmentType", "TEXT"],
    ["location", "TEXT"],
    ["arrangement", "TEXT"],
    ["educationLevel", "TEXT"],
    ["languages", "TEXT"],
  ];

  const existingJobColumns = new Set(
    (
      await client.execute(
        "PRAGMA table_info('Job')"
      )
    ).rows.map((row) => row.name)
  );

  const addedJobColumns = [];

  for (const [column, type] of jobDetailColumns) {
    if (existingJobColumns.has(column)) {
      continue;
    }

    // Identifiers come from the fixed list above, never from input.
    await client.execute(
      `ALTER TABLE "Job" ADD COLUMN "${column}" ${type}`
    );

    addedJobColumns.push(column);
  }

  if (addedJobColumns.length > 0) {
    console.log(
      `Job posting detail migration applied: added ${addedJobColumns.join(", ")}.`
    );
  }

  // Verification: every column the application writes must now exist, so a
  // deploy fails here with a readable message rather than part way through
  // prerendering with "no such column: main.Job.department".
  const jobCheck = await client.execute(
    "PRAGMA table_info('Job')"
  );

  for (const [column] of jobDetailColumns) {
    if (
      !jobCheck.rows.some(
        (row) => row.name === column
      )
    ) {
      throw new Error(
        `Job posting detail migration verification failed: ${column} column missing`
      );
    }
  }


  console.log(
    "Production migrations applied and verified successfully."
  );

} finally {
  client.close();
}