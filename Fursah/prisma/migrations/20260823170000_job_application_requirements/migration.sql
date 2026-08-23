-- Two hiring preferences that the role form has always shown and never saved.
--
-- `portfolioRequired` is enforced: when set, the student is told before they
-- apply that a CV or portfolio must be attached, the upload control is marked
-- required, and the application is refused server-side without one.
--
-- `recentGraduatesAccepted` is a statement the employer makes to candidates.
-- It is shown on the role and never reaches candidate ranking, which uses
-- structured skill, certification and experience evidence only. Career stage
-- is close enough to a personal characteristic that scoring it would break
-- that promise.
ALTER TABLE "Job" ADD COLUMN "portfolioRequired" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Job" ADD COLUMN "recentGraduatesAccepted" BOOLEAN NOT NULL DEFAULT false;
