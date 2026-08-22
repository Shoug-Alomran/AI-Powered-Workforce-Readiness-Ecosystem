/**
 * Live assistant round-trip.
 *
 * scripts/verify-assistant.ts checks the grounding contract and the pack handed
 * to the model. This one sends real questions to the real Worker as each role,
 * over the app's own /api/assistant route, so the session, the role scoping,
 * the rate limiter, the audit write and the model call are all exercised
 * together rather than asserted about.
 *
 *   npx tsx --require ./scripts/allow-server-only.cjs scripts/verify-assistant-live.ts
 *   npx tsx --require ./scripts/allow-server-only.cjs scripts/verify-assistant-live.ts --url http://localhost:3111
 *
 * Requires ASSISTANT_AI_URL and a shared secret (ASSISTANT_AI_SECRET, falling
 * back to EVIDENCE_AI_SECRET) that matches the Worker's. Without the secret the
 * Worker answers 401 and this script reports exactly that rather than passing
 * silently: an unverified assistant must not look verified.
 *
 * Grounding is judged mechanically, not by reading the prose: every number in
 * the answer must appear in the grounding pack that was sent. A model that
 * invents a figure fails here even if the sentence around it reads well.
 */
import { createHmac } from "node:crypto";
import { prisma } from "../src/lib/db";
import { buildStudentContext, buildEmployerContext, buildUniversityContext } from "../src/lib/assistant/context";
import { assistantConfigured } from "../src/lib/assistant/llm";

const urlFlag = process.argv.indexOf("--url");
const BASE = (urlFlag !== -1 ? process.argv[urlFlag + 1] : "http://localhost:3111").replace(/\/$/, "");

let passed = 0;
let failed = 0;
let skipped = 0;

function pass(label: string, detail = "") { console.log(`  PASS  ${label}${detail ? ` — ${detail}` : ""}`); passed++; }
function fail(label: string, detail = "") { console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ""}`); failed++; }
function skip(label: string, detail = "") { console.log(`  SKIP  ${label}${detail ? ` — ${detail}` : ""}`); skipped++; }

/** The app signs its session cookie with this; mirrored so the script can sign in. */
function sessionCookie(userId: string) {
  const key = process.env.SESSION_SECRET || process.env.EVIDENCE_AI_SECRET || process.env.ASSISTANT_AI_SECRET || "fursah-development-session-key";
  const signature = createHmac("sha256", key).update(userId).digest("base64url");
  return `fursa_uid=${userId}.${signature}`;
}

type Ask = { answer: string; model?: string; role?: string; error?: string; status: number };

async function ask(userId: string, question: string, history: Array<{ role: string; content: string }> = []): Promise<Ask> {
  const response = await fetch(`${BASE}/api/assistant`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: sessionCookie(userId) },
    body: JSON.stringify({ question, history }),
  });
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  return {
    answer: String(payload.answer ?? ""),
    model: payload.model as string | undefined,
    role: payload.role as string | undefined,
    error: payload.error as string | undefined,
    status: response.status,
  };
}

/** Every number the model stated, so each can be checked against the pack. */
function numbersIn(text: string): string[] {
  return [...text.matchAll(/\d+(?:\.\d+)?/g)].map((match) => match[0]);
}

/**
 * A number is grounded when it appears in the serialized pack. Small integers
 * are excluded: "one", "3 things", a year, or a list position are ordinary
 * prose and checking them produces noise rather than signal.
 */
function ungroundedNumbers(answer: string, facts: string): string[] {
  return numbersIn(answer).filter((value) => Number(value) > 3 && !facts.includes(value));
}

async function runRole(
  label: string,
  userId: string,
  facts: string,
  questions: string[],
  forbidden: { term: string; why: string }[],
) {
  console.log(`\n=== ${label} ===`);
  for (const question of questions) {
    const result = await ask(userId, question);

    if (result.status !== 200) {
      fail(`Q: ${question}`, `HTTP ${result.status} — ${result.error ?? "no body"}`);
      continue;
    }

    const ungrounded = ungroundedNumbers(result.answer, facts);
    const leaked = forbidden.filter((entry) => result.answer.toLowerCase().includes(entry.term.toLowerCase()));

    if (leaked.length) {
      fail(`Q: ${question}`, `disclosed ${leaked.map((entry) => `${entry.term} (${entry.why})`).join(", ")}`);
      continue;
    }
    if (ungrounded.length) {
      fail(`Q: ${question}`, `figure(s) not present in the grounding pack: ${ungrounded.join(", ")}`);
      continue;
    }
    pass(`Q: ${question}`, `${result.model ?? "model"} · ${result.answer.replace(/\s+/g, " ").slice(0, 110)}`);
  }
}

async function main() {
  console.log(`Assistant round-trip against ${BASE}`);

  if (!assistantConfigured()) {
    console.log(
      "\n  ASSISTANT_AI_URL and a shared secret are required.\n" +
        "  ASSISTANT_AI_URL is " + (process.env.ASSISTANT_AI_URL ? "set" : "NOT set") + "; " +
        "the shared secret (ASSISTANT_AI_SECRET or EVIDENCE_AI_SECRET) is " +
        (process.env.ASSISTANT_AI_SECRET || process.env.EVIDENCE_AI_SECRET ? "set" : "NOT set") + ".\n",
    );
    skip("live assistant round-trip", "assistant not configured in this environment");
    console.log(`\n${skipped} check(s) skipped. Set the secret and re-run to verify the model itself.`);
    return;
  }

  const [student, employer, university] = await Promise.all([
    prisma.student.findFirst({ where: { user: { email: "khalid.alharbi@example.com" } }, include: { user: true } }),
    prisma.employer.findFirst({ where: { user: { email: "careers@sanadsecure.sa" } }, include: { user: true } }),
    prisma.university.findFirst({ where: { user: { email: "workforce@ksu.edu.sa" } }, include: { user: true } }),
  ]);

  if (!student || !employer || !university) {
    fail("demo accounts present", "seed the demo data first");
    return;
  }

  // Names that must never appear in an answer for the role in question.
  const otherStudents = await prisma.student.findMany({
    where: { NOT: { id: student.id } },
    include: { user: { select: { name: true, email: true } } },
    take: 40,
  });

  const studentFacts = JSON.stringify((await buildStudentContext(student.id)).facts);
  const employerFacts = JSON.stringify((await buildEmployerContext(employer.id)).facts);
  const universityFacts = JSON.stringify((await buildUniversityContext(university.id)).facts);

  await runRole(
    "STUDENT — Khalid Al-Harbi",
    student.userId,
    studentFacts,
    [
      "Why is my readiness score what it is?",
      "What should I work on next?",
      "Why isn't my pending certificate counted?",
      "Which job am I closest to qualifying for?",
      "What evidence would improve my readiness the most?",
      "Are you suggesting a different career direction for me, and why?",
    ],
    otherStudents
      .filter((entry) => entry.user.name !== student.user.name)
      .map((entry) => ({ term: entry.user.email, why: "another student's address" })),
  );

  await runRole(
    "EMPLOYER — Sanad Secure",
    employer.userId,
    employerFacts,
    [
      "Why is this role hard to fill?",
      "Which requirement is causing the largest talent gap?",
      "What are applicants most often unable to evidence?",
      "Explain the strongest candidate's match against this role.",
    ],
    // A non-applicant's name must never surface to an employer.
    otherStudents
      .filter((entry) => !employerFacts.includes(entry.user.name))
      .slice(0, 25)
      .map((entry) => ({ term: entry.user.name, why: "a student who did not apply to this employer" })),
  );

  await runRole(
    "UNIVERSITY — King Saud University",
    university.userId,
    universityFacts,
    [
      "What is our largest curriculum gap?",
      "Why is that recommendation being made?",
      "Which skills have employer demand but no curriculum coverage here?",
      "What should we prioritise next term?",
    ],
    otherStudents.slice(0, 25).map((entry) => ({ term: entry.user.name, why: "an individual student identity" })),
  );

  // ---- Freshness: the same question before and after a decision -----------
  console.log("\n=== FRESHNESS: the same question across a verification decision ===");
  const pending = await prisma.studentCertification.findFirst({
    where: { verificationStatus: "PENDING" },
    include: { student: { include: { user: true } }, certification: true },
  });

  if (!pending) {
    skip("freshness across an approval", "no pending certification to decide on");
  } else {
    const question = "How many of my certifications count toward my readiness score right now?";
    const before = await ask(pending.student.userId, question);
    const admin = await prisma.user.findFirstOrThrow({ where: { role: "ADMIN" } });
    const original = { status: pending.verificationStatus, reviewedAt: pending.reviewedAt, reviewedBy: pending.reviewedBy, note: pending.reviewNote };

    try {
      await prisma.studentCertification.update({
        where: { id: pending.id },
        data: { verificationStatus: "APPROVED", reviewedAt: new Date(), reviewedBy: admin.id, reviewNote: "Approved during a live assistant freshness check." },
      });
      const after = await ask(pending.student.userId, question);

      const afterFacts = JSON.stringify((await buildStudentContext(pending.studentId)).facts);
      const stillPending = /pending|not (yet )?verified|unverified/i.test(after.answer);

      if (before.status !== 200 || after.status !== 200) {
        fail("freshness across an approval", `HTTP ${before.status}/${after.status}`);
      } else if (ungroundedNumbers(after.answer, afterFacts).length) {
        fail("freshness across an approval", "the later answer quotes a figure absent from the refreshed pack");
      } else if (stillPending) {
        fail("freshness across an approval", `answer still describes the credential as pending: "${after.answer.slice(0, 120)}"`);
      } else {
        pass("freshness across an approval", `before: "${before.answer.slice(0, 70)}" / after: "${after.answer.slice(0, 70)}"`);
      }
    } finally {
      // The demo state is restored whether or not the assertions held.
      await prisma.studentCertification.update({
        where: { id: pending.id },
        data: { verificationStatus: original.status, reviewedAt: original.reviewedAt, reviewedBy: original.reviewedBy, reviewNote: original.note },
      });
    }
  }

  console.log(`\n${failed === 0 ? "ALL LIVE ASSISTANT CHECKS PASSED" : `${failed} LIVE ASSISTANT CHECK(S) FAILED`} · ${passed} passed, ${skipped} skipped`);
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
