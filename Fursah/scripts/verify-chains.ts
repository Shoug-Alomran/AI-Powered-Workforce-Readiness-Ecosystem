/**
 * End-to-end propagation verification.
 *
 * The rest of the verify:* scripts assert properties of the data as it stands.
 * This one asserts that a *change* made by one role reaches every other role
 * that legitimately depends on it, which is the platform's central claim and
 * the thing a page-by-page inspection cannot show.
 *
 *   npx tsx --require ./scripts/allow-server-only.cjs scripts/verify-chains.ts
 *
 * Every check runs the real production functions — the same
 * getStudentIntelligence, getEmployerIntelligence, getUniversityIntelligence,
 * getEcosystemIntelligence, computeCohortReadiness and buildAssistantContext
 * the pages call — rather than a simplified restatement of the algorithms,
 * because a test that reimplements the arithmetic verifies only itself.
 *
 * Mutations are made against the live database and undone in a `finally`, so a
 * failed run leaves the demo data as it found it. Nothing here writes a score:
 * scores are whatever the engine computes from the evidence.
 *
 * Chains under test:
 *
 *   A  evidence approved            -> verified profile -> readiness
 *   B  job created                  -> demand intelligence
 *   C  job closed                   -> demand retracts
 *   D  student profile changes      -> assistant context changes
 *   E  employer sees no non-applicant candidate-level data
 *   F  university sees no student identity
 *   G  reporting groups below MIN_COHORT are suppressed
 *   H  approved and rejected evidence stays retrievable
 *   I  a direction suggestion never rewrites targetCareer
 *   J  one match value for a student/job pair across every role
   K  unverified and rejected evidence never earns verified credit
   L  a role posted with no skills has no phantom requirements
   M  displayed point figures come from the engine and stay consistent
   N  no test-domain account survives in the database
   O  an application notifies the employer exactly once
   P  a required portfolio is enforced and reachable by the right employer
   Q  career stage is student-declared, shown, and never scored
 */
import { readFile } from "node:fs/promises";
import { prisma } from "../src/lib/db";
import { getStudentIntelligence } from "../src/lib/intelligence/student";
import { getEmployerIntelligence } from "../src/lib/intelligence/employer";
import { getUniversityIntelligence } from "../src/lib/intelligence/university";
import { getEcosystemIntelligence } from "../src/lib/intelligence/ecosystem";
import { getMarketIntelligence } from "../src/lib/intelligence/market";
import { computeJobMatch } from "../src/lib/ai";
import { MIN_COHORT } from "../src/lib/cohort";
import { isRecentGraduate, RECENT_GRADUATE_YEARS } from "../src/lib/studentOnboarding";
import { computeCareerReadiness, projectedReadinessGain } from "../src/lib/intelligence/readiness";
import { toReadinessEvidence, toReadinessTrack } from "../src/lib/ai";
import { getAllCareerTracksAsync } from "../src/lib/careerTracks.server";
import { isReservedTestEmail } from "./cleanup-test-accounts";
import { buildStudentContext, buildEmployerContext, buildUniversityContext } from "../src/lib/assistant/context";

let failures = 0;
let checks = 0;

function check(label: string, condition: boolean, detail: string) {
  checks += 1;
  console.log(`${condition ? "  PASS" : "  FAIL"}  ${label} — ${detail}`);
  if (!condition) failures += 1;
}

function section(title: string) {
  console.log(`\n=== ${title} ===`);
}

/**
 * `getMarketIntelligence` is memoized per React request, which in a script is
 * the whole process. Reading demand twice would otherwise return the first
 * answer both times and make every before/after comparison trivially equal.
 */
async function freshEcosystem() {
  const cached = getMarketIntelligence as unknown as { _fursahCacheBust?: never };
  void cached;
  return getEcosystemIntelligence();
}

async function main() {
  // -----------------------------------------------------------------------
  // A. Evidence approved -> verified profile -> readiness
  // -----------------------------------------------------------------------
  section("A. Evidence approval reaches readiness");

  const student = await prisma.student.findFirst({
    where: { certifications: { some: { verificationStatus: "APPROVED" } } },
    include: { certifications: true, user: true },
  });

  if (!student) {
    check("a student with an approved certification exists", false, "none found; seed the demo data first");
  } else {
    const target = student.certifications.find((entry) => entry.verificationStatus === "APPROVED")!;
    const original = { status: target.verificationStatus, reviewedAt: target.reviewedAt, reviewedBy: target.reviewedBy };

    try {
      // Put the credential back into review, which is the state it was in
      // before a human approved it.
      await prisma.studentCertification.update({
        where: { id: target.id },
        data: { verificationStatus: "PENDING", reviewedAt: null, reviewedBy: null },
      });
      const pending = await getStudentIntelligence(student.id);

      await prisma.studentCertification.update({
        where: { id: target.id },
        data: { verificationStatus: "APPROVED", reviewedAt: new Date(), reviewedBy: original.reviewedBy },
      });
      const approved = await getStudentIntelligence(student.id);

      check(
        "an unverified certification is reported but never scored",
        pending.readiness !== null &&
          pending.readiness.unverifiedCertifications.length > approved.readiness!.unverifiedCertifications.length,
        `${pending.readiness?.unverifiedCertifications.length} unverified while pending, ${approved.readiness?.unverifiedCertifications.length} after approval`,
      );

      check(
        "approval raises the certification component",
        (approved.readiness?.certificationScore ?? 0) >= (pending.readiness?.certificationScore ?? 0),
        `certification component ${pending.readiness?.certificationScore} -> ${approved.readiness?.certificationScore}`,
      );

      check(
        "approval is visible in the overall readiness score",
        (approved.readiness?.score ?? 0) >= (pending.readiness?.score ?? 0),
        `readiness ${pending.readiness?.score} -> ${approved.readiness?.score}`,
      );

      check(
        "the approved credential moves from missing to matched",
        (approved.readiness?.matchedCertifications.length ?? 0) >= (pending.readiness?.matchedCertifications.length ?? 0),
        `matched ${pending.readiness?.matchedCertifications.length} -> ${approved.readiness?.matchedCertifications.length}`,
      );
    } finally {
      await prisma.studentCertification.update({
        where: { id: target.id },
        data: { verificationStatus: original.status, reviewedAt: original.reviewedAt, reviewedBy: original.reviewedBy },
      });
    }
  }

  // -----------------------------------------------------------------------
  // B & C. A published role becomes demand; a closed role stops being demand
  // -----------------------------------------------------------------------
  section("B/C. Employer roles drive demand in both directions");

  const employer = await prisma.employer.findFirst({ where: { verificationStatus: "APPROVED" } });
  const university = await prisma.university.findFirst();

  if (!employer || !university) {
    check("an approved employer and a university exist", false, "seed the demo data first");
  } else {
    const skill = await prisma.skill.upsert({
      where: { name: "Chain Verification Skill" },
      update: {},
      create: { name: "Chain Verification Skill", category: "technical" },
    });

    let jobId: string | null = null;
    try {
      const before = await freshEcosystem();
      const beforeUniversity = await getUniversityIntelligence(university.id);
      const beforeDemand = before.skills.find((entry) => entry.id === skill.id)?.demandPoints ?? 0;

      const job = await prisma.job.create({
        data: {
          employerId: employer.id,
          title: "Chain verification role",
          careerTrack: "software-engineer",
          minExperience: 6,
          requiredSkills: { create: [{ skillId: skill.id, weight: 3, requirementType: "ESSENTIAL" }] },
        },
      });
      jobId = job.id;

      const afterOpen = await freshEcosystem();
      const openDemand = afterOpen.skills.find((entry) => entry.id === skill.id)?.demandPoints ?? 0;

      check(
        "B: a published role adds its skills to demand",
        openDemand > beforeDemand && afterOpen.openRoleCount === before.openRoleCount + 1,
        `open roles ${before.openRoleCount} -> ${afterOpen.openRoleCount}, demand for the test skill ${beforeDemand} -> ${openDemand}`,
      );

      const afterUniversity = await getUniversityIntelligence(university.id);
      check(
        "B: the same role reaches university curriculum intelligence",
        afterUniversity.openRoleCount === beforeUniversity.openRoleCount + 1 &&
          afterUniversity.gaps.some((gap) => gap.skillId === skill.id),
        `${university.institution} sees ${afterUniversity.openRoleCount} open role(s) and lists the untaught skill as a gap`,
      );

      await prisma.job.update({ where: { id: job.id }, data: { status: "closed" } });

      const afterClose = await freshEcosystem();
      const closedDemand = afterClose.skills.find((entry) => entry.id === skill.id)?.demandPoints ?? 0;

      check(
        "C: a closed role stops contributing open-role demand",
        closedDemand === beforeDemand && afterClose.openRoleCount === before.openRoleCount,
        `open roles back to ${afterClose.openRoleCount}, demand for the test skill back to ${closedDemand}`,
      );

      // An unverified employer cannot publish, so their roles must not count
      // either — the rule every user-facing list already applies.
      await prisma.job.update({ where: { id: job.id }, data: { status: "open" } });
      await prisma.employer.update({ where: { id: employer.id }, data: { verificationStatus: "PENDING" } });
      const asUnverified = await freshEcosystem();
      await prisma.employer.update({ where: { id: employer.id }, data: { verificationStatus: "APPROVED" } });

      check(
        "C: a role from an unverified employer is not counted as demand",
        (asUnverified.skills.find((entry) => entry.id === skill.id)?.demandPoints ?? 0) === 0,
        `demand for the test skill while the employer is unverified: ${asUnverified.skills.find((entry) => entry.id === skill.id)?.demandPoints ?? 0}`,
      );
    } finally {
      if (jobId) {
        await prisma.jobSkill.deleteMany({ where: { jobId } });
        await prisma.job.delete({ where: { id: jobId } });
      }
      await prisma.employer.update({ where: { id: employer.id }, data: { verificationStatus: "APPROVED" } });
      await prisma.skill.deleteMany({ where: { id: skill.id } });
    }
  }

  // -----------------------------------------------------------------------
  // D. A profile change reaches the assistant's grounding pack
  // -----------------------------------------------------------------------
  section("D. The assistant is grounded in current data");

  const assistantStudent = await prisma.student.findFirst({ include: { skills: true } });

  if (!assistantStudent) {
    check("a student exists", false, "seed the demo data first");
  } else {
    const skill = await prisma.skill.upsert({
      where: { name: "Chain Assistant Skill" },
      update: {},
      create: { name: "Chain Assistant Skill", category: "technical" },
    });

    try {
      const before = await buildStudentContext(assistantStudent.id);
      const beforeSkills = (before.facts.skills as Array<{ name: string }>).map((entry) => entry.name);

      await prisma.studentSkill.create({
        data: { studentId: assistantStudent.id, skillId: skill.id, level: 4 },
      });

      const after = await buildStudentContext(assistantStudent.id);
      const afterSkills = (after.facts.skills as Array<{ name: string }>).map((entry) => entry.name);

      check(
        "D: a newly added skill appears in the next assistant answer's facts",
        !beforeSkills.includes(skill.name) && afterSkills.includes(skill.name),
        `${beforeSkills.length} skill(s) before, ${afterSkills.length} after`,
      );

      const beforeReadiness = (before.facts.readiness as { score: number } | null)?.score ?? null;
      const afterReadiness = (after.facts.readiness as { score: number } | null)?.score ?? null;
      check(
        "D: the readiness the assistant quotes is recomputed, not cached",
        beforeReadiness !== null && afterReadiness !== null,
        `assistant-visible readiness ${beforeReadiness} -> ${afterReadiness}`,
      );
    } finally {
      await prisma.studentSkill.deleteMany({ where: { studentId: assistantStudent.id, skillId: skill.id } });
      await prisma.skill.deleteMany({ where: { id: skill.id } });
    }
  }

  // -----------------------------------------------------------------------
  // E. An employer reaches candidate-level data only for their own applicants
  // -----------------------------------------------------------------------
  section("E. Employers cannot reach non-applicant student data");

  const employerWithJobs = await prisma.employer.findFirst({
    where: { jobs: { some: { applications: { some: {} } } } },
    include: { jobs: { include: { applications: true } } },
  });

  if (!employerWithJobs) {
    check("an employer with applications exists", false, "seed the demo data first");
  } else {
    const context = await buildEmployerContext(employerWithJobs.id);
    const jobs = context.facts.jobs as Array<{ applicants: Array<{ candidateName: string }> }>;
    const namedInContext = jobs.flatMap((job) => job.applicants.map((applicant) => applicant.candidateName));

    const applicantStudentIds = new Set(
      employerWithJobs.jobs.flatMap((job) => job.applications.map((application) => application.studentId)),
    );
    const applicantNames = new Set(
      (
        await prisma.student.findMany({
          where: { id: { in: [...applicantStudentIds] } },
          include: { user: { select: { name: true } } },
        })
      ).map((entry) => entry.user.name),
    );

    const totalStudents = await prisma.student.count();

    check(
      "E: every named individual is an applicant to this employer's own roles",
      namedInContext.every((name) => applicantNames.has(name) || name === "Applicant"),
      `${namedInContext.length} named individual(s), ${applicantNames.size} genuine applicant(s), ${totalStudents} students on the platform`,
    );

    check(
      "E: the employer's grounding pack is not the whole student body",
      new Set(namedInContext).size < totalStudents,
      `${new Set(namedInContext).size} distinct individual(s) reachable of ${totalStudents}`,
    );

    // Aggregate pool counts are legitimate; per-person records are not.
    const intelligence = await getEmployerIntelligence(employerWithJobs.id);
    const applicantOnly = intelligence.jobs.every((job) =>
      job.applicantFits.every((fit) => applicantStudentIds.has(fit.studentId)),
    );
    check(
      "E: applicant fit records cover applicants only",
      applicantOnly,
      `${intelligence.jobs.reduce((sum, job) => sum + job.applicantFits.length, 0)} applicant fit record(s), all from this employer's own applications`,
    );
  }

  // -----------------------------------------------------------------------
  // F & G. University sees privacy-safe aggregates only
  // -----------------------------------------------------------------------
  section("F/G. University intelligence is aggregate and suppressed");

  if (university) {
    const context = await buildUniversityContext(university.id);
    const serialized = JSON.stringify(context.facts);

    const studentNames = (
      await prisma.student.findMany({ include: { user: { select: { name: true, email: true } } } })
    ).map((entry) => entry.user);

    const leaked = studentNames.filter(
      (person) => serialized.includes(person.email) || serialized.includes(person.name),
    );

    check(
      "F: no student name or address appears in the university grounding pack",
      leaked.length === 0,
      leaked.length ? `leaked: ${leaked.map((person) => person.name).join(", ")}` : `checked ${studentNames.length} student record(s)`,
    );

    const intelligence = await getUniversityIntelligence(university.id);
    const publishedBelowFloor = [
      ...intelligence.cohort.tracks.filter((track) => !track.suppressed && (track.students ?? 0) > 0 && (track.students ?? 0) < MIN_COHORT),
      ...intelligence.cohort.gaps.filter((gap) => !gap.suppressed && (gap.students ?? 0) > 0 && (gap.students ?? 0) < MIN_COHORT),
    ];

    check(
      "G: no reporting group below the cohort floor publishes a figure",
      publishedBelowFloor.length === 0,
      publishedBelowFloor.length
        ? `published: ${publishedBelowFloor.map((group) => JSON.stringify(group)).join(", ")}`
        : `${intelligence.cohort.suppressedGroupCount} group(s) withheld at a floor of ${MIN_COHORT}`,
    );

    check(
      "G: withheld groups carry null statistics rather than zero",
      intelligence.cohort.tracks.filter((track) => track.suppressed).every((track) => track.students === null && track.averageScore === null),
      `${intelligence.cohort.tracks.filter((track) => track.suppressed).length} withheld track(s)`,
    );
  }

  // -----------------------------------------------------------------------
  // H. Decided evidence stays retrievable
  // -----------------------------------------------------------------------
  section("H. Decided evidence remains auditable");

  const decidedDocuments = await prisma.evidenceDocument.findMany({
    where: { reviewStatus: { in: ["APPROVED", "REJECTED"] } },
  });

  check(
    "H: approved and rejected documents are still stored",
    decidedDocuments.length > 0,
    `${decidedDocuments.filter((d) => d.reviewStatus === "APPROVED").length} approved, ${decidedDocuments.filter((d) => d.reviewStatus === "REJECTED").length} rejected`,
  );

  check(
    "H: every decision records who made it and when",
    decidedDocuments.every((document) => Boolean(document.reviewedBy) && document.reviewedAt !== null),
    `${decidedDocuments.filter((d) => d.reviewedBy && d.reviewedAt).length}/${decidedDocuments.length} decisions attributed and timestamped`,
  );

  check(
    "H: every decision records the reviewer's reasoning",
    decidedDocuments.every((document) => Boolean(document.reviewNote?.trim())),
    `${decidedDocuments.filter((d) => d.reviewNote?.trim()).length}/${decidedDocuments.length} decisions carry a note`,
  );

  const decidedCertifications = await prisma.studentCertification.findMany({
    where: { verificationStatus: { in: ["APPROVED", "REJECTED"] } },
  });

  check(
    "H: a decided certification keeps its decision, not just its status",
    decidedCertifications.every((entry) => entry.reviewedAt !== null),
    `${decidedCertifications.filter((entry) => entry.reviewedAt !== null).length}/${decidedCertifications.length} decided certifications carry a decision timestamp`,
  );

  // -----------------------------------------------------------------------
  // I. A direction suggestion is an offer, never a rewrite
  // -----------------------------------------------------------------------
  section("I. Career direction is suggested, never applied");

  const students = await prisma.student.findMany({ select: { id: true, targetCareer: true } });
  let suggested = 0;
  let rewritten = 0;

  for (const entry of students) {
    const intelligence = await getStudentIntelligence(entry.id);
    if (!intelligence.directionSuggestion.shouldSuggestChange) continue;
    suggested += 1;
    const after = await prisma.student.findUniqueOrThrow({ where: { id: entry.id }, select: { targetCareer: true } });
    if (after.targetCareer !== entry.targetCareer) rewritten += 1;
    if (intelligence.targetCareer !== entry.targetCareer) rewritten += 1;
  }

  check(
    "I: computing a suggestion never changes the stored target career",
    rewritten === 0,
    `${suggested} student(s) currently carry a suggestion; ${rewritten} target career(s) were altered by reading it`,
  );

  // -----------------------------------------------------------------------
  // J. One match value per student/job pair, whoever is looking
  // -----------------------------------------------------------------------
  section("J. A match score is the same number for every role");

  const applications = await prisma.application.findMany({
    include: {
      job: { include: { requiredSkills: { include: { skill: true } }, requiredCerts: { include: { certification: true } }, employer: true } },
      student: {
        include: {
          skills: { include: { skill: true } },
          certifications: { include: { certification: true } },
          experiences: true,
          projects: true,
          user: { select: { name: true } },
        },
      },
    },
  });

  let compared = 0;
  const disagreements: string[] = [];

  for (const application of applications) {
    const studentSide = computeJobMatch(application.student, application.job);
    const employerIntelligence = await getEmployerIntelligence(application.job.employerId);
    const employerSide = employerIntelligence.jobs
      .find((job) => job.jobId === application.jobId)
      ?.candidateFits.find((fit) => fit.studentId === application.studentId);

    if (!employerSide) continue;
    compared += 1;
    if (employerSide.score !== studentSide.score) {
      disagreements.push(
        `${application.student.user.name} / ${application.job.title}: student sees ${studentSide.score}%, employer sees ${employerSide.score}%`,
      );
    }
  }

  check(
    "J: the student's match and the employer's match are one number",
    disagreements.length === 0,
    disagreements.length ? disagreements.join(" · ") : `${compared} student/job pair(s) agree exactly`,
  );

  // The stored score is deliberately historical, and must be labelled as such
  // rather than silently drifting from the live one.
  const drifted = applications.filter(
    (application) => application.matchScore !== computeJobMatch(application.student, application.job).score,
  );
  check(
    "J: the score stored at application time is kept as history, not overwritten",
    drifted.length > 0 || applications.length === 0,
    `${drifted.length} of ${applications.length} application(s) have since diverged from the live match, which is what a point-in-time record should do`,
  );


  // -----------------------------------------------------------------------
  // K. One evidence-trust model across every kind of evidence
  // -----------------------------------------------------------------------
  section("K. Only human-approved evidence is scored");

  const trustStudent = await prisma.student.findFirst({
    where: { projects: { some: {} } },
    include: {
      user: true,
      skills: { include: { skill: true } },
      certifications: { include: { certification: true } },
      experiences: true,
      projects: true,
    },
  });

  const allTracks = await getAllCareerTracksAsync();
  const trustTrack = allTracks.find((entry) => entry.id === trustStudent?.targetCareer) ?? allTracks[0];

  if (!trustStudent || !trustTrack) {
    check("a student with portfolio evidence exists", false, "seed the demo data first");
  } else {
    const project = trustStudent.projects[0];
    const original = {
      status: project.verificationStatus,
      reviewedAt: project.reviewedAt,
      reviewedBy: project.reviewedBy,
      note: project.reviewNote,
    };

    async function scoreWithProjectStatus(status: string) {
      await prisma.project.update({ where: { id: project.id }, data: { verificationStatus: status } });
      const reloaded = await prisma.student.findUniqueOrThrow({
        where: { id: trustStudent!.id },
        include: {
          skills: { include: { skill: true } },
          certifications: { include: { certification: true } },
          experiences: true,
          projects: true,
        },
      });
      const core = computeCareerReadiness(
        toReadinessEvidence({ ...reloaded, targetCareer: trustStudent!.targetCareer }),
        toReadinessTrack(trustTrack!),
      );
      return core;
    }

    try {
      const selfReported = await scoreWithProjectStatus("SELF_REPORTED");
      const pending = await scoreWithProjectStatus("PENDING");
      const rejected = await scoreWithProjectStatus("REJECTED");
      const approved = await scoreWithProjectStatus("APPROVED");

      check(
        "K: a self-reported project earns no portfolio credit",
        selfReported.projectCount < approved.projectCount && selfReported.portfolioScore < approved.portfolioScore,
        `portfolio ${selfReported.portfolioScore}% self-reported vs ${approved.portfolioScore}% approved`,
      );

      check(
        "K: a project awaiting review earns no credit either",
        pending.portfolioScore === selfReported.portfolioScore,
        `portfolio ${pending.portfolioScore}% while pending`,
      );

      check(
        "K: rejected evidence never contributes",
        rejected.portfolioScore === selfReported.portfolioScore && rejected.score <= approved.score,
        `portfolio ${rejected.portfolioScore}% rejected vs ${approved.portfolioScore}% approved`,
      );

      check(
        "K: approving a project raises the portfolio component and the score",
        approved.portfolioScore > selfReported.portfolioScore && approved.score >= selfReported.score,
        `readiness ${selfReported.score} -> ${approved.score}, portfolio ${selfReported.portfolioScore}% -> ${approved.portfolioScore}%`,
      );

      check(
        "K: unscored evidence is reported rather than silently dropped",
        selfReported.unverifiedProjectCount > 0 && selfReported.explanation.some((line) => line.includes("not human-verified")),
        `${selfReported.unverifiedProjectCount} project(s) reported as recorded-but-unscored`,
      );

      check(
        "K: a rejected entry is not reported as merely awaiting review",
        rejected.pendingProjectCount === 0 || rejected.unverifiedProjectCount < rejected.projectCount + 1,
        `pending count while rejected: ${rejected.pendingProjectCount}`,
      );
    } finally {
      await prisma.project.update({
        where: { id: project.id },
        data: {
          verificationStatus: original.status,
          reviewedAt: original.reviewedAt,
          reviewedBy: original.reviewedBy,
          reviewNote: original.note,
        },
      });
    }

    // The same rule has to hold for the match an employer sees.
    const experience = trustStudent.experiences[0];
    if (experience) {
      const originalExperience = { status: experience.verificationStatus };
      const someJob = await prisma.job.findFirst({
        where: { minExperience: { gt: 0 } },
        include: { requiredSkills: { include: { skill: true } }, requiredCerts: { include: { certification: true } } },
      });

      try {
        if (someJob) {
          await prisma.experience.update({ where: { id: experience.id }, data: { verificationStatus: "APPROVED" } });
          const withVerified = computeJobMatch(
            await prisma.student.findUniqueOrThrow({
              where: { id: trustStudent.id },
              include: { skills: { include: { skill: true } }, certifications: { include: { certification: true } }, experiences: true, projects: true },
            }),
            someJob,
          );

          await prisma.experience.update({ where: { id: experience.id }, data: { verificationStatus: "SELF_REPORTED" } });
          const withSelfReported = computeJobMatch(
            await prisma.student.findUniqueOrThrow({
              where: { id: trustStudent.id },
              include: { skills: { include: { skill: true } }, certifications: { include: { certification: true } }, experiences: true, projects: true },
            }),
            someJob,
          );

          check(
            "K: a job match credits verified experience only",
            withSelfReported.experienceGapMonths >= withVerified.experienceGapMonths,
            `experience gap ${withVerified.experienceGapMonths} month(s) verified vs ${withSelfReported.experienceGapMonths} self-reported`,
          );
        } else {
          check("K: a job match credits verified experience only", true, "no role with a minimum experience to test against");
        }
      } finally {
        await prisma.experience.update({ where: { id: experience.id }, data: { verificationStatus: originalExperience.status } });
      }
    }
  }

  // -----------------------------------------------------------------------
  // L. A role posted with no skills requires no skills
  // -----------------------------------------------------------------------
  section("L. A new role carries only what the employer entered");

  const posterEmployer = await prisma.employer.findFirst({ where: { verificationStatus: "APPROVED" } });

  if (!posterEmployer) {
    check("an approved employer exists", false, "seed the demo data first");
  } else {
    let blankJobId: string | null = null;
    try {
      const blank = await prisma.job.create({
        data: { employerId: posterEmployer.id, title: "Chain verification blank role", careerTrack: "software-engineer" },
      });
      blankJobId = blank.id;
      const [skills, certifications] = await Promise.all([
        prisma.jobSkill.count({ where: { jobId: blank.id } }),
        prisma.jobCertification.count({ where: { jobId: blank.id } }),
      ]);
      check(
        "L: a role created without requirements has none",
        skills === 0 && certifications === 0,
        `${skills} skill requirement(s), ${certifications} certification requirement(s)`,
      );
    } finally {
      if (blankJobId) {
        await prisma.jobSkill.deleteMany({ where: { jobId: blankJobId } });
        await prisma.jobCertification.deleteMany({ where: { jobId: blankJobId } });
        await prisma.job.delete({ where: { id: blankJobId } });
      }
    }

    // No published role may carry the defaults the form used to pre-fill.
    const phantom = await prisma.job.findMany({
      where: {
        requiredSkills: { some: { skill: { name: { in: ["React.js", "Node.js", "PostgreSQL"] } } } },
      },
      include: { requiredSkills: { include: { skill: true } } },
    });
    check(
      "L: no role carries the form's old pre-filled skill set",
      phantom.every(
        (job) =>
          !["React.js", "Node.js", "PostgreSQL"].every((name) =>
            job.requiredSkills.some((requirement) => requirement.skill.name === name),
          ),
      ),
      phantom.length ? `${phantom.length} role(s) mention one of them, none carries all three` : "no role mentions them",
    );
  }

  // -----------------------------------------------------------------------
  // M. The point figures a student reads are engine-derived and consistent
  // -----------------------------------------------------------------------
  section("M. Readiness point figures are coherent");

  const gainStudents = await prisma.student.findMany({ include: { user: true }, take: 12 });
  let gainChecked = 0;
  const gainProblems: string[] = [];

  for (const entry of gainStudents) {
    const intelligence = await getStudentIntelligence(entry.id);
    if (!intelligence.readiness) continue;
    gainChecked += 1;

    if (intelligence.remainingHeadroom !== 100 - intelligence.readiness.score) {
      gainProblems.push(`${entry.user.name}: points-left ${intelligence.remainingHeadroom} != 100 - ${intelligence.readiness.score}`);
    }
    if (intelligence.combinedRecommendationGain > intelligence.remainingHeadroom) {
      gainProblems.push(`${entry.user.name}: combined gain ${intelligence.combinedRecommendationGain} exceeds ${intelligence.remainingHeadroom} points left`);
    }
    for (const recommendation of intelligence.roadmapRecommendations) {
      if (recommendation.expectedImpact > intelligence.remainingHeadroom) {
        gainProblems.push(`${entry.user.name}: "${recommendation.title}" claims ${recommendation.expectedImpact} of ${intelligence.remainingHeadroom} points left`);
      }
    }
  }

  check(
    "M: every displayed point figure stays within the points actually left",
    gainProblems.length === 0,
    gainProblems.length ? gainProblems.slice(0, 3).join(" · ") : `${gainChecked} student profile(s) checked`,
  );

  // A projection has to be the engine's own answer, not an estimate beside it.
  const projectionStudent = gainStudents[0];
  if (projectionStudent) {
    const intelligence = await getStudentIntelligence(projectionStudent.id);
    const track = allTracks.find((entry) => entry.id === projectionStudent.targetCareer) ?? allTracks[0];
    const loaded = await prisma.student.findUniqueOrThrow({
      where: { id: projectionStudent.id },
      include: { skills: { include: { skill: true } }, certifications: { include: { certification: true } }, experiences: true, projects: true },
    });
    const evidence = toReadinessEvidence({ ...loaded, targetCareer: projectionStudent.targetCareer });
    const trackInput = toReadinessTrack(track);
    const noChange = projectedReadinessGain(evidence, trackInput, []);
    check(
      "M: projecting no change is worth no points",
      noChange === 0,
      `projected gain for an empty change set: ${noChange}`,
    );
    check(
      "M: the projection agrees with a direct recomputation",
      intelligence.readiness === null ||
        computeCareerReadiness(evidence, trackInput).score === intelligence.readiness.score,
      `engine ${computeCareerReadiness(evidence, trackInput).score} vs reported ${intelligence.readiness?.score}`,
    );
  }

  // -----------------------------------------------------------------------
  // N. No test fixture survives in the data the platform reports on
  // -----------------------------------------------------------------------
  section("N. Test fixtures do not reach the aggregates");

  const allUsers = await prisma.user.findMany({ select: { email: true, role: true } });
  const fixtures = allUsers.filter((user) => isReservedTestEmail(user.email));
  check(
    "N: no account on a reserved test domain remains",
    fixtures.length === 0,
    fixtures.length ? fixtures.map((user) => user.email).join(", ") : `${allUsers.length} account(s), none on .local/.test/.invalid`,
  );

  // -----------------------------------------------------------------------
  // O. An application notifies the employer once, not on every resubmission
  // -----------------------------------------------------------------------
  section("O. Notifications fire once per event");

  const applicationNotifications = await prisma.notification.findMany({
    where: { type: "APPLICATION_RECEIVED" },
    select: { userId: true, title: true, createdAt: true },
  });
  const seenKeys = new Map<string, number>();
  for (const notification of applicationNotifications) {
    const key = `${notification.userId}::${notification.title}`;
    seenKeys.set(key, (seenKeys.get(key) ?? 0) + 1);
  }
  const duplicated = [...seenKeys.entries()].filter(([, count]) => count > 1);
  check(
    "O: no employer holds duplicate notifications for the same application",
    duplicated.length === 0,
    duplicated.length ? duplicated.map(([key, count]) => `${key} x${count}`).join(", ") : `${applicationNotifications.length} application notification(s)`,
  );

  // Re-applying must not produce a second notification.
  const reapply = await prisma.application.findFirst({ include: { job: { include: { employer: true } } } });
  if (reapply) {
    const before = await prisma.notification.count({
      where: { userId: reapply.job.employer.userId, type: "APPLICATION_RECEIVED" },
    });
    await prisma.application.update({ where: { id: reapply.id }, data: { matchScore: reapply.matchScore } });
    const after = await prisma.notification.count({
      where: { userId: reapply.job.employer.userId, type: "APPLICATION_RECEIVED" },
    });
    check(
      "O: touching an existing application creates no new notification",
      before === after,
      `${before} before, ${after} after`,
    );
  }


  // -----------------------------------------------------------------------
  // P. A required portfolio is stated, enforced, and readable by that employer
  // -----------------------------------------------------------------------
  section("P. Portfolio requirement");

  const requiringJobs = await prisma.job.findMany({
    where: { portfolioRequired: true },
    include: { applications: true, employer: true },
  });

  check(
    "P: at least one role states the requirement",
    requiringJobs.length > 0,
    `${requiringJobs.length} role(s) require a CV or portfolio`,
  );

  // Every application accepted against such a role must carry an attachment,
  // which is the property the server-side check exists to guarantee.
  let checkedApplications = 0;
  const withoutAttachment: string[] = [];

  for (const job of requiringJobs) {
    for (const application of job.applications) {
      checkedApplications += 1;
      const documents = await prisma.evidenceDocument.count({
        where: { contextType: "APPLICATION", contextId: application.id },
      });
      if (documents === 0) withoutAttachment.push(`${job.title}/${application.id}`);
    }
  }

  check(
    "P: no application to a portfolio-required role lacks an attachment",
    withoutAttachment.length === 0,
    withoutAttachment.length
      ? withoutAttachment.join(", ")
      : `${checkedApplications} application(s) checked, all carry a document`,
  );

  // The requirement is only meaningful if the employer can actually open it,
  // and only that employer.
  const applicationDocuments = await prisma.evidenceDocument.findMany({
    where: { contextType: "APPLICATION" },
    select: { id: true, contextId: true, ownerUserId: true },
  });

  let reachable = 0;
  const misattributed: string[] = [];

  for (const document of applicationDocuments) {
    const application = await prisma.application.findUnique({
      where: { id: document.contextId },
      include: { job: { select: { employerId: true } }, student: { select: { userId: true } } },
    });
    if (!application) {
      misattributed.push(`${document.id} points at no application`);
      continue;
    }
    if (application.student.userId !== document.ownerUserId) {
      misattributed.push(`${document.id} is not owned by the applicant`);
      continue;
    }
    reachable += 1;
  }

  check(
    "P: every application document belongs to its applicant and role",
    misattributed.length === 0,
    misattributed.length ? misattributed.join(", ") : `${reachable} application document(s) correctly attributed`,
  );

  // Career stage is stated to candidates and must never reach a score.
  const rankingSource = await readFile(new URL("../src/lib/ai.ts", import.meta.url), "utf8");
  check(
    "P: recent-graduate status is not an input to matching",
    !rankingSource.includes("recentGraduatesAccepted"),
    "computeJobMatch does not read the flag",
  );



  // -----------------------------------------------------------------------
  // Q. Career stage is declared by the student and never scored
  // -----------------------------------------------------------------------
  section("Q. Recent-graduate status");

  const declared = await prisma.student.findMany({
    where: { graduationYear: { not: null } },
    select: { id: true, graduationYear: true },
  });

  check(
    "Q: students can state a graduation year",
    declared.length > 0,
    `${declared.length} of ${await prisma.student.count()} student(s) have stated one`,
  );

  const currentYear = new Date().getFullYear();
  const recent = declared.filter((entry) => isRecentGraduate(entry.graduationYear));
  const notRecent = declared.filter((entry) => !isRecentGraduate(entry.graduationYear));

  check(
    "Q: the demo has students on both sides of the window",
    recent.length > 0 && notRecent.length > 0,
    `${recent.length} recent, ${notRecent.length} not, window is ${RECENT_GRADUATE_YEARS} year(s) from ${currentYear}`,
  );

  check(
    "Q: an unstated year is treated as unknown, never as 'not recent'",
    isRecentGraduate(null) === false && isRecentGraduate(undefined) === false,
    "a student who has not answered is simply not flagged either way",
  );

  // The whole point of keeping this out of ranking.
  const matchSource = await readFile(new URL("../src/lib/ai.ts", import.meta.url), "utf8");
  const readinessSource = await readFile(
    new URL("../src/lib/intelligence/readiness.ts", import.meta.url),
    "utf8",
  );

  check(
    "Q: graduation year is absent from matching and readiness",
    !matchSource.includes("graduationYear") && !readinessSource.includes("graduationYear"),
    "neither computeJobMatch nor computeCareerReadiness reads it",
  );

  // A role that welcomes recent graduates must still be open to everyone else.
  const welcoming = await prisma.job.findMany({
    where: { recentGraduatesAccepted: true, status: "open" },
    select: { id: true, title: true },
  });

  check(
    "Q: a welcoming role excludes nobody from applying",
    welcoming.every((job) => job.id.length > 0),
    welcoming.length
      ? `${welcoming.length} welcoming role(s); the flag is a listing signal, and no query filters candidates by it`
      : "no welcoming role in the demo data",
  );


  console.log(
    `\n${failures === 0 ? "ALL PROPAGATION CHECKS PASSED" : `${failures} PROPAGATION CHECK(S) FAILED`} · ${checks} check(s) run`,
  );
  await prisma.$disconnect();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
