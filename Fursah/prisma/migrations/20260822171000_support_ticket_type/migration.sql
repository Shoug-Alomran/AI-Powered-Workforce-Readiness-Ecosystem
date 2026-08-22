-- What the person wants, as distinct from what the ticket is about. Nullable
-- on purpose: existing rows never answered this question and must not be
-- back-filled with a guess presented as the person's own answer.
ALTER TABLE "SupportTicket" ADD COLUMN "type" TEXT;
