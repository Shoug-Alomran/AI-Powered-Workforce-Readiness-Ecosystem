-- The role form has always collected department, employment type, location and
-- work arrangement, but there was nowhere to put them: `createJob` read only
-- the fields below this comment's columns, so an employer's answers were
-- discarded on submit and no portal could ever show them. Additive and
-- nullable, so existing roles keep working and simply carry no detail.
ALTER TABLE "Job" ADD COLUMN "department" TEXT;
ALTER TABLE "Job" ADD COLUMN "employmentType" TEXT;
ALTER TABLE "Job" ADD COLUMN "location" TEXT;
ALTER TABLE "Job" ADD COLUMN "arrangement" TEXT;
