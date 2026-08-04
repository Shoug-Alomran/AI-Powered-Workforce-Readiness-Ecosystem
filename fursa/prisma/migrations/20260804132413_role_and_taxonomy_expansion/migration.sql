-- AlterTable
ALTER TABLE "Application" ADD COLUMN "note" TEXT;

-- CreateTable
CREATE TABLE "University" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "region" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "University_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CareerTrack" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "recommendedExperienceMonths" INTEGER NOT NULL DEFAULT 6,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CareerTrackSkill" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "careerTrackId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 2,
    CONSTRAINT "CareerTrackSkill_careerTrackId_fkey" FOREIGN KEY ("careerTrackId") REFERENCES "CareerTrack" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CareerTrackSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CareerTrackCertification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "careerTrackId" TEXT NOT NULL,
    "certificationId" TEXT NOT NULL,
    CONSTRAINT "CareerTrackCertification_careerTrackId_fkey" FOREIGN KEY ("careerTrackId") REFERENCES "CareerTrack" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CareerTrackCertification_certificationId_fkey" FOREIGN KEY ("certificationId") REFERENCES "Certification" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Employer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "industry" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewNote" TEXT,
    "reviewedAt" DATETIME,
    "reviewedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Employer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Employer" ("company", "createdAt", "id", "industry", "userId") SELECT "company", "createdAt", "id", "industry", "userId" FROM "Employer";
DROP TABLE "Employer";
ALTER TABLE "new_Employer" RENAME TO "Employer";
CREATE UNIQUE INDEX "Employer_userId_key" ON "Employer"("userId");
CREATE TABLE "new_StudentCertification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "certificationId" TEXT NOT NULL,
    "earnedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "evidencePath" TEXT,
    "evidenceName" TEXT,
    "evidenceType" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewNote" TEXT,
    "reviewedAt" DATETIME,
    "reviewedBy" TEXT,
    CONSTRAINT "StudentCertification_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StudentCertification_certificationId_fkey" FOREIGN KEY ("certificationId") REFERENCES "Certification" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_StudentCertification" ("certificationId", "earnedAt", "id", "studentId") SELECT "certificationId", "earnedAt", "id", "studentId" FROM "StudentCertification";
DROP TABLE "StudentCertification";
ALTER TABLE "new_StudentCertification" RENAME TO "StudentCertification";
CREATE UNIQUE INDEX "StudentCertification_studentId_certificationId_key" ON "StudentCertification"("studentId", "certificationId");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "role" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_User" ("createdAt", "email", "id", "name", "role") SELECT "createdAt", "email", "id", "name", "role" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "University_userId_key" ON "University"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CareerTrackSkill_careerTrackId_skillId_key" ON "CareerTrackSkill"("careerTrackId", "skillId");

-- CreateIndex
CREATE UNIQUE INDEX "CareerTrackCertification_careerTrackId_certificationId_key" ON "CareerTrackCertification"("careerTrackId", "certificationId");
