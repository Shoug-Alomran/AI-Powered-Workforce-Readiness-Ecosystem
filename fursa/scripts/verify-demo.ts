/**
 * Demo scenario verification.
 *
 * Runs the real intelligence layer against the seeded demo accounts and
 * asserts that each account still demonstrates the scenario it was enriched
 * for. Read-only: it changes nothing.
 *
 *   npx tsx scripts/verify-demo.ts
 */
import { prisma } from "../src/lib/db";
import { getStudentIntelligence } from "../src/lib/intelligence/student";
import { getEmployerIntelligence } from "../src/lib/intelligence/employer";
import { getUniversityIntelligence } from "../src/lib/intelligence/university";
import { getEcosystemIntelligence } from "../src/lib/intelligence/ecosystem";

let failures = 0;
function check(label: string, condition: boolean, detail: string) {
  console.log(`${condition ? "  PASS" : "  FAIL"}  ${label} — ${detail}`);
  if (!condition) failures += 1;
}

async function studentByEmail(email: string) {
  return prisma.student.findFirstOrThrow({ where: { user: { email } } });
}

async function main() {
  console.log("\n=== STUDENT SCENARIOS ===");

  const sara = await studentByEmail("sara.aldosari@example.com");
  const saraAI = await getStudentIntelligence(sara.id);
  check("Sara: strong profile", (saraAI.readiness?.score ?? 0) >= 70, `readiness ${saraAI.readiness?.score}/100 for ${saraAI.readiness?.careerTrackLabel}`);
  check("Sara: no false direction change", !saraAI.directionSuggestion.shouldSuggestChange, "target career left alone");

  const abdullah = await studentByEmail("abdullah.alghamdi@example.com");
  const abdullahAI = await getStudentIntelligence(abdullah.id);
  check("Abdullah: developing", (abdullahAI.readiness?.score ?? 0) < 70, `readiness ${abdullahAI.readiness?.score}/100`);
  check("Abdullah: actionable gaps", abdullahAI.skillGaps.length >= 3, `${abdullahAI.skillGaps.length} gaps, top: ${abdullahAI.skillGaps.slice(0,3).map(g => g.skillName).join(", ")}`);
  check("Abdullah: roadmap recommendations", abdullahAI.roadmapRecommendations.length > 0, `${abdullahAI.roadmapRecommendations.length} recommendations`);

  const omar = await studentByEmail("omar.alrashid@example.com");
  const omarAI = await getStudentIntelligence(omar.id);
  const suggestion = omarAI.directionSuggestion;
  check("Omar: direction change SUGGESTED", suggestion.shouldSuggestChange, suggestion.shouldSuggestChange ? `suggests ${suggestion.suggestedCareer?.careerTrackLabel}` : "no suggestion produced");
  check("Omar: suggestion is cybersecurity", suggestion.suggestedCareer?.careerTrackId === "cybersecurity-specialist", `${suggestion.suggestedCareer?.careerTrackId}`);
  check("Omar: targetCareer NOT changed", omar.targetCareer === "software-engineer", `still "${omar.targetCareer}"`);
  check("Omar: multi-signal evidence", suggestion.supportingSignals.length >= 3, `${suggestion.supportingSignals.length} supporting, ${suggestion.disengagementSignals.length} disengagement`);
  console.log(`        current=${suggestion.currentCareer?.recommendationScore}% vs suggested=${suggestion.suggestedCareer?.recommendationScore}%`);

  console.log("\n=== EMPLOYER SCENARIOS ===");
  const employers = await prisma.employer.findMany({ where: { verificationStatus: "APPROVED" }, orderBy: { createdAt: "asc" } });

  for (const employer of employers) {
    const ai = await getEmployerIntelligence(employer.id);
    for (const job of ai.jobs) {
      console.log(`  ${employer.company} / ${job.jobTitle}: pool=${job.candidatePoolSize} strong=${job.strongCandidateCount} difficulty=${job.hiringDifficulty} quality=${job.quality.score}%`);
    }
  }

  const nexariya = employers.find((e) => e.company.includes("Nexariya"))!;
  const nexAI = await getEmployerIntelligence(nexariya.id);
  const gradProgramme = nexAI.jobs.find((j) => j.jobTitle.includes("Graduate Programme"))!;
  check("Nexariya: healthy candidate pool", gradProgramme.strongCandidateCount >= 4 && gradProgramme.hiringDifficulty !== "HIGH", `${gradProgramme.strongCandidateCount} strong candidates, difficulty ${gradProgramme.hiringDifficulty}`);

  const sanad = employers.find((e) => e.company.includes("Sanad"))!;
  const sanadAI = await getEmployerIntelligence(sanad.id);
  const cloudSec = sanadAI.jobs.find((j) => j.jobTitle.includes("Cloud Security"))!;
  check("Sanad: hard-to-fill role", cloudSec.hiringDifficulty === "HIGH" && cloudSec.strongCandidateCount === 0, `${cloudSec.strongCandidateCount} strong, difficulty ${cloudSec.hiringDifficulty}`);
  check("Sanad: scarce skills identified", cloudSec.scarceSkills.length > 0, cloudSec.scarceSkills.map((s) => s.name).join(", ") || "none");

  console.log("\n=== UNIVERSITY SCENARIOS ===");
  const universities = await prisma.university.findMany();
  for (const university of universities) {
    const ai = await getUniversityIntelligence(university.id);
    console.log(`  ${university.institution}: coverage=${ai.weightedDemandCoverage}% gaps=${ai.gaps.length} compounded=${ai.compoundedGaps.length} cohort=${ai.cohort.reportable ? ai.cohort.students + " students, avg " + ai.cohort.averageScore : "withheld"}`);
    check(`${university.institution}: cohort reportable`, ai.cohort.reportable, ai.cohort.reportable ? `${ai.cohort.students} students` : "withheld");
    check(`${university.institution}: recommendations`, ai.recommendations.length > 0, `${ai.recommendations.length} recommendations, top: ${ai.recommendations[0]?.skillName}`);
  }

  const ksu = universities.find((u) => u.institution.includes("King Saud"))!;
  const psu = universities.find((u) => u.institution.includes("Prince Sultan"))!;
  const ksuAI = await getUniversityIntelligence(ksu.id);
  const psuAI = await getUniversityIntelligence(psu.id);
  check("PSU covers more demand than KSU", psuAI.weightedDemandCoverage > ksuAI.weightedDemandCoverage, `PSU ${psuAI.weightedDemandCoverage}% vs KSU ${ksuAI.weightedDemandCoverage}%`);
  check("KSU has meaningful gaps", ksuAI.gaps.length > 0, `${ksuAI.gaps.length} uncovered skills, largest: ${ksuAI.largestGap?.skillName}`);

  console.log("\n=== WORKFORCE INTELLIGENCE ===");
  const eco = await getEcosystemIntelligence();
  check("Readiness reportable", eco.readinessReportable, `${eco.scoredStudentCount} scored, avg ${eco.averageReadiness}/100`);
  check("Demand signals", eco.skills.length > 0, `${eco.skills.length} skills, top: ${eco.skills.slice(0,3).map(s => s.name).join(", ")}`);
  check("Supply gaps", eco.supplyGaps.length > 0, eco.supplyGaps.slice(0,3).map(s => `${s.name}(${s.studentsWithSkill}/${s.openRoleCount})`).join(", "));
  check("Unfillable roles", eco.hardToFillRoles.some((r) => r.qualifiedStudents === 0), eco.hardToFillRoles.filter(r => r.qualifiedStudents === 0).map(r => r.jobTitle).join(", ") || "none");
  check("Certification demand", eco.certifications.length > 0, eco.certifications.slice(0,3).map(c => `${c.name}(${c.openRoleCount} roles, ${c.verifiedHolders} holders)`).join("; "));

  console.log(`\n${failures === 0 ? "ALL SCENARIOS PASS" : `${failures} CHECK(S) FAILED`}\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main().finally(() => prisma.$disconnect());
