/**
 * Policy translation coverage.
 *
 * The Arabic layer is keyed on the exact English string (see i18n/translate.ts),
 * so editing a policy clause in policies.ts silently orphans its translation:
 * the key no longer matches and the page falls back to English without any
 * error. For ordinary interface copy that is a cosmetic gap. For a privacy
 * notice it means the Arabic reader is not shown a disclosure the English
 * reader is shown, which is the half of the audience the platform is built for.
 *
 * This reports every policy string with no Arabic rendering.
 *
 *   npx tsx --require ./scripts/allow-server-only.cjs scripts/check-policy-translations.ts
 *
 * Exits non-zero when anything is missing, so it can gate a release.
 */

import { POLICIES } from "../src/lib/policies";
import { ar } from "../src/lib/i18n/ar";

const normalize = (value: string) => value.trim().replace(/\s+/g, " ");

type Missing = { policy: string; clause: string; text: string };

const missing: Missing[] = [];
let total = 0;

function check(policy: string, clause: string, text: string) {
  total++;
  if (!ar[normalize(text)]) missing.push({ policy, clause, text });
}

for (const [slug, doc] of Object.entries(POLICIES)) {
  check(slug, "title", doc.title);
  check(slug, "summary", doc.summary);
  for (const clause of doc.clauses) {
    check(slug, clause.heading, clause.heading);
    for (const paragraph of clause.paragraphs ?? []) check(slug, clause.heading, paragraph);
    for (const bullet of clause.bullets ?? []) check(slug, clause.heading, bullet);
  }
  if (doc.attachment) {
    check(slug, "attachment", doc.attachment.label);
    check(slug, "attachment", doc.attachment.body);
  }
}

const covered = total - missing.length;
const pct = ((covered / total) * 100).toFixed(1);
console.log(`Policy strings: ${covered}/${total} translated (${pct}%)\n`);

if (!missing.length) {
  console.log("All policy strings have an Arabic rendering.");
  process.exit(0);
}

let currentPolicy = "";
for (const item of missing) {
  if (item.policy !== currentPolicy) {
    currentPolicy = item.policy;
    console.log(`\n── ${currentPolicy} ──`);
  }
  const preview = item.text.length > 96 ? `${item.text.slice(0, 96)}…` : item.text;
  console.log(`  [${item.clause}]`);
  console.log(`    ${preview}`);
}

console.log(`\n${missing.length} string(s) missing. Add them to src/lib/i18n/ar.policies.ts.`);
process.exit(1);
