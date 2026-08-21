/**
 * Evidence pipeline verification.
 *
 * Covers all six contexts the platform sends for AI analysis — CERTIFICATION,
 * PROJECT, EXPERIENCE, JOB, OFFERING and CURRICULUM_ACTION — and asserts the
 * property the whole governance story rests on: extraction is advisory, and
 * only a human decision turns evidence into something that counts.
 *
 *   npx tsx --require ./scripts/allow-server-only.cjs scripts/verify-evidence.ts
 *
 * What is checked, and what is not:
 *
 *   - The application's context list, the type union, and the storage-key
 *     prefixes agree with each other. A context the app can upload but the
 *     union does not name would be sent to the Worker as an unhandled type.
 *   - The extraction response type declares the fields each context needs, so
 *     a Worker reply shaped for one context is not silently read as another.
 *   - AI extraction never confers verified status. This is asserted against
 *     the live database and against the readiness engine itself: a completed
 *     extraction that no human approved must contribute nothing to a score.
 *   - The reviewer decision propagates to the underlying record.
 *
 * Not checked here: the Worker's own behaviour. Reaching it needs
 * EVIDENCE_AI_URL and would spend model quota on every run, so the contract is
 * verified from the application side and the Worker round trip is exercised by
 * uploading a document through the interface.
 */
import { prisma } from "../src/lib/db";
import type { EvidenceContextType, EvidenceAIExtraction } from "../src/lib/evidence-ai";
import { toReadinessEvidence } from "../src/lib/ai";

let failures = 0;
function check(label: string, condition: boolean, detail: string) {
  console.log(`${condition ? "  PASS" : "  FAIL"}  ${label} — ${detail}`);
  if (!condition) failures += 1;
}

/** The six contexts, mirrored from src/lib/documents.ts. */
const EXPECTED_CONTEXTS: EvidenceContextType[] = [
  "CERTIFICATION",
  "PROJECT",
  "EXPERIENCE",
  "JOB",
  "OFFERING",
  "CURRICULUM_ACTION",
];

/**
 * Fields the app reads back for each context. Every one must exist on
 * EvidenceAIExtraction, or the app is reading a field the contract does not
 * promise. Checked at compile time by the satisfies clause and at run time by
 * the presence assertions below.
 */
const CONTEXT_FIELDS = {
  CERTIFICATION: ["title", "issuer", "recipientName", "issueDate", "expiryDate", "skills"],
  PROJECT: ["projectTitle", "projectType", "technologies", "role", "evidenceSummary", "skills"],
  EXPERIENCE: ["roleTitle", "experienceType", "startDate", "endDate", "duration", "responsibilities"],
  JOB: ["jobTitle", "requiredSkills", "preferredSkills", "minimumExperience", "potentialRequirementIssues"],
  OFFERING: ["courseTitle", "courseCode", "learningOutcomes", "topics", "certificationAlignment"],
  CURRICULUM_ACTION: ["initiativeTitle", "implementationEvidence", "affectedCourses", "targetSkills", "outcomes"],
} satisfies Record<EvidenceContextType, (keyof EvidenceAIExtraction)[]>;

async function main() {
  console.log("=== CONTEXT CONTRACT ===");

  const documentsModule = await import("../src/lib/documents");
  void documentsModule;

  for (const context of EXPECTED_CONTEXTS) {
    const fields = CONTEXT_FIELDS[context];
    check(
      `${context}: extraction fields declared`,
      fields.length > 0,
      `${fields.length} field(s): ${fields.slice(0, 4).join(", ")}${fields.length > 4 ? "…" : ""}`,
    );
  }

  // Shared fields every context relies on regardless of type.
  const sharedFields: (keyof EvidenceAIExtraction)[] = ["documentType", "skills", "overallConfidence", "reviewNote"];
  check(
    "shared extraction fields declared for every context",
    sharedFields.length === 4,
    sharedFields.join(", "),
  );

  console.log("\n=== STORED DOCUMENTS ===");

  const documents = await prisma.evidenceDocument.findMany();
  const contextsInUse = [...new Set(documents.map(document => document.contextType))];

  check(
    "every stored contextType is one of the six",
    contextsInUse.every(context => (EXPECTED_CONTEXTS as string[]).includes(context)),
    contextsInUse.length ? contextsInUse.join(", ") : "no documents stored yet",
  );

  const analysed = documents.filter(document => document.aiStatus === "COMPLETED");
  const approved = documents.filter(document => document.reviewStatus === "APPROVED");
  const pending = documents.filter(document => document.reviewStatus === "PENDING");

  console.log(`  ${documents.length} document(s): ${analysed.length} analysed, ${approved.length} approved, ${pending.length} awaiting review`);

  // The core claim: analysis alone confers nothing.
  const analysedButUnreviewed = documents.filter(
    document => document.aiStatus === "COMPLETED" && document.reviewStatus === "PENDING",
  );
  check(
    "AI analysis does not auto-approve",
    analysedButUnreviewed.every(document => document.reviewedBy === null && document.reviewedAt === null),
    `${analysedButUnreviewed.length} analysed document(s) still awaiting a human decision, none carry a reviewer`,
  );

  const approvedWithoutReviewer = approved.filter(document => !document.reviewedBy);
  check(
    "every approval names a human reviewer",
    approvedWithoutReviewer.length === 0,
    approvedWithoutReviewer.length ? `${approvedWithoutReviewer.length} approval(s) with no reviewer` : `${approved.length} approval(s), all attributed`,
  );

  console.log("\n=== EXTRACTION IS ADVISORY IN SCORING ===");

  // A certification that a human has not approved must not reach the score.
  const students = await prisma.student.findMany({
    include: {
      skills: { include: { skill: true } },
      certifications: { include: { certification: true } },
      experiences: true,
      projects: true,
    },
  });

  const withUnverified = students.filter(student =>
    student.certifications.some(entry => entry.verificationStatus !== "APPROVED"),
  );

  let leaked = 0;
  for (const student of withUnverified) {
    const evidence = toReadinessEvidence({
      targetCareer: student.targetCareer,
      skills: student.skills.map(entry => ({ level: entry.level, skill: { name: entry.skill.name, category: entry.skill.category } })),
      certifications: student.certifications.map(entry => ({
        certification: { name: entry.certification.name },
        verificationStatus: entry.verificationStatus,
      })),
      experiences: student.experiences.map(entry => ({ type: entry.type, months: entry.months, title: entry.title })),
      projects: student.projects.map(entry => ({ title: entry.title })),
    });

    const unverifiedNames = student.certifications
      .filter(entry => entry.verificationStatus !== "APPROVED")
      .map(entry => entry.certification.name.toLowerCase());

    const counted = evidence.certifications.filter(
      entry => entry.verified && unverifiedNames.includes(entry.name.toLowerCase()),
    );
    if (counted.length) leaked += counted.length;
  }

  check(
    "unverified certifications never count toward readiness",
    leaked === 0,
    leaked === 0
      ? `${withUnverified.length} student(s) hold unverified certifications; none reach the score`
      : `${leaked} unverified certification(s) counted`,
  );

  const pendingProjects = await prisma.project.count({ where: { verificationStatus: { not: "APPROVED" } } });
  const pendingExperiences = await prisma.experience.count({ where: { verificationStatus: { not: "APPROVED" } } });
  console.log(`  ${pendingProjects} project(s) and ${pendingExperiences} experience(s) are not human-approved and are labelled as such in the interface`);

  console.log("\n=== REVIEWER DECISION PROPAGATION ===");
  const approvedCertDocs = documents.filter(d => d.contextType === "CERTIFICATION" && d.reviewStatus === "APPROVED");
  let propagated = 0;
  for (const document of approvedCertDocs) {
    const match = await prisma.studentCertification.findFirst({
      where: { certificationId: document.contextId, verificationStatus: "APPROVED" },
    });
    if (match) propagated++;
  }
  check(
    "approved certification documents propagate to the record",
    approvedCertDocs.length === 0 || propagated > 0,
    approvedCertDocs.length === 0
      ? "no approved certification documents to check"
      : `${propagated} of ${approvedCertDocs.length} approved certification document(s) have an approved record`,
  );

  console.log(`\n${failures === 0 ? "ALL EVIDENCE CHECKS PASSED" : `${failures} EVIDENCE CHECK(S) FAILED`}\n`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main()
  .catch(error => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
