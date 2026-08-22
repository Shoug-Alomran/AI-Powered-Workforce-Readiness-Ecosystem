/**
 * Deployment smoke test.
 *
 * One command that checks as much of a running Fursah as can be checked
 * without a browser, and says plainly what it could not check.
 *
 *   npx tsx --require ./scripts/allow-server-only.cjs scripts/smoke-test.ts
 *   npx tsx --require ./scripts/allow-server-only.cjs scripts/smoke-test.ts --url https://fursah.org
 *
 * Everything here is read-only: GETs against public routes, counts against the
 * database named by DATABASE_URL, and pure recomputation of the intelligence
 * layer. Nothing is written and no model is called.
 *
 * IMPORTANT: the HTTP checks hit --url while the data checks hit whatever
 * DATABASE_URL points at. Those are the same system only if the environment is
 * configured that way, and the report says which database it read so the two
 * are never silently confused.
 */
import { prisma } from "../src/lib/db";
import { computeCohortReadiness, MIN_COHORT } from "../src/lib/cohort";
import { CAREER_TRACKS, type CareerTrack } from "../src/lib/careerTracks";
import { assistantConfigured } from "../src/lib/assistant/llm";
import { isDemoAccountEmail } from "../src/lib/demoAccounts";

const urlFlag = process.argv.indexOf("--url");
const BASE = (urlFlag !== -1 ? process.argv[urlFlag + 1] : "http://localhost:3000").replace(/\/$/, "");

let passed = 0;
let failed = 0;
let warned = 0;
const manual: string[] = [];

function pass(label: string, detail = "") {
  console.log(`  PASS  ${label}${detail ? ` — ${detail}` : ""}`);
  passed++;
}
function fail(label: string, detail = "") {
  console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
  failed++;
}
function warn(label: string, detail = "") {
  console.log(`  WARN  ${label}${detail ? ` — ${detail}` : ""}`);
  warned++;
}
function assert(condition: boolean, label: string, detail = "") {
  if (condition) pass(label, detail);
  else fail(label, detail);
}

/** Public routes that must render for an unauthenticated visitor. */
const PUBLIC_ROUTES = [
  "/",
  "/impact",
  "/standards",
  "/knowledge-base",
  "/workforce-intelligence",
  "/team",
  "/support",
  "/login",
  "/login/demo",
  "/policies/privacy",
  "/policies/responsible-ai",
  "/policies/terms",
  "/policies/accessibility",
  "/sitemap.xml",
];

async function checkRoutes() {
  console.log(`\n=== PUBLIC ROUTES (${BASE}) ===`);
  for (const route of PUBLIC_ROUTES) {
    try {
      const response = await fetch(`${BASE}${route}`, { redirect: "follow" });
      assert(response.ok, `GET ${route}`, `${response.status}`);
    } catch (error) {
      fail(`GET ${route}`, (error as Error).message);
    }
  }

  // The assistant must refuse an anonymous caller.
  try {
    const response = await fetch(`${BASE}/api/assistant`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: "hello", history: [] }),
    });
    assert(response.status === 401, "POST /api/assistant rejects anonymous", `${response.status}`);
  } catch (error) {
    fail("POST /api/assistant rejects anonymous", (error as Error).message);
  }

  // An authenticated portal must not render to an anonymous visitor.
  try {
    const response = await fetch(`${BASE}/admin/governance`, { redirect: "manual" });
    const body = response.status < 400 ? await response.text() : "";
    const leaks = body.includes("Scenario simulator") || body.includes("Decision audit trail");
    assert(!leaks, "anonymous cannot read /admin/governance", leaks ? "PRIVILEGED CONTENT RENDERED" : "no privileged content in the response");
  } catch (error) {
    fail("anonymous cannot read /admin/governance", (error as Error).message);
  }
}

async function loadTracks(): Promise<CareerTrack[]> {
  const rows = await prisma.careerTrack.findMany({
    include: { trackSkills: { include: { skill: true } }, trackCerts: { include: { certification: true } } },
    orderBy: { label: "asc" },
  });
  if (!rows.length) return CAREER_TRACKS;
  return rows.map(row => ({
    id: row.id,
    label: row.label,
    recommendedExperienceMonths: row.recommendedExperienceMonths,
    technicalSkills: row.trackSkills
      .filter(entry => entry.category === "technical")
      .map(entry => ({ name: entry.skill.name, weight: Math.min(3, Math.max(1, entry.weight)) as 1 | 2 | 3 })),
    softSkills: row.trackSkills
      .filter(entry => entry.category === "soft")
      .map(entry => ({ name: entry.skill.name, weight: Math.min(3, Math.max(1, entry.weight)) as 1 | 2 | 3 })),
    certifications: row.trackCerts.map(entry => entry.certification.name),
  }));
}

async function checkSchema() {
  console.log("\n=== DATABASE SCHEMA ===");
  const database = process.env.DATABASE_URL ?? "(unset)";
  console.log(`  reading: ${database.startsWith("libsql") ? database.split("?")[0] : database}`);

  const tables: { model: string; count: () => Promise<number> }[] = [
    { model: "User", count: () => prisma.user.count() },
    { model: "Student", count: () => prisma.student.count() },
    { model: "Employer", count: () => prisma.employer.count() },
    { model: "University", count: () => prisma.university.count() },
    { model: "Job", count: () => prisma.job.count() },
    { model: "Offering", count: () => prisma.offering.count() },
    { model: "CareerTrack", count: () => prisma.careerTrack.count() },
    { model: "Skill", count: () => prisma.skill.count() },
    { model: "EvidenceDocument", count: () => prisma.evidenceDocument.count() },
    { model: "GovernanceScenario", count: () => prisma.governanceScenario.count() },
    { model: "MonitoringSnapshot", count: () => prisma.monitoringSnapshot.count() },
    { model: "Appeal", count: () => prisma.appeal.count() },
    { model: "DataRequest", count: () => prisma.dataRequest.count() },
    { model: "AuditEvent", count: () => prisma.auditEvent.count() },
  ];

  for (const table of tables) {
    try {
      const count = await table.count();
      pass(`table ${table.model} queryable`, `${count} row(s)`);
    } catch (error) {
      fail(`table ${table.model} queryable`, (error as Error).message.split("\n")[0]);
    }
  }
}

async function checkDemoData() {
  console.log("\n=== DEMO DATA ===");

  const users = await prisma.user.findMany({ select: { email: true, role: true, active: true } });
  const demoUsers = users.filter(user => user.active && isDemoAccountEmail(user.email));
  assert(demoUsers.length >= 4, "prepared demo accounts present", `${demoUsers.length} openable account(s)`);

  for (const role of ["STUDENT", "EMPLOYER", "UNIVERSITY", "ADMIN"] as const) {
    const count = demoUsers.filter(user => user.role === role).length;
    assert(count > 0, `demo ${role.toLowerCase()} account exists`, `${count}`);
  }

  const openJobs = await prisma.job.count({ where: { status: "open" } });
  assert(openJobs > 0, "open roles exist", `${openJobs}`);

  const applications = await prisma.application.count();
  assert(applications > 0, "applications exist", `${applications}`);

  const approvedEmployers = await prisma.employer.count({ where: { verificationStatus: "APPROVED" } });
  assert(approvedEmployers > 0, "at least one approved employer", `${approvedEmployers} approved`);
}

async function checkIntelligence() {
  console.log("\n=== INTELLIGENCE AND SUPPRESSION ===");

  const [students, universities, tracks] = await Promise.all([
    prisma.student.findMany({
      select: {
        targetCareer: true,
        university: true,
        skills: { include: { skill: true } },
        certifications: { include: { certification: true } },
        experiences: true,
        projects: true,
      },
    }),
    prisma.university.findMany(),
    loadTracks(),
  ]);

  assert(tracks.length > 0, "career taxonomy loaded", `${tracks.length} track(s)`);

  for (const university of universities) {
    const cohort = computeCohortReadiness({ students, tracks, institution: university.institution });

    if (!cohort.reportable) {
      warn(
        `${university.institution}: cohort below the floor`,
        `${cohort.students} student(s); the university pages will show only the suppression notice`,
      );
      continue;
    }

    const reportableTracks = cohort.tracks.filter(track => !track.suppressed).length;
    const withheldTracks = cohort.tracks.filter(track => track.suppressed).length;

    assert(
      cohort.averageScore !== null,
      `${university.institution}: readiness computes`,
      `avg ${cohort.averageScore}/100 across ${cohort.students} student(s)`,
    );
    assert(
      reportableTracks > 0,
      `${university.institution}: some career tracks are reportable`,
      `${reportableTracks} reportable, ${withheldTracks} withheld`,
    );
    if (withheldTracks === 0) {
      warn(
        `${university.institution}: nothing is being suppressed`,
        "the suppression control will not be visible on this institution's pages",
      );
    } else {
      pass(`${university.institution}: suppression visible`, `${cohort.suppressedGroupCount} group(s) withheld`);
    }

    const leaks = [...cohort.bands, ...cohort.tracks].filter(
      group => !group.suppressed && "students" in group && (group.students ?? MIN_COHORT) < MIN_COHORT,
    );
    assert(leaks.length === 0, `${university.institution}: no group published below ${MIN_COHORT}`, `${leaks.length} leak(s)`);
  }
}

async function checkGovernance() {
  console.log("\n=== GOVERNANCE ===");

  const scenarios = await prisma.governanceScenario.count();
  assert(scenarios > 0, "governance scenarios seeded", `${scenarios}`);

  const overridden = await prisma.governanceScenario.count({ where: { humanDecision: "OVERRIDDEN" } });
  assert(overridden > 0, "at least one recorded human override", `${overridden}`);

  const snapshots = await prisma.monitoringSnapshot.findMany({ orderBy: { createdAt: "asc" } });
  assert(snapshots.length > 0, "monitoring snapshots present", `${snapshots.length}`);
  const statuses = [...new Set(snapshots.map(snapshot => snapshot.status))];
  assert(statuses.includes("PAUSED"), "a PAUSED state is demonstrable", statuses.join(" → "));

  const appeals = await prisma.appeal.count();
  assert(appeals > 0, "appeals present", `${appeals}`);
  const resolvedAppeals = await prisma.appeal.count({ where: { status: "RESOLVED" } });
  assert(resolvedAppeals > 0, "at least one resolved appeal", `${resolvedAppeals}`);

  const requests = await prisma.dataRequest.groupBy({ by: ["type"], _count: { _all: true } });
  assert(requests.length >= 3, "data request types represented", requests.map(entry => entry.type).join(", "));

  const audits = await prisma.auditEvent.count();
  assert(audits > 0, "audit trail populated", `${audits} event(s)`);

  // Every scenario must be readable by the page that renders them.
  const rows = await prisma.governanceScenario.findMany({ select: { detectedIssues: true, title: true } });
  const { parseIssues } = await import("../src/lib/governanceIssues");
  const unreadable = rows.filter(row => parseIssues(row.detectedIssues).length === 0);
  assert(unreadable.length === 0, "every scenario's issues parse", unreadable.length ? unreadable.map(r => r.title).join(", ") : `${rows.length} scenario(s) readable`);
}

async function checkEvidence() {
  console.log("\n=== EVIDENCE PIPELINE ===");
  const documents = await prisma.evidenceDocument.findMany();
  assert(documents.length > 0, "evidence documents present", `${documents.length}`);

  const analysed = documents.filter(document => document.aiStatus === "COMPLETED").length;
  const approved = documents.filter(document => document.reviewStatus === "APPROVED").length;
  const pending = documents.filter(document => document.reviewStatus === "PENDING").length;
  pass("review workflow states represented", `${analysed} analysed · ${approved} approved · ${pending} pending`);

  const autoApproved = documents.filter(
    document => document.reviewStatus === "APPROVED" && !document.reviewedBy,
  );
  assert(autoApproved.length === 0, "no document approved without a named reviewer", `${autoApproved.length}`);
}

function checkConfiguration() {
  console.log("\n=== CONFIGURATION ===");

  if (assistantConfigured()) {
    pass("assistant configured", "ASSISTANT_AI_URL and a credential are present");
  } else {
    warn(
      "assistant NOT configured",
      "ASSISTANT_AI_URL is unset, so the assistant panel is hidden and /api/assistant returns 503",
    );
    manual.push("Set ASSISTANT_AI_URL (and deploy the Worker's /assistant route), then re-run this script.");
  }

  const evidenceConfigured = Boolean(process.env.EVIDENCE_AI_URL && process.env.EVIDENCE_AI_SECRET);
  if (evidenceConfigured) pass("evidence AI configured", "EVIDENCE_AI_URL and secret present");
  else warn("evidence AI NOT configured", "document uploads will store but not be analysed");

  const r2 = Boolean(process.env.R2_ACCOUNT_ID && process.env.R2_BUCKET_NAME && process.env.R2_ACCESS_KEY_ID);
  if (r2) pass("R2 storage configured", process.env.R2_BUCKET_NAME);
  else warn("R2 storage NOT configured", "evidence upload will fail in this environment");

  if (process.env.SESSION_SECRET) pass("SESSION_SECRET set", "session cookies signed with a dedicated key");
  else warn("SESSION_SECRET unset", "cookies are signed with the Worker credential as a fallback key");
}

async function main() {
  console.log("Fursah deployment smoke test");
  console.log(`HTTP target : ${BASE}`);

  await checkRoutes();
  await checkSchema();
  await checkDemoData();
  await checkIntelligence();
  await checkGovernance();
  await checkEvidence();
  checkConfiguration();

  console.log("\n=== STILL NEEDS A BROWSER ===");
  const browserOnly = [
    "Sign in through /login/demo as a student, employer, university and admin and confirm each dashboard renders.",
    "Ask the assistant a question on each dashboard (needs the assistant configured) and confirm it answers from page figures.",
    "Upload a document on /student/profile and confirm it reaches /admin/evidence with an extraction and no verified status.",
    "Approve and reject a document in /admin/evidence and confirm the decision reaches the student's profile.",
    "Toggle Arabic on a public page and a portal page and confirm layout mirrors correctly.",
    "Check the university pages show ⊘ withheld markers rather than missing rows.",
    ...manual,
  ];
  for (const item of browserOnly) console.log(`  MANUAL  ${item}`);

  console.log(`\n${failed === 0 ? "SMOKE TEST PASSED" : "SMOKE TEST FAILED"} — ${passed} passed, ${failed} failed, ${warned} warning(s), ${browserOnly.length} manual check(s)`);
  process.exitCode = failed === 0 ? 0 : 1;
}

main()
  .catch(error => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
