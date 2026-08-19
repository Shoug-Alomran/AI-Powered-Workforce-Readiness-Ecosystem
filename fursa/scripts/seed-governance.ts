/**
 * Governance demo data.
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
 * Runs against whatever DATABASE_URL / TURSO_AUTH_TOKEN are configured, so
 * check which database is pointed at before running.
 */

import { prisma } from "../src/lib/db";

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
  console.log(`Removed ${docs.count} evidence, ${snaps.count} snapshots, ${scenarios.count} scenarios, ${audits.count} audit events.`);
}

async function seedEvidence() {
  const students = await prisma.student.findMany({
    include: { user: true, certifications: { include: { certification: true } }, projects: true, experiences: true },
    take: 6,
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
    },
  ];

  let created = 0;
  for (const [i, template] of templates.entries()) {
    const student = students[i % students.length];
    const createdAt = daysAgo(template.ageDays);
    const storageKey = `${DEMO_PREFIX}${student.userId}/${template.contextType.toLowerCase()}/${i}-${template.originalName}`;

    const existing = await prisma.evidenceDocument.findUnique({ where: { storageKey } });
    if (existing) continue;

    await prisma.evidenceDocument.create({
      data: {
        ownerUserId: student.userId,
        contextType: template.contextType,
        contextId: student.id,
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
      detectedIssues: "Score inflation without matching outcome improvement; certification weights not validated against results.",
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
      detectedIssues: "Auto-rejection would systematically disadvantage students submitting photographed documents and non-standard formats — the exact candidates the platform exists to include.",
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
      detectedIssues: "A distribution across three students identifies all three. Request also falls outside the purposes students consented to.",
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
      detectedIssues: "None materialised. The boundary held at the context layer rather than depending on the model refusing.",
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
    const { ageDays, ...data } = scenario;
    await prisma.governanceScenario.create({
      data: { ...data, createdAt: daysAgo(ageDays), reviewedAt: daysAgo(ageDays - 2) },
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

async function main() {
  console.log(RESET ? "Removing demo governance data...\n" : "Seeding governance demo data...\n");
  if (RESET) {
    await reset();
    return;
  }

  await seedEvidence();
  await seedMonitoring();
  await seedScenarios();
  await seedAuditTrail();

  console.log("\nTotals now in the database:");
  console.log(`  Evidence documents   ${await prisma.evidenceDocument.count()}`);
  console.log(`  Monitoring snapshots ${await prisma.monitoringSnapshot.count()}`);
  console.log(`  Governance scenarios ${await prisma.governanceScenario.count()}`);
  console.log(`  Audit events         ${await prisma.auditEvent.count()}`);
  console.log("\nNote: seeded evidence rows have no object in R2, so 'download original' will not resolve.");
}

main()
  .catch(error => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
