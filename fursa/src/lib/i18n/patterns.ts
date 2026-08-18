/**
 * Sentence patterns for text the app *composes at runtime* — reasoning cards,
 * curriculum alignment notes, roadmap milestones. These strings never appear
 * verbatim in the source, so a plain English→Arabic dictionary cannot reach
 * them; each rule rebuilds the sentence in Arabic around the live values.
 *
 * A composed paragraph is translated only when *every* sentence in it resolves,
 * so a partially-covered explanation stays fully English rather than becoming a
 * half-translated mix.
 */
type Rule = [RegExp, (m: RegExpMatchArray, term: (value: string) => string) => string];

const RULES: Rule[] = [
  // Job match reasoning cards (lib/ai.ts)
  [/^Matches (\d+)\/(\d+) required skills \((.+)\)\.$/,
    (m, t) => `يطابق ${m[1]} من ${m[2]} من المهارات المطلوبة (${list(m[3], t)}).`],
  [/^Matches none of the (\d+) required skills yet\.$/,
    (m) => `لا يطابق أياً من المهارات المطلوبة الـ${m[1]} حتى الآن.`],
  [/^Missing: (.+)\.$/, (m, t) => `الناقص: ${list(m[1], t)}.`],
  [/^Missing certification\(s\): (.+)\.$/, (m, t) => `الشهادات الناقصة: ${list(m[1], t)}.`],
  [/^Holds all required certifications\.$/, () => "يحمل جميع الشهادات المطلوبة."],
  [/^Needs (\d+) more month\(s\) of relevant experience\.$/,
    (m) => `يحتاج ${m[1]} شهراً إضافياً من الخبرة ذات الصلة.`],
  [/^Matches: (.+)$/, (m, t) => `المطابق: ${list(m[1], t)}`],

  // Curriculum alignment notes (lib/curriculum.ts)
  [/^Teaches (\d+) of the (\d+) skill\(s\) on this syllabus that open roles currently request \((.+)\)\.$/,
    (m, t) => `يُدرّس ${m[1]} من ${m[2]} من مهارات هذا التوصيف التي تطلبها الوظائف المتاحة حالياً (${list(m[3], t)}).`],
  [/^None of the (\d+) skill\(s\) on this syllabus appear in any currently open role\.$/,
    (m) => `لا تظهر أي من مهارات هذا التوصيف الـ${m[1]} في أي وظيفة متاحة حالياً.`],
  [/^No skills are mapped to this offering yet, so it cannot be aligned against employer demand\.$/,
    () => "لم تُربط أي مهارات بهذا المقرر بعد، لذا لا يمكن مواءمته مع طلب أصحاب العمل."],
  [/^Covers (\d+)% of the (.+) track requirements\.$/,
    (m, t) => `يغطي ${m[1]}% من متطلبات مسار ${t(m[2])}.`],
  [/^Highest-value addition: (.+), requested by (\d+) open role\(s\) and not taught by any current offering\.$/,
    (m, t) => `أعلى إضافة قيمة: ${t(m[1])}، تطلبها ${m[2]} وظيفة متاحة ولا يُدرّسها أي مقرر حالي.`],

  // Roadmap milestones (lib/ai.ts)
  [/^Complete a foundational course in (.+)$/, (m, t) => `أكمل مقرراً تأسيسياً في ${t(m[1])}`],
  [/^Earn the "(.+)" certification$/, (m, t) => `احصل على شهادة "${t(m[1])}"`],
  [/^Reach (\d+) month\(s\) of relevant experience$/, (m) => `اصل إلى ${m[1]} شهراً من الخبرة ذات الصلة`],

  // Readiness trajectory labels
  [/^(.+): (\d+)% readiness$/, (m, t) => `${t(m[1])}: ${m[2]}% جاهزية`],
  [/^(.+): (\d+)% readiness projected$/, (m, t) => `${t(m[1])}: ${m[2]}% جاهزية متوقعة`],

  // Counted section headings, e.g. "Skills (6)", "Active (18)"
  [/^(.+) \((\d+)\)$/, (m, t) => {
    const label = t(m[1]);
    return label === m[1] ? m[0] : `${label} (${m[2]})`;
  }],
];

/** Translate a comma-separated list of skill/certification names item by item. */
function list(value: string, term: (v: string) => string) {
  return value.split(", ").map(term).join("، ");
}

/**
 * Split a paragraph into sentences. A terminator only ends a sentence when
 * whitespace follows, so decimals like "12.5%" stay intact. Written without a
 * lookbehind so older Safari builds can parse this file.
 */
function sentences(value: string) {
  const out: string[] = [];
  let start = 0;
  for (let i = 0; i < value.length; i++) {
    if (!".!?".includes(value[i]) || !/\s/.test(value[i + 1] ?? "")) continue;
    out.push(value.slice(start, i + 1));
    while (/\s/.test(value[i + 1] ?? "")) i++;
    start = i + 1;
  }
  if (start < value.length) out.push(value.slice(start));
  return out;
}

/**
 * Translate composed text, or return undefined when any sentence is unknown.
 * `term` resolves an individual term (skill name, month, track label) through
 * the main dictionary, falling back to the English term.
 */
export function translatePattern(value: string, term: (v: string) => string): string | undefined {
  const parts = sentences(value);
  const out: string[] = [];
  for (const part of parts) {
    const rule = RULES.find(([pattern]) => pattern.test(part));
    if (!rule) return undefined;
    const match = part.match(rule[0]);
    if (!match) return undefined;
    const translated = rule[1](match, term);
    if (translated === part) return undefined;
    out.push(translated);
  }
  return out.join(" ");
}
