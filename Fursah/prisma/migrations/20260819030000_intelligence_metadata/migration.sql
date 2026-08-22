ALTER TABLE "RoadmapItem"
ADD COLUMN "careerTrackId" TEXT;

ALTER TABLE "RoadmapItem"
ADD COLUMN "skillId" TEXT;

ALTER TABLE "RoadmapItem"
ADD COLUMN "offeringId" TEXT;

ALTER TABLE "RoadmapItem"
ADD COLUMN "certificationId" TEXT;

ALTER TABLE "RoadmapItem"
ADD COLUMN "recommendationReason" TEXT;

ALTER TABLE "RoadmapItem"
ADD COLUMN "recommendationScore" REAL;

ALTER TABLE "RoadmapItem"
ADD COLUMN "generatedAt" DATETIME;

ALTER TABLE "RoadmapItem"
ADD COLUMN "dismissedAt" DATETIME;

CREATE INDEX "RoadmapItem_studentId_careerTrackId_idx"
ON "RoadmapItem"("studentId", "careerTrackId");

CREATE INDEX "RoadmapItem_studentId_skillId_idx"
ON "RoadmapItem"("studentId", "skillId");

CREATE INDEX "RoadmapItem_studentId_offeringId_idx"
ON "RoadmapItem"("studentId", "offeringId");