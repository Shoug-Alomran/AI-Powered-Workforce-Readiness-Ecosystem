-- Automated triage for support tickets. Every column is nullable: tickets
-- raised before triage existed keep rendering, and a triage failure must never
-- block a person from filing a ticket.
ALTER TABLE "SupportTicket" ADD COLUMN "severity" TEXT;
ALTER TABLE "SupportTicket" ADD COLUMN "urgency" TEXT;
ALTER TABLE "SupportTicket" ADD COLUMN "triageScore" INTEGER;
ALTER TABLE "SupportTicket" ADD COLUMN "triageReason" TEXT;
ALTER TABLE "SupportTicket" ADD COLUMN "triageVersion" TEXT;
ALTER TABLE "SupportTicket" ADD COLUMN "triagedAt" DATETIME;
ALTER TABLE "SupportTicket" ADD COLUMN "resolvedAt" DATETIME;

CREATE INDEX "SupportTicket_status_createdAt_idx" ON "SupportTicket"("status", "createdAt");
CREATE INDEX "SupportTicket_category_status_idx" ON "SupportTicket"("category", "status");
