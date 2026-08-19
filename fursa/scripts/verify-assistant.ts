/* eslint-disable @typescript-eslint/no-explicit-any -- this script deliberately
   probes the assistant's grounding pack as loose JSON, which is exactly the
   shape the model receives; narrowing every field would test the type
   definitions rather than the data actually being supplied. */
/**
 * Assistant grounding + privacy verification.
 *
 * Exercises the role-aware context assembly that the /api/assistant route
 * uses, and asserts the privacy boundaries hold. Read-only; makes no LLM call.
 *
 *   npx tsx --require ./scripts/allow-server-only.cjs scripts/verify-assistant.ts
 */
import { prisma } from "../src/lib/db";
import { buildStudentContext, buildEmployerContext, buildUniversityContext } from "../src/lib/assistant/context";

let failures = 0;
function check(label: string, condition: boolean, detail: string) {
  console.log(`${condition ? "  PASS" : "  FAIL"}  ${label} — ${detail}`);
  if (!condition) failures += 1;
}

function size(value: unknown) {
  return `${(JSON.stringify(value).length / 1024).toFixed(1)} KB`;
}

async function main() {
  console.log("\n=== STUDENT CONTEXT (Omar — the direction-drift account) ===");
  const omar = await prisma.student.findFirstOrThrow({ where: { user: { email: "omar.alrashid@example.com" } } });
  const studentCtx = await buildStudentContext(omar.id);
  const sf = studentCtx.facts as Record<string, any>;

  console.log(`  context size: ${size(studentCtx.facts)} · models: ${studentCtx.modelVersions.join(", ")}`);
  check("readiness supplied", sf.readiness?.score !== undefined, `score ${sf.readiness?.score} with ${sf.readiness?.components?.length} components`);
  check("component explanations supplied", (sf.readiness?.explanation?.length ?? 0) > 0, `${sf.readiness?.explanation?.length} explanation lines`);
  check("skill gaps supplied", sf.skillGaps?.length > 0, `${sf.skillGaps?.length} gaps`);
  check("job matches supplied", sf.jobMatches?.length > 0, `top: ${sf.jobMatches?.[0]?.jobTitle} at ${sf.jobMatches?.[0]?.matchScore}%`);
  check("direction suggestion supplied", sf.careerDirectionSuggestion?.suggested === true, `suggests ${sf.careerDirectionSuggestion?.suggestedCareer}`);
  check("interest signals supplied", sf.careerInterestSignals?.length > 0, `${sf.careerInterestSignals?.length} tracks with signals`);
  check("offerings supplied", sf.universityOfferings?.length > 0, `${sf.universityOfferings?.length} offerings`);
  check("workforce demand supplied", sf.workforceDemand?.mostRequestedSkills?.length > 0, `${sf.workforceDemand?.mostRequestedSkills?.length} skills`);
  check("verification state distinguished", sf.certifications?.every((c: any) => "countsTowardScore" in c), `${sf.certifications?.length} certifications flagged`);

  // PRIVACY: a student context must contain no other student.
  const otherStudents = await prisma.user.findMany({ where: { role: "STUDENT", NOT: { id: omar.userId } }, select: { name: true } });
  const studentBlob = JSON.stringify(studentCtx.facts);
  const leakedPeers = otherStudents.filter((peer) => studentBlob.includes(peer.name));
  check("PRIVACY: no peer student in student context", leakedPeers.length === 0, leakedPeers.length ? leakedPeers.map(p => p.name).join(", ") : "no peer names present");

  console.log("\n=== EMPLOYER CONTEXT (Sanad Secure — healthy + hard-to-fill) ===");
  const sanad = await prisma.employer.findFirstOrThrow({ where: { company: { contains: "Sanad" } } });
  const employerCtx = await buildEmployerContext(sanad.id);
  const ef = employerCtx.facts as Record<string, any>;

  console.log(`  context size: ${size(employerCtx.facts)} · models: ${employerCtx.modelVersions.join(", ")}`);
  check("own jobs supplied", ef.jobs?.length > 0, `${ef.jobs?.length} jobs`);
  check("hiring difficulty supplied", ef.jobs?.every((j: any) => j.hiringDifficulty), ef.jobs?.map((j: any) => `${j.title}=${j.hiringDifficulty}`).join(", "));
  check("requirement quality supplied", ef.jobs?.every((j: any) => j.requirementQuality?.score !== undefined), `quality scores present`);
  check("structured requirements supplied", ef.jobs?.every((j: any) => j.structuredRequirements), "skills/certs/experience present");
  check("recurring gaps supplied", Array.isArray(ef.recurringGapsAcrossAllRoles), `${ef.recurringGapsAcrossAllRoles?.length} recurring gaps`);
  check("scarce skills supplied", ef.jobs?.some((j: any) => j.scarceSkillsInPool?.length > 0), "scarce skills present");

  // PRIVACY: only students who applied to THIS employer's jobs may appear.
  const ownApplicantIds = new Set(
    (await prisma.application.findMany({ where: { job: { employerId: sanad.id } }, select: { studentId: true } })).map((a) => a.studentId),
  );
  const ownApplicantNames = new Set(
    (await prisma.student.findMany({ where: { id: { in: [...ownApplicantIds] } }, include: { user: true } })).map((s) => s.user.name),
  );
  const nonApplicants = await prisma.student.findMany({ where: { id: { notIn: [...ownApplicantIds] } }, include: { user: true } });
  const employerBlob = JSON.stringify(employerCtx.facts);
  const leakedNonApplicants = nonApplicants.filter((s) => employerBlob.includes(s.user.name));
  check("PRIVACY: only own applicants named", leakedNonApplicants.length === 0, leakedNonApplicants.length ? `LEAKED: ${leakedNonApplicants.map(s => s.user.name).join(", ")}` : `${ownApplicantNames.size} applicant(s) included, ${nonApplicants.length} non-applicants excluded`);

  console.log("\n=== UNIVERSITY CONTEXT (King Saud University) ===");
  const ksu = await prisma.university.findFirstOrThrow({ where: { institution: { contains: "King Saud" } } });
  const universityCtx = await buildUniversityContext(ksu.id);
  const uf = universityCtx.facts as Record<string, any>;

  console.log(`  context size: ${size(universityCtx.facts)} · models: ${universityCtx.modelVersions.join(", ")}`);
  check("demand coverage supplied", uf.demandCoverage?.weightedDemandCoveragePct !== undefined, `${uf.demandCoverage?.weightedDemandCoveragePct}% coverage`);
  check("curriculum gaps supplied", uf.curriculumGaps?.length > 0, `${uf.curriculumGaps?.length} gaps`);
  check("recommendations supplied", uf.recommendations?.length > 0, `${uf.recommendations?.length} recommendations, top: ${uf.recommendations?.[0]?.subject}`);
  check("offerings supplied", uf.offerings?.length > 0, `${uf.offerings?.length} offerings`);
  check("curriculum actions supplied", uf.curriculumActions?.length > 0, `${uf.curriculumActions?.length} actions`);
  check("cohort aggregate supplied", uf.cohortReadiness?.students !== undefined, `${uf.cohortReadiness?.students} students, avg ${uf.cohortReadiness?.averageScore}`);
  check("privacy floor declared", uf.privacy?.minimumCohortSize !== undefined, `min cohort ${uf.privacy?.minimumCohortSize}`);

  // PRIVACY: no individual student may appear anywhere in the university pack.
  const allStudents = await prisma.student.findMany({ include: { user: true } });
  const universityBlob = JSON.stringify(universityCtx.facts);
  const leakedStudents = allStudents.filter((s) => universityBlob.includes(s.user.name) || universityBlob.includes(s.user.email));
  check("PRIVACY: no individual student in university context", leakedStudents.length === 0, leakedStudents.length ? `LEAKED: ${leakedStudents.map(s => s.user.name).join(", ")}` : `0 of ${allStudents.length} student identities present`);

  console.log(`\n${failures === 0 ? "ALL ASSISTANT CONTEXT CHECKS PASS" : `${failures} CHECK(S) FAILED`}\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main().finally(() => prisma.$disconnect());
