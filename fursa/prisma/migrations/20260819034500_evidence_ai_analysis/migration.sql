ALTER TABLE "EvidenceDocument"
ADD COLUMN "aiAnalysis" JSONB;

ALTER TABLE "EvidenceDocument"
ADD COLUMN "aiAnalyzedAt" NUMERIC;

CREATE INDEX "EvidenceDocument_aiStatus_createdAt_idx"
ON "EvidenceDocument"("aiStatus", "createdAt");

UPDATE "EvidenceDocument"
SET "aiStatus" = 'PENDING'
WHERE "aiStatus" IN ('PASSED', 'FLAGGED');