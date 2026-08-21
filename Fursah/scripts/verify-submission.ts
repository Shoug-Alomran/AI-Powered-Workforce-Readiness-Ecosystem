import { KNOWLEDGE_BASE } from "../src/lib/knowledgeBase";
import { ITU_DIMENSIONS, POLICY_GAPS, Y3172_NODES } from "../src/lib/standards";

let failures = 0;
function check(condition: boolean, label: string, detail: string) {
  const status = condition ? "PASS" : "FAIL";
  console.log(`  ${status}  ${label} — ${detail}`);
  if (!condition) failures += 1;
}

console.log("=== OFFICIAL RUBRIC EVIDENCE ===");
check(Y3172_NODES.length === 7, "Y.3172 clause 8.1 node count", `${Y3172_NODES.length}/7 nodes`);
check(new Set(Y3172_NODES.map(node => node.id)).size === 7, "Y.3172 identifiers are unique", Y3172_NODES.map(node => node.id).join(", "));
check(Y3172_NODES.every(node => node.standardFunction && node.fursah && node.implementation.length && node.governs), "every node is traceable", "standard function, Fursah implementation, source files and governing instrument present");

check(ITU_DIMENSIONS.length === 13, "AI Ready Report dimension count", `${ITU_DIMENSIONS.length}/13 dimensions`);
check(ITU_DIMENSIONS.every((item, index) => item.number === index + 1), "dimensions are complete and ordered", "1 through 13 without gaps");
check(ITU_DIMENSIONS.some(item => item.coverage === "out-of-scope"), "self-assessment does not claim universal coverage", "at least one limitation is explicit");
check(ITU_DIMENSIONS.filter(item => item.coverage !== "out-of-scope").every(item => item.evidence), "covered dimensions name evidence", "every addressed or partial row links to implementation evidence");

check(KNOWLEDGE_BASE.length >= 15, "knowledge-base contribution is substantive", `${KNOWLEDGE_BASE.length} authentic sources`);
check(KNOWLEDGE_BASE.every(entry => /^https:\/\//.test(entry.url)), "knowledge-base sources are reviewable", "every entry has an HTTPS publisher/source URL");
check(KNOWLEDGE_BASE.every(entry => entry.about && entry.usedFor), "knowledge-base entries explain relevance", "what it is and what depends on it are present");

check(POLICY_GAPS.length >= 6, "policy contribution contains encountered gaps", `${POLICY_GAPS.length} gaps`);
check(POLICY_GAPS.every(gap => gap.owner && gap.trigger && gap.metric && gap.reviewCadence), "recommendations are operational", "owner, trigger, success measure and cadence present for every gap");
check(POLICY_GAPS.some(gap => gap.blocking), "production blockers remain explicit", `${POLICY_GAPS.filter(gap => gap.blocking).length} blocking gap(s)`);

if (failures) {
  console.error(`\n${failures} SUBMISSION CHECK(S) FAILED`);
  process.exit(1);
}
console.log("\nALL SUBMISSION CHECKS PASSED");
