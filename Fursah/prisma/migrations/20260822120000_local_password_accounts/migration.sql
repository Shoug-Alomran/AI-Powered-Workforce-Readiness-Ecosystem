-- Local email + password accounts. Null for Firebase-backed and demo accounts.
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;
