import { readFile } from "node:fs/promises";
import { createClient } from "@libsql/client";

const url = process.env.DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

// This migration only applies to the hosted libsql (Turso) database. Local and
// CI builds run against a file-backed SQLite database whose schema comes from
// `prisma migrate deploy`, so there is nothing to do and the build must not
// fail here.
if (!url || !url.startsWith("libsql:")) {
  console.log(
    "Skipping trust/support migration: DATABASE_URL is not a libsql URL."
  );
  process.exit(0);
}

if (!authToken) {
  throw new Error(
    "TURSO_AUTH_TOKEN is required"
  );
}

const client = createClient({
  url,
  authToken,
});

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


  console.log(
    "Production migrations applied and verified successfully."
  );

} finally {
  client.close();
}