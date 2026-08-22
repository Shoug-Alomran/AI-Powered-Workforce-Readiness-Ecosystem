-- A scenario decision already recorded its note and timestamp but not who made
-- it, unlike every other reviewed record in this schema. Without it the
-- governance page can show that a control was approved but not by whom.
ALTER TABLE "GovernanceScenario"
ADD COLUMN "reviewedBy" TEXT;
