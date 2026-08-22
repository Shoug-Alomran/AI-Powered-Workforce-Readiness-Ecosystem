-- The role form asked for an education level and languages through controls
-- that submitted nothing: no `name` attribute, no reader, no column. An
-- employer answered them and the answers vanished on submit.
--
-- Both are legitimate, employer-authored requirements, so they are stored and
-- shown on the role. Neither takes part in candidate ranking: the ranking uses
-- structured skill, certification and experience evidence only, and a language
-- requirement in particular is close enough to a personal characteristic that
-- feeding it into a score would be the wrong default. The interface says so.
ALTER TABLE "Job" ADD COLUMN "educationLevel" TEXT;
ALTER TABLE "Job" ADD COLUMN "languages" TEXT;
