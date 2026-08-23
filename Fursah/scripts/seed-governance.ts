/**
 * Demo enrichment: cohort depth plus the governance operating history.
 *
 * The governance surfaces — evidence review, the audit trail, model
 * monitoring, and the scenario register — are the platform's strongest claim,
 * and on a fresh database they are all empty. An empty audit log does not
 * demonstrate accountability; it looks like a schema nobody used. This script
 * populates them with a plausible operating history so the workflows can be
 * demonstrated end to end.
 *
 *   npx tsx --require ./scripts/allow-server-only.cjs scripts/seed-governance.ts
 *   npx tsx --require ./scripts/allow-server-only.cjs scripts/seed-governance.ts --reset
 *
 * Everything created here is prefixed `demo/` in storage keys and tagged in
 * notes, so it is identifiable and removable with --reset. Evidence rows point
 * at storage keys with no object behind them: the review workflow, the
 * extraction output, and the decision trail are all real, but "download
 * original" will not resolve. That is deliberate — this script does not
 * fabricate documents, only the review history around them.
 *
 * It also seeds cohort depth. Suppression applies to every reporting group,
 * not just the cohort total, so a university with six students spread over
 * five career tracks has nothing publishable — correct, but it demonstrates
 * nothing. The cohort seeder fills the two registered institutions until the
 * main career tracks clear MIN_COHORT while deliberately leaving two small
 * tracks below it, so both the analytics and the privacy control are visible
 * on the same page. Two small groups rather than one is itself deliberate:
 * a single suppressed group is recoverable by subtracting the published ones,
 * which is why the suppression logic withholds a second.
 *
 * Everything is idempotent and keyed on email or on the exact note text, so
 * reruns add nothing. The hand-written scenario students from prisma/seed.ts
 * are never touched.
 *
 * Runs against whatever DATABASE_URL / TURSO_AUTH_TOKEN are configured, so
 * check which database is pointed at before running.
 */

import { prisma } from "../src/lib/db";
import { serializeIssues } from "../src/lib/governanceIssues";
import { CAREER_TRACKS } from "../src/lib/careerTracks";
import { MIN_COHORT } from "../src/lib/cohort";

const RESET = process.argv.includes("--reset");
const DEMO_PREFIX = "demo/governance/";
const DEMO_TAG = "[demo]";

/** Deterministic dates so reruns and screenshots stay stable. */
const now = new Date();
function daysAgo(days: number, hours = 0) {
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  d.setHours(9 + hours, 0, 0, 0);
  return d;
}

async function reset() {
  const docs = await prisma.evidenceDocument.deleteMany({ where: { storageKey: { startsWith: DEMO_PREFIX } } });
  const snaps = await prisma.monitoringSnapshot.deleteMany({ where: { notes: { contains: DEMO_TAG } } });
  const scenarios = await prisma.governanceScenario.deleteMany({ where: { description: { contains: DEMO_TAG } } });
  const audits = await prisma.auditEvent.deleteMany({ where: { explanation: { contains: DEMO_TAG } } });
  const appeals = await prisma.appeal.deleteMany({ where: { reason: { contains: DEMO_TAG } } });
  const requests = await prisma.dataRequest.deleteMany({ where: { details: { contains: DEMO_TAG } } });
  // Generated cohort members only. The hand-written scenario students carry no
  // cohort tag and are left alone.
  const cohort = await prisma.user.deleteMany({
    where: { role: "STUDENT", student: { bio: { contains: COHORT_BIO_TAG } } },
  });
  console.log(
    `Removed ${docs.count} evidence, ${snaps.count} snapshots, ${scenarios.count} scenarios, ${audits.count} audit events, ${appeals.count} appeals, ${requests.count} data requests, ${cohort.count} generated cohort students.`,
  );
}

/**
 * The record a seeded document is evidence for.
 *
 * Mirrors what the upload path stores: a certification document carries the
 * certificationId, a project document the project id, an experience document
 * the experience id. Falls back to the student id only when the student has no
 * such record, which keeps the seed working on a thin database.
 */
function contextIdFor(
  contextType: string,
  student: { id: string; certifications: { certificationId: string }[]; projects: { id: string }[]; experiences: { id: string }[] },
): string | null {
  // Returning the student id as a fallback produced a document that was
  // evidence for nothing: approving it updated no record, so the demo showed a
  // decision with no consequence — the exact failure this seed exists to
  // disprove. A student with no such record is skipped instead.
  if (contextType === "CERTIFICATION") return student.certifications[0]?.certificationId ?? null;
  if (contextType === "PROJECT") return student.projects[0]?.id ?? null;
  if (contextType === "EXPERIENCE") return student.experiences[0]?.id ?? null;
  return student.id;
}

async function seedEvidence() {
  // The hand-written scenario students come first; the window is wide enough
  // that a template needing a particular kind of record (a still-pending
  // credential, say) can find one instead of being skipped.
  const students = await prisma.student.findMany({
    include: { user: true, certifications: { include: { certification: true } }, projects: true, experiences: true },
    orderBy: { createdAt: "asc" },
    take: 12,
  });
  if (!students.length) {
    console.log("No students found — run the main seed first. Skipping evidence.");
    return 0;
  }

  // Each entry exercises a different state of the review workflow, because the
  // point of the demo is the workflow, not the happy path.
  const templates = [
    {
      contextType: "CERTIFICATION",
      originalName: "aws-cloud-practitioner-certificate.pdf",
      mimeType: "application/pdf",
      sizeBytes: 184_320,
      aiStatus: "COMPLETED",
      reviewStatus: "APPROVED",
      reviewNote: "Issuer and certificate ID verified against the AWS registry. Extraction accurate.",
      ageDays: 12,
      analysis: {
        documentType: "Professional certification",
        title: "AWS Certified Cloud Practitioner",
        issuer: "Amazon Web Services",
        issueDate: "2026-03-14",
        expiryDate: "2029-03-14",
        overallConfidence: 0.94,
        skills: [
          { name: "Cloud Computing", confidence: 0.95, evidence: "Certificate title and issuing body confirm foundational cloud competency." },
          { name: "AWS", confidence: 0.97, evidence: "Issued by Amazon Web Services against the Cloud Practitioner syllabus." },
        ],
        reviewNote: "Certificate appears authentic. Issuer, dates and credential ID are all present and internally consistent.",
      },
    },
    {
      contextType: "PROJECT",
      originalName: "graduation-project-report.pdf",
      mimeType: "application/pdf",
      sizeBytes: 2_458_112,
      aiStatus: "COMPLETED",
      reviewStatus: "PENDING",
      reviewNote: null,
      ageDays: 2,
      analysis: {
        documentType: "Project report",
        projectTitle: "Arabic Handwriting Recognition for Early Dyslexia Screening",
        projectType: "Capstone project",
        role: "Lead developer",
        organization: "College of Computer and Information Sciences",
        completionDate: "2026-05-20",
        technologies: ["Python", "PyTorch", "OpenCV"],
        overallConfidence: 0.71,
        skills: [
          { name: "Python", confidence: 0.88, evidence: "Implementation chapter describes the model training pipeline in Python." },
          { name: "Machine Learning", confidence: 0.82, evidence: "Report documents model selection, training and evaluation methodology." },
          { name: "Data Analysis", confidence: 0.64, evidence: "Results section reports precision and recall across a held-out set." },
          { name: "Technical Writing", confidence: 0.55, evidence: "Structured report with methodology, results and discussion sections." },
        ],
        reviewNote:
          "Document supports the technical skills claimed. Individual contribution is not clearly separable from the team's — a reviewer should confirm the student's own role before approving the leadership claim.",
      },
    },
    {
      contextType: "EXPERIENCE",
      originalName: "internship-letter-scan.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 892_400,
      aiStatus: "COMPLETED",
      reviewStatus: "REJECTED",
      reviewNote:
        "Extraction is plausible but the scan is too low-resolution to read the issuing signature, and the stated duration conflicts with the profile entry. Student asked to re-upload a clearer copy — this is a document quality decision, not a judgement about the experience.",
      ageDays: 6,
      analysis: {
        documentType: "Employment letter",
        roleTitle: "Software Engineering Intern",
        organization: "Elm Company",
        experienceType: "internship",
        startDate: "2026-06-01",
        endDate: "2026-08-31",
        duration: "3 months",
        overallConfidence: 0.38,
        skills: [
          { name: "Teamwork", confidence: 0.42, evidence: "Letter references contribution to a delivery squad, though the text is partly illegible." },
        ],
        reviewNote: "Low confidence: image resolution prevents reliable reading of the signature block and the end date.",
      },
    },
    {
      contextType: "CERTIFICATION",
      originalName: "coursera-data-analysis.pdf",
      mimeType: "application/pdf",
      sizeBytes: 96_140,
      aiStatus: "FAILED",
      reviewStatus: "PENDING",
      reviewNote: null,
      ageDays: 1,
      analysis: null,
      // This template is the "automated analysis failed, a human still has to
      // decide" case, so it has to sit on a credential that is genuinely still
      // pending. Attached to an already-approved one, approving it would change
      // nothing and demonstrate nothing.
      requiresPendingRecord: true,
    },
  ];

  let created = 0;
  for (const [i, template] of templates.entries()) {
    // Pick a student who actually holds the kind of record this document is
    // evidence for, rather than whoever falls at this index.
    const wantsPending = "requiresPendingRecord" in template && template.requiresPendingRecord === true;
    const rotated = students.map((_, offset) => students[(i + offset) % students.length]);
    const student =
      rotated.find(
        (candidate) =>
          contextIdFor(template.contextType, candidate) !== null &&
          (!wantsPending || candidate.certifications.some((entry) => entry.verificationStatus === "PENDING")),
      ) ?? null;
    if (!student) {
      console.log(`Skipping ${template.originalName}: no student in the demo window holds a suitable ${template.contextType.toLowerCase()} record to attach it to.`);
      continue;
    }
    const contextId = wantsPending
      ? student.certifications.find((entry) => entry.verificationStatus === "PENDING")?.certificationId ?? null
      : contextIdFor(template.contextType, student);
    if (!contextId) continue;
    const createdAt = daysAgo(template.ageDays);
    const storageKey = `${DEMO_PREFIX}${student.userId}/${template.contextType.toLowerCase()}/${i}-${template.originalName}`;

    const existing = await prisma.evidenceDocument.findUnique({ where: { storageKey } });
    if (existing) continue;

    await prisma.evidenceDocument.create({
      data: {
        ownerUserId: student.userId,
        contextType: template.contextType,
        // contextId identifies the record the document is evidence *for*, and
        // the reviewer action reads it as such: approving a CERTIFICATION
        // document updates the StudentCertification with that certificationId.
        // Seeding the student id here meant an approved document propagated to
        // nothing, so the demo showed an approval that changed no record.
        contextId,
        purpose: `Supporting evidence for ${template.contextType.toLowerCase()}`,
        storageKey,
        originalName: template.originalName,
        mimeType: template.mimeType,
        sizeBytes: template.sizeBytes,
        aiStatus: template.aiStatus,
        aiAnalysis: template.analysis ?? undefined,
        aiAnalyzedAt: template.analysis ? createdAt : null,
        reviewStatus: template.reviewStatus,
        reviewNote: template.reviewNote,
        reviewedBy: template.reviewStatus === "PENDING" ? null : "Governance reviewer",
        reviewedAt: template.reviewStatus === "PENDING" ? null : daysAgo(template.ageDays - 1),
        createdAt,
      },
    });
    created++;
  }
  console.log(`Evidence documents created: ${created}`);
  return created;
}

// ---------------------------------------------------------------------------
// Cohort depth
// ---------------------------------------------------------------------------

/** Marks a generated cohort member so --reset can find them again. */
const COHORT_BIO_TAG = "[demo cohort]";

/**
 * Evidence profiles.
 *
 * Readiness weights technical skills 35%, certifications 20%, experience 20%,
 * soft skills 15% and portfolio 10%, so a profile is defined by how much of a
 * track's requirements it satisfies rather than by a target score. The score
 * is then whatever the real engine computes from that evidence — nothing here
 * writes a readiness number, and nothing asserts one.
 */
const EVIDENCE_PROFILES = {
  strong: { technicalShare: 1, technicalLevel: 5, softShare: 1, softLevel: 4, certShare: 1, experienceShare: 1.2, projects: 3 },
  solid: { technicalShare: 0.85, technicalLevel: 4, softShare: 1, softLevel: 4, certShare: 1, experienceShare: 1, projects: 3 },
  developing: { technicalShare: 0.6, technicalLevel: 3, softShare: 0.67, softLevel: 3, certShare: 0.5, experienceShare: 0.6, projects: 2 },
  early: { technicalShare: 0.3, technicalLevel: 2, softShare: 0.34, softLevel: 2, certShare: 0, experienceShare: 0.16, projects: 1 },
} as const;

type ProfileName = keyof typeof EVIDENCE_PROFILES;

const FIRST_NAMES = [
  "Aisha", "Bandar", "Danah", "Ebtisam", "Fahad", "Ghadah", "Hessa", "Ibrahim",
  "Jawaher", "Kholoud", "Layan", "Mishal", "Nawaf", "Ohood", "Raed", "Sultan",
  "Tala", "Waleed", "Yara", "Ziyad", "Amjad", "Basma", "Faisal", "Haya",
  "Majed", "Norah", "Rakan", "Shatha", "Turki", "Wafa", "Rayan", "Lulwah",
  "Saad", "Munira",
];

const LAST_NAMES = [
  "Al-Subaie", "Al-Dossary", "Al-Juhani", "Al-Malki", "Al-Shammari", "Al-Balawi",
  "Al-Amri", "Al-Zahrani", "Al-Harbi", "Al-Qarni", "Al-Mutairi", "Al-Ghamdi",
  "Al-Otaibi", "Al-Anazi", "Al-Rashidi", "Al-Yami",
];

/**
 * Target shape per institution.
 *
 * Three tracks per institution clear MIN_COHORT so the analytics are real, and
 * two sit under it so the suppression notice is real too. Both facts have to
 * be visible on the same screen for the control to be demonstrable rather than
 * merely claimed.
 */
const COHORT_TARGETS: { institution: string; tracks: Record<string, number> }[] = [
  {
    institution: "King Saud University",
    tracks: {
      "software-engineer": 8,
      "data-scientist": 7,
      "cybersecurity-specialist": 6,
      "financial-analyst": 2,
      "ux-designer": 1,
    },
  },
  {
    institution: "Prince Sultan University",
    tracks: {
      "software-engineer": 7,
      "data-scientist": 6,
      "cybersecurity-specialist": 5,
      "ux-designer": 2,
      "financial-analyst": 1,
    },
  },
];

/** Bands need populating too, so profiles cycle rather than clustering. */
const PROFILE_CYCLE: ProfileName[] = [
  "strong", "developing", "early", "solid", "developing", "early",
  "strong", "developing", "early", "solid", "developing", "early",
];

const DEGREE_BY_TRACK: Record<string, string> = {
  "software-engineer": "B.Sc. Software Engineering",
  "data-scientist": "B.Sc. Data Science",
  "cybersecurity-specialist": "B.Sc. Cybersecurity",
  "financial-analyst": "B.Sc. Finance",
  "ux-designer": "B.A. Design",
};

function take<T>(items: readonly T[], share: number): T[] {
  const count = Math.max(0, Math.min(items.length, Math.round(items.length * share)));
  return items.slice(0, count);
}

async function seedCohortStudents() {
  // Decisions are attributed to the real administrator account so the archive
  // resolves to a name rather than a dangling identifier.
  const reviewer = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  const reviewerUserId = reviewer?.id ?? null;

  const trackById = new Map(CAREER_TRACKS.map(track => [track.id, track]));
  const skills = await prisma.skill.findMany();
  const skillIdByName = new Map(skills.map(skill => [skill.name.toLowerCase(), skill.id]));
  const certifications = await prisma.certification.findMany();
  const certIdByName = new Map(certifications.map(entry => [entry.name.toLowerCase(), entry.id]));

  if (!skillIdByName.size) {
    console.log("No skills in the taxonomy — run the main seed first. Skipping cohort.");
    return 0;
  }

  let created = 0;
  let nameIndex = 0;
  let profileIndex = 0;

  for (const target of COHORT_TARGETS) {
    for (const [trackId, wanted] of Object.entries(target.tracks)) {
      const track = trackById.get(trackId);
      if (!track) continue;

      const existing = await prisma.student.count({
        where: { university: target.institution, targetCareer: trackId },
      });
      const missing = Math.max(0, wanted - existing);

      for (let index = 0; index < missing; index++) {
        const first = FIRST_NAMES[nameIndex % FIRST_NAMES.length];
        const last = LAST_NAMES[Math.floor(nameIndex / FIRST_NAMES.length) % LAST_NAMES.length];
        nameIndex++;

        const name = `${first} ${last}`;
        const email = `${first}.${last.replace("Al-", "")}@example.com`.toLowerCase();

        // Idempotent: a rerun finds the address and moves on.
        if (await prisma.user.findUnique({ where: { email } })) continue;

        const profileName = PROFILE_CYCLE[profileIndex % PROFILE_CYCLE.length];
        profileIndex++;
        const profile = EVIDENCE_PROFILES[profileName];

        const user = await prisma.user.create({
          data: { role: "STUDENT", name, email },
        });

        const student = await prisma.student.create({
          data: {
            userId: user.id,
            targetCareer: trackId,
            university: target.institution,
            degree: DEGREE_BY_TRACK[trackId] ?? "B.Sc.",
            bio: `${COHORT_BIO_TAG} Synthetic cohort member used to demonstrate institution-level analytics and the cohort suppression threshold. Not a real person.`,
          },
        });

        for (const requirement of take(track.technicalSkills, profile.technicalShare)) {
          const skillId = skillIdByName.get(requirement.name.toLowerCase());
          if (!skillId) continue;
          await prisma.studentSkill.create({
            data: { studentId: student.id, skillId, level: profile.technicalLevel },
          });
        }

        for (const requirement of take(track.softSkills, profile.softShare)) {
          const skillId = skillIdByName.get(requirement.name.toLowerCase());
          if (!skillId) continue;
          await prisma.studentSkill.create({
            data: { studentId: student.id, skillId, level: profile.softLevel },
          });
        }

        for (const [certIndex, certName] of take(track.certifications, profile.certShare).entries()) {
          const certificationId = certIdByName.get(certName.toLowerCase());
          if (!certificationId) continue;
          // Only human-approved evidence counts toward readiness, so seeded
          // certifications are approved explicitly rather than left pending.
          //
          // The decision is written out in full — reviewer, note and timestamp
          // — because approving with a bare status produced an archive of
          // "Unknown reviewer / Not recorded / No review note" rows: a history
          // that proves an approval happened but not that anybody made it.
          // The dates are staggered so the archive reads as an operating
          // record rather than one bulk action.
          const reviewedAt = daysAgo(9 + ((index + certIndex) % 40));
          await prisma.studentCertification.create({
            data: {
              studentId: student.id,
              certificationId,
              verificationStatus: "APPROVED",
              reviewNote: `${DEMO_TAG} Certificate checked against the issuer's public verification service; holder name and issue date match the account.`,
              reviewedAt,
              reviewedBy: reviewerUserId,
              earnedAt: reviewedAt,
            },
          });
        }

        /*
         * One rejection per institution, so the archive shows both outcomes.
         * A rejection is a document-quality decision, not a judgement about
         * whether the student holds the credential, and the note says so.
         */
        if (index === 1) {
          const rejectedCertName = track.certifications.find(
            (name) => !take(track.certifications, profile.certShare).includes(name),
          ) ?? track.certifications[track.certifications.length - 1];
          const rejectedId = rejectedCertName ? certIdByName.get(rejectedCertName.toLowerCase()) : null;
          if (rejectedId) {
            const existing = await prisma.studentCertification.findUnique({
              where: { studentId_certificationId: { studentId: student.id, certificationId: rejectedId } },
            });
            if (!existing) {
              await prisma.studentCertification.create({
                data: {
                  studentId: student.id,
                  certificationId: rejectedId,
                  verificationStatus: "REJECTED",
                  reviewNote: `${DEMO_TAG} The uploaded scan is cropped: the credential number and issue date are not legible. Re-upload a full-page copy and this can be reviewed again.`,
                  reviewedAt: daysAgo(4),
                  reviewedBy: reviewerUserId,
                  earnedAt: daysAgo(6),
                },
              });
            }
          }
        }

        const months = Math.round(track.recommendedExperienceMonths * profile.experienceShare);
        if (months > 0) {
          await prisma.experience.create({
            data: {
              studentId: student.id,
              type: "internship",
              title: `${track.label} internship`,
              org: target.institution === "King Saud University" ? "Riyadh FinTech Group" : "Nexariya Technologies",
              months,
              verificationStatus: "APPROVED",
            },
          });
        }

        for (let projectIndex = 0; projectIndex < profile.projects; projectIndex++) {
          await prisma.project.create({
            data: {
              studentId: student.id,
              title: `${track.label} portfolio project ${projectIndex + 1}`,
              description: `${COHORT_BIO_TAG} Coursework project evidencing ${track.technicalSkills[projectIndex % track.technicalSkills.length]?.name ?? track.label}.`,
              verificationStatus: projectIndex === 0 ? "APPROVED" : "SELF_REPORTED",
            },
          });
        }

        created++;
      }
    }
  }

  console.log(`Cohort students created: ${created}`);
  return created;
}

async function seedMonitoring() {
  // A drift series rather than a single reading: one snapshot proves nothing,
  // and the WATCH -> PAUSED progression is what shows the safeguard working.
  const snapshots = [
    { modelVersion: "readiness-v1.2", sampleSize: 142, averageScore: 61.4, outcomeRate: 0.38, scoreDrift: 0.01, outcomeDrift: 0.02, status: "HEALTHY", notes: `${DEMO_TAG} Baseline after taxonomy sync.`, ageDays: 60 },
    { modelVersion: "readiness-v1.2", sampleSize: 168, averageScore: 62.1, outcomeRate: 0.37, scoreDrift: 0.02, outcomeDrift: 0.03, status: "HEALTHY", notes: `${DEMO_TAG} Stable across the reporting period.`, ageDays: 45 },
    { modelVersion: "readiness-v1.3", sampleSize: 173, averageScore: 66.8, outcomeRate: 0.36, scoreDrift: 0.08, outcomeDrift: 0.04, status: "WATCH", notes: `${DEMO_TAG} Scores rose after new certifications entered the taxonomy while realised placement held flat. Divergence between score and outcome flagged for review.`, ageDays: 30 },
    { modelVersion: "readiness-v1.3", sampleSize: 181, averageScore: 71.2, outcomeRate: 0.34, scoreDrift: 0.15, outcomeDrift: 0.07, status: "PAUSED", notes: `${DEMO_TAG} Drift exceeded threshold: average score climbing while outcomes decline. Ruleset paused pending recalibration — scores continued to display with a staleness notice rather than being withdrawn from students mid-application.`, ageDays: 18 },
    { modelVersion: "readiness-v1.4", sampleSize: 156, averageScore: 64.9, outcomeRate: 0.39, scoreDrift: 0.03, outcomeDrift: 0.02, status: "HEALTHY", notes: `${DEMO_TAG} Certification weights recalibrated and thresholds reset. Score and outcome realigned.`, ageDays: 7 },
  ];

  let created = 0;
  for (const snapshot of snapshots) {
    const createdAt = daysAgo(snapshot.ageDays);
    const exists = await prisma.monitoringSnapshot.findFirst({ where: { notes: snapshot.notes } });
    if (exists) continue;
    const { ageDays, ...data } = snapshot;
    void ageDays;
    await prisma.monitoringSnapshot.create({ data: { ...data, createdAt } });
    created++;
  }
  console.log(`Monitoring snapshots created: ${created}`);
  return created;
}

async function seedScenarios() {
  const scenarios = [
    {
      title: "Readiness scores diverging from placement outcomes",
      scenarioType: "MODEL_DRIFT",
      description: `${DEMO_TAG} Monitoring flagged readiness-v1.3: average score rose 9 points over six weeks while realised placement fell. Investigation traced the rise to newly added certifications carrying full weight without evidence that they predict placement.`,
      riskLevel: "HIGH",
      detectedIssues: ["Score inflation without matching outcome improvement", "Certification weights not validated against results"],
      proposedAction: "Pause the ruleset, recalibrate certification weights, and recompute affected readiness scores.",
      humanDecision: "APPROVED",
      decisionNote: "Pause approved. Students mid-application were shown a staleness notice rather than having scores withdrawn, so nobody lost a live application to our recalibration.",
      createdBy: "Model monitoring",
      ageDays: 18,
    },
    {
      title: "Proposed auto-rejection of low-confidence evidence",
      scenarioType: "AUTOMATION_SCOPE",
      description: `${DEMO_TAG} A proposal to auto-reject any extraction below 0.40 confidence to reduce the review queue. Analysis showed low confidence correlates with poor scan quality and non-standard document formats, not with false claims.`,
      riskLevel: "HIGH",
      detectedIssues: ["Auto-rejection would systematically disadvantage students submitting photographed documents and non-standard formats — the exact candidates the platform exists to include"],
      proposedAction: "Automatically reject evidence scoring below 0.40 extraction confidence.",
      humanDecision: "OVERRIDDEN",
      decisionNote: "Rejected. Confidence measures how well the document was read, not whether the claim is true. Low confidence now routes to priority human review instead, and the student is told the document was unclear rather than that the evidence was refused.",
      createdBy: "Governance review",
      ageDays: 25,
    },
    {
      title: "Employer request for aggregate data below the suppression floor",
      scenarioType: "PRIVACY",
      description: `${DEMO_TAG} An employer requested readiness distributions for a named programme with three enrolled students, to inform a targeted recruitment campaign.`,
      riskLevel: "MEDIUM",
      detectedIssues: ["A distribution across three students identifies all three", "Request falls outside the purposes students consented to"],
      proposedAction: "Decline and explain the suppression threshold.",
      humanDecision: "APPROVED",
      decisionNote: "Declined. Employer offered aggregate figures at faculty level, which clear the five-student floor.",
      createdBy: "Data governance",
      ageDays: 34,
    },
    {
      title: "Assistant asked to identify a specific student",
      scenarioType: "PRIVACY",
      description: `${DEMO_TAG} A university user asked the assistant to name the lowest-scoring student in a cohort. The role-scoped context builder supplies universities with aggregate data only, so the individual record was never available to the model.`,
      riskLevel: "MEDIUM",
      detectedIssues: ["None materialised — the boundary held at the context layer rather than depending on the model refusing"],
      proposedAction: "No corrective action. Logged as verification that the scoping boundary holds under a real attempt.",
      humanDecision: "APPROVED",
      decisionNote: "Confirmed by the automated context verification: a university context cannot be constructed containing an individual student record.",
      createdBy: "Assistant monitoring",
      ageDays: 9,
    },
  ];

  let created = 0;
  for (const scenario of scenarios) {
    const exists = await prisma.governanceScenario.findFirst({ where: { description: scenario.description } });
    if (exists) continue;
    const { ageDays, detectedIssues, ...data } = scenario;
    await prisma.governanceScenario.create({
      // Through the shared serializer, so a seeded row and a row created by
      // `createGovernanceScenario` are stored identically. They were not: the
      // seed wrote prose into a column the admin page read with `JSON.parse`,
      // which threw and took the whole governance route down.
      data: {
        ...data,
        detectedIssues: serializeIssues(detectedIssues),
        createdAt: daysAgo(ageDays),
        reviewedAt: daysAgo(ageDays - 2),
      },
    });
    created++;
  }
  console.log(`Governance scenarios created: ${created}`);
  return created;
}

async function seedAuditTrail() {
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  const events = [
    { action: "EVIDENCE_APPROVED", entityType: "EVIDENCE", modelVersion: "extraction-v2", explanation: `${DEMO_TAG} Certificate verified against issuer registry; extraction accepted without amendment.`, ageDays: 11 },
    { action: "EVIDENCE_REJECTED", entityType: "EVIDENCE", modelVersion: "extraction-v2", explanation: `${DEMO_TAG} Scan illegible and duration inconsistent with profile. Student invited to re-upload.`, ageDays: 5 },
    { action: "EXTRACTION_AMENDED", entityType: "EVIDENCE", modelVersion: "extraction-v2", explanation: `${DEMO_TAG} Reviewer corrected the issuer field before approval; extraction had read the accrediting body rather than the issuer.`, ageDays: 4 },
    { action: "READINESS_RECOMPUTED", entityType: "READINESS", modelVersion: "readiness-v1.4", explanation: `${DEMO_TAG} Scores recomputed for all students after certification weights were recalibrated.`, ageDays: 7 },
    { action: "RULESET_PAUSED", entityType: "MODEL", modelVersion: "readiness-v1.3", explanation: `${DEMO_TAG} Ruleset paused after drift exceeded threshold. Approved by governance review.`, ageDays: 18 },
    { action: "APPEAL_UPHELD", entityType: "APPEAL", modelVersion: "readiness-v1.4", explanation: `${DEMO_TAG} Student appealed a readiness score citing bootcamp training absent from the taxonomy. Upheld — advisor recorded the competency and the gap was fed back to the taxonomy.`, ageDays: 14 },
    { action: "CONSENT_WITHDRAWN", entityType: "CONSENT", modelVersion: null, explanation: `${DEMO_TAG} Student withdrew employer-evidence consent. Evidence sharing stopped immediately; readiness score and applications unaffected.`, ageDays: 3 },
    { action: "DATA_REQUEST_COMPLETED", entityType: "DATA_REQUEST", modelVersion: null, explanation: `${DEMO_TAG} Access and portability request fulfilled within eight days.`, ageDays: 8 },
    { action: "SCENARIO_OVERRIDDEN", entityType: "GOVERNANCE", modelVersion: null, explanation: `${DEMO_TAG} Proposed auto-rejection of low-confidence evidence overridden by human reviewer.`, ageDays: 25 },
  ];

  let created = 0;
  for (const event of events) {
    const exists = await prisma.auditEvent.findFirst({ where: { explanation: event.explanation } });
    if (exists) continue;
    const { ageDays, ...data } = event;
    await prisma.auditEvent.create({
      data: { ...data, actorUserId: admin?.id ?? null, createdAt: daysAgo(ageDays) },
    });
    created++;
  }
  console.log(`Audit events created: ${created}`);
  return created;
}

/**
 * The rights side of the lifecycle: a student contesting an automated result,
 * and the four PDPL request types. The governance page renders appeals in its
 * review queue, and /admin/data-requests renders these, so both surfaces have
 * something to show. Statuses are mixed on purpose — an all-resolved queue
 * demonstrates nothing about how the queue behaves.
 */
async function seedRightsAndAppeals() {
  const students = await prisma.student.findMany({ include: { user: true }, orderBy: { id: "asc" }, take: 6 });
  if (!students.length) {
    console.log("No students found — skipping appeals and data requests.");
    return 0;
  }

  const appeals = [
    {
      subjectType: "READINESS",
      reason: `${DEMO_TAG} My bootcamp training is not in the skill taxonomy, so my readiness score does not reflect work I can evidence.`,
      status: "RESOLVED",
      resolution:
        "Upheld. An advisor recorded the competency against the taxonomy and the score was recomputed. The missing taxonomy entry was raised as a catalogue gap rather than treated as this student's problem.",
      reviewedBy: "Governance reviewer",
      ageDays: 14,
    },
    {
      subjectType: "EVIDENCE",
      reason: `${DEMO_TAG} My certificate was rejected because the scan was unclear, but the certificate itself is valid.`,
      status: "RESOLVED",
      resolution:
        "Upheld. Re-uploaded document was legible and approved. Rejection reason was document quality, never the validity of the claim, and the wording shown to students was changed to say so.",
      reviewedBy: "Evidence reviewer",
      ageDays: 6,
    },
    {
      subjectType: "MATCH",
      reason: `${DEMO_TAG} I was ranked below candidates with fewer skills for a role I meet the requirements of.`,
      status: "UNDER_REVIEW",
      resolution: null,
      reviewedBy: null,
      ageDays: 2,
    },
  ];

  const requests = [
    {
      type: "ACCESS",
      details: `${DEMO_TAG} Requesting a copy of every field held about me, including extraction output.`,
      status: "COMPLETED",
      resolution: "Fulfilled in eight days. Export included profile, evidence, extraction output, scores and audit entries.",
      reviewedBy: "Data protection contact",
      ageDays: 8,
    },
    {
      type: "DOWNLOAD",
      details: `${DEMO_TAG} Portability request: machine-readable export for another platform.`,
      status: "COMPLETED",
      resolution: "JSON export delivered. Skills mapped to the published taxonomy so the receiving system can read them.",
      reviewedBy: "Data protection contact",
      ageDays: 21,
    },
    {
      type: "CORRECTION",
      details: `${DEMO_TAG} The extraction read my certificate issuer as the accrediting body. Please correct it.`,
      status: "PROCESSING",
      resolution: null,
      reviewedBy: null,
      ageDays: 3,
    },
    {
      type: "DELETION",
      details: `${DEMO_TAG} Requesting erasure of an uploaded document I no longer want stored.`,
      status: "OPEN",
      resolution: null,
      reviewedBy: null,
      ageDays: 1,
    },
  ];

  let created = 0;

  for (const [index, appeal] of appeals.entries()) {
    const student = students[index % students.length];
    if (await prisma.appeal.findFirst({ where: { reason: appeal.reason } })) continue;
    const { ageDays, ...data } = appeal;
    await prisma.appeal.create({
      data: {
        ...data,
        studentId: student.id,
        createdAt: daysAgo(ageDays),
        reviewedAt: data.status === "RESOLVED" ? daysAgo(Math.max(0, ageDays - 2)) : null,
      },
    });
    created++;
  }

  for (const [index, request] of requests.entries()) {
    const student = students[(index + 1) % students.length];
    if (await prisma.dataRequest.findFirst({ where: { details: request.details } })) continue;
    const { ageDays, ...data } = request;
    await prisma.dataRequest.create({
      data: {
        ...data,
        studentId: student.id,
        createdAt: daysAgo(ageDays),
        reviewedAt: data.status === "COMPLETED" ? daysAgo(Math.max(0, ageDays - 1)) : null,
      },
    });
    created++;
  }

  console.log(`Appeals and data requests created: ${created}`);
  return created;
}


/**
 * Backfill for cohorts seeded before decisions were recorded.
 *
 * Earlier runs wrote `verificationStatus: "APPROVED"` and nothing else, so the
 * certificate archive listed dozens of approvals with no reviewer, no note and
 * no timestamp — an audit trail that cannot answer who decided, when, or why.
 * Reruns are cheap because only rows still missing a decision are touched.
 */
/**
 * Brings existing scenario students in line with the one evidence-trust model.
 *
 * Experience and portfolio entries used to score whatever their verification
 * state, so the seed never had a reason to record one and most entries sat at
 * SELF_REPORTED while still counting. Now that only approved evidence scores,
 * those same rows would read as a platform where nobody has any verified
 * experience at all, which is neither true nor a useful demonstration.
 *
 * This assigns the states the scenario is meant to show: verified evidence that
 * scores, pending evidence that is visibly waiting, self-reported evidence the
 * student can still record, and one rejection that must never contribute.
 * Idempotent: a row already carrying a decision is left alone.
 */
/**
 * Graduation years for the scenario students.
 *
 * The employer-side "recent graduates accepted" flag is only meaningful if some
 * students are recent graduates and some are not, so the demo needs both. Years
 * are relative to the current year rather than hard-coded, so this does not
 * quietly stop demonstrating anything as time passes. Idempotent: a student who
 * already stated a year keeps it, because it is their answer and not ours.
 */
async function repairGraduationYears() {
  const year = new Date().getFullYear();

  // Deliberately a mix either side of the two-year window.
  const intent: Record<string, number> = {
    "sara.aldosari@example.com": year,          // graduating now
    "khalid.alharbi@example.com": year,         // graduating now
    "dana.alharbi@example.com": year + 1,       // still studying
    "abdullah.alghamdi@example.com": year - 1,  // recent
    "reem.alanazi@example.com": year - 1,       // recent
    "faris.alqahtani@example.com": year,        // graduating now
    "lina.alzahrani@example.com": year - 4,     // not recent
    "omar.alrashid@example.com": year - 5,      // not recent
    "maha.alotaibi@example.com": year - 3,      // not recent
    "yousef.alshehri@example.com": year + 1,    // still studying
    "hana.almutairi@example.com": year - 1,     // recent
  };

  let changed = 0;
  for (const [email, graduationYear] of Object.entries(intent)) {
    const result = await prisma.student.updateMany({
      where: { user: { email }, graduationYear: null },
      data: { graduationYear },
    });
    changed += result.count;
  }

  // Generated cohort members get a spread across the same window so the
  // opportunities filter has a realistic population behind it.
  const cohort = await prisma.student.findMany({
    where: { bio: { contains: COHORT_BIO_TAG }, graduationYear: null },
    select: { id: true },
  });

  for (const [index, student] of cohort.entries()) {
    await prisma.student.update({
      where: { id: student.id },
      data: { graduationYear: year - (index % 5) },
    });
    changed += 1;
  }

  if (changed) console.log(`Graduation years set: ${changed} student(s)`);
  return changed;
}

async function repairEvidenceVerificationStates() {
  const reviewer = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!reviewer) return 0;

  const decided = {
    reviewedAt: daysAgo(30),
    reviewedBy: reviewer.id,
  };

  /** email -> what each scenario student is meant to demonstrate. */
  const intent: Record<string, { experience?: string; project?: string }> = {
    // Strong: a reviewer has seen everything.
    "sara.aldosari@example.com": { experience: "APPROVED", project: "APPROVED" },
    // Developing, but with verified evidence behind the score.
    "abdullah.alghamdi@example.com": { experience: "APPROVED", project: "APPROVED" },
    "omar.alrashid@example.com": { experience: "APPROVED", project: "APPROVED" },
    "reem.alanazi@example.com": { experience: "APPROVED", project: "APPROVED" },
    "maha.alotaibi@example.com": { experience: "APPROVED", project: "APPROVED" },
    "yousef.alshehri@example.com": { experience: "APPROVED" },
    // Awaiting a human decision: recorded, shown, and correctly not scored.
    "khalid.alharbi@example.com": { experience: "PENDING" },
    "faris.alqahtani@example.com": { experience: "PENDING" },
    // Rejected evidence, which must never contribute to a score.
    "lina.alzahrani@example.com": { experience: "REJECTED", project: "APPROVED" },
    // Left entirely self-reported on purpose: the profile whose readiness moves
    // when the administrator decides on the certificate in the review queue.
    "dana.alharbi@example.com": {},
  };

  let changed = 0;

  for (const [email, wanted] of Object.entries(intent)) {
    const student = await prisma.student.findFirst({ where: { user: { email } } });
    if (!student) continue;

    if (wanted.experience) {
      const note =
        wanted.experience === "REJECTED"
          ? `${DEMO_TAG} The uploaded letter is too low-resolution to read the issuing signature, and the stated duration conflicts with the profile entry. A clearer copy can be reviewed again.`
          : `${DEMO_TAG} Employer letter inspected and the dates confirmed with the organisation.`;
      const result = await prisma.experience.updateMany({
        where: { studentId: student.id, verificationStatus: "SELF_REPORTED" },
        data:
          wanted.experience === "PENDING"
            ? { verificationStatus: "PENDING" }
            : { verificationStatus: wanted.experience, reviewNote: note, ...decided },
      });
      changed += result.count;
    }

    if (wanted.project) {
      const result = await prisma.project.updateMany({
        where: { studentId: student.id, verificationStatus: "SELF_REPORTED" },
        data: {
          verificationStatus: wanted.project,
          reviewNote: `${DEMO_TAG} Repository and contribution history inspected; the student's own contribution is identifiable.`,
          ...decided,
        },
      });
      changed += result.count;
    }
  }

  if (changed) console.log(`Evidence verification states aligned: ${changed} record(s)`);
  return changed;
}

async function repairUnattributedDecisions() {
  const reviewer = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!reviewer) return 0;

  const orphaned = await prisma.studentCertification.findMany({
    where: { verificationStatus: { in: ["APPROVED", "REJECTED"] }, reviewedAt: null },
    select: { id: true },
  });

  for (const [index, row] of orphaned.entries()) {
    const reviewedAt = daysAgo(9 + (index % 40));
    await prisma.studentCertification.update({
      where: { id: row.id },
      data: {
        reviewedAt,
        reviewedBy: reviewer.id,
        reviewNote:
          `${DEMO_TAG} Certificate checked against the issuer's public verification service; holder name and issue date match the account.`,
      },
    });
  }

  if (orphaned.length) console.log(`Unattributed certificate decisions repaired: ${orphaned.length}`);
  return orphaned.length;
}

/**
 * A rejected certificate, so the archive shows both outcomes.
 *
 * Approval history alone demonstrates only half of the review workflow; a
 * reviewer needs to be able to see what a refusal looks like and what reason
 * was given. Rejection here is a document-quality decision — the credential
 * may well be genuine — and the note says exactly that, because a rejection
 * note that reads as an accusation is the wrong model to demonstrate.
 */
/**
 * Re-dates checkpoint reviews written before they carried a date.
 *
 * A 30-day, a 90-day and a 180-day review of the same placement were all
 * stamped with the moment the seed ran, so the interface showed three
 * checkpoints of one hire on a single afternoon. The review dates are the only
 * thing that makes the outcome loop legible as a sequence.
 */
/**
 * One account with nothing in it.
 *
 * Every other demo student arrives fully evidenced, which demonstrates the
 * platform at its richest and hides the question a reviewer will actually ask:
 * what does a person see on their first day? This account exists so that can be
 * shown — no skills, no credentials, no target career, and therefore no
 * readiness score, no roadmap and no recommendations. The point of the scenario
 * is that Fursah declines to invent any of them and asks for evidence instead.
 */
async function seedEmptyStudentAccount() {
  const email = "new.starter@example.com";
  if (await prisma.user.findUnique({ where: { email } })) return 0;

  await prisma.user.create({
    data: {
      role: "STUDENT",
      name: "Noor Al-Faisal",
      email,
      student: {
        create: {
          targetCareer: "undecided",
          bio: `${DEMO_TAG} Empty account, kept deliberately bare to demonstrate onboarding and the absence of fabricated intelligence.`,
        },
      },
    },
  });

  console.log("Empty starter account created: 1");
  return 1;
}

async function repairFeedbackDates() {
  const reviews = await prisma.feedback.findMany({ select: { id: true, checkpointDays: true, createdAt: true } });
  const sameDay = new Set(reviews.map((review) => review.createdAt.toISOString().slice(0, 10)));
  if (sameDay.size > 1) return 0;

  for (const review of reviews) {
    const date = new Date();
    date.setDate(date.getDate() - (185 - review.checkpointDays));
    date.setHours(11, 0, 0, 0);
    await prisma.feedback.update({ where: { id: review.id }, data: { createdAt: date } });
  }

  if (reviews.length) console.log(`Checkpoint review dates repaired: ${reviews.length}`);
  return reviews.length;
}

async function seedRejectedCertification() {
  const reviewer = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!reviewer) return 0;

  const existing = await prisma.studentCertification.count({ where: { verificationStatus: "REJECTED" } });
  if (existing > 0) return 0;

  // A generated cohort member, so no hand-written scenario student is altered.
  const student = await prisma.student.findFirst({
    where: { bio: { contains: COHORT_BIO_TAG }, university: "King Saud University" },
    include: { certifications: true },
  });
  if (!student) return 0;

  const heldIds = new Set(student.certifications.map((entry) => entry.certificationId));
  const certification = await prisma.certification.findFirst({ where: { id: { notIn: [...heldIds] } } });
  if (!certification) return 0;

  await prisma.studentCertification.create({
    data: {
      studentId: student.id,
      certificationId: certification.id,
      verificationStatus: "REJECTED",
      reviewNote:
        `${DEMO_TAG} The uploaded scan is cropped: the credential number and the issue date are not legible. This is a document-quality decision, not a finding about whether the credential was earned — a full-page copy can be reviewed again.`,
      reviewedAt: daysAgo(4),
      reviewedBy: reviewer.id,
      earnedAt: daysAgo(7),
    },
  });

  console.log("Rejected certificate history created: 1");
  return 1;
}

async function main() {
  console.log(RESET ? "Removing demo governance data...\n" : "Seeding governance demo data...\n");
  if (RESET) {
    await reset();
    return;
  }

  await seedCohortStudents();
  await repairUnattributedDecisions();
  await repairEvidenceVerificationStates();
  await repairGraduationYears();
  await seedRejectedCertification();
  await repairFeedbackDates();
  await seedEmptyStudentAccount();
  await seedEvidence();
  await seedMonitoring();
  await seedScenarios();
  await seedRightsAndAppeals();
  await seedAuditTrail();

  console.log("\nTotals now in the database:");
  console.log(`  Students             ${await prisma.student.count()}`);
  console.log(`  Evidence documents   ${await prisma.evidenceDocument.count()}`);
  console.log(`  Monitoring snapshots ${await prisma.monitoringSnapshot.count()}`);
  console.log(`  Governance scenarios ${await prisma.governanceScenario.count()}`);
  console.log(`  Appeals              ${await prisma.appeal.count()}`);
  console.log(`  Data requests        ${await prisma.dataRequest.count()}`);
  console.log(`  Audit events         ${await prisma.auditEvent.count()}`);

  for (const target of COHORT_TARGETS) {
    const total = await prisma.student.count({ where: { university: target.institution } });
    const below: string[] = [];
    for (const trackId of Object.keys(target.tracks)) {
      const count = await prisma.student.count({ where: { university: target.institution, targetCareer: trackId } });
      if (count < MIN_COHORT) below.push(`${trackId} (${count})`);
    }
    console.log(
      `  ${target.institution}: ${total} students; tracks below the ${MIN_COHORT} floor and therefore suppressed: ${below.length ? below.join(", ") : "none"}`,
    );
  }
  console.log("\nNote: seeded evidence rows have no stored object behind them, so 'download original' will not resolve for those four. Documents uploaded through the app do resolve, via R2 when configured and local disk otherwise.");
}

main()
  .catch(error => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
