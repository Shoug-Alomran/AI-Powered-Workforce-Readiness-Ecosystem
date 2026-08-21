CREATE TABLE "EvidenceDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerUserId" TEXT NOT NULL,
    "contextType" TEXT NOT NULL,
    "contextId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "aiStatus" TEXT NOT NULL DEFAULT 'PASSED',
    "aiNote" TEXT,
    "reviewStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewNote" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EvidenceDocument_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "EvidenceDocument_storageKey_key" ON "EvidenceDocument"("storageKey");
CREATE INDEX "EvidenceDocument_contextType_contextId_idx" ON "EvidenceDocument"("contextType", "contextId");
CREATE INDEX "EvidenceDocument_reviewStatus_createdAt_idx" ON "EvidenceDocument"("reviewStatus", "createdAt");
CREATE INDEX "EvidenceDocument_ownerUserId_createdAt_idx" ON "EvidenceDocument"("ownerUserId", "createdAt");
