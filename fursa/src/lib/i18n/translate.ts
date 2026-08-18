/**
 * Runtime Arabic layer.
 *
 * The site is authored in English and translated in the browser rather than
 * through a routed locale, so the dictionary is keyed on the *English text
 * itself* instead of on per-element `data-i18n` keys. That keeps the 45 pages
 * free of translation markup: any string that appears in the dictionary is
 * translated everywhere it is rendered, including inside `.map()` output and
 * component libraries.
 *
 * Text coming from the database (student names, job titles, university-authored
 * course names) is deliberately absent from the dictionary and stays as stored.
 */
import { ar } from "./ar";
import { translatePattern } from "./patterns";

export type Language = "en" | "ar";

const SKIP = "script,style,code,pre,textarea,[data-no-translate]";
const ATTRS = ["placeholder", "aria-label", "title", "alt"] as const;

/** Original English kept per node so switching back to English is lossless. */
const originalText = new WeakMap<Text, string>();
const originalAttrs = new WeakMap<Element, Map<string, string>>();

/** Dictionary lookups ignore surrounding whitespace and collapse inner runs. */
const normalize = (value: string) => value.trim().replace(/\s+/g, " ");
/** A term resolves through the dictionary, or stays as-is (names, products). */
const term = (value: string) => ar[normalize(value)] ?? value;
/** Dictionary first, then the runtime-composed sentence patterns. */
const lookup = (value: string) => {
  const key = normalize(value);
  return ar[key] ?? translatePattern(key, term);
};

function translateText(language: Language) {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = (node as Text).parentElement;
      if (!parent || parent.closest(SKIP)) return NodeFilter.FILTER_REJECT;
      return (node.nodeValue ?? "").trim().length > 1 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });
  for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
    const current = node.nodeValue ?? "";
    const english = originalText.get(node) ?? current;
    const translated = language === "ar" ? lookup(english) : undefined;
    // Leading/trailing whitespace is meaningful in JSX ("Signed in as " + name).
    const [, lead = "", , trail = ""] = /^(\s*)([\s\S]*?)(\s*)$/.exec(english) ?? [];
    const next = translated ? `${lead}${translated}${trail}` : english;
    if (next === current) continue;
    if (!originalText.has(node)) originalText.set(node, english);
    node.nodeValue = next;
  }
}

function translateAttributes(language: Language) {
  document.querySelectorAll(ATTRS.map((attr) => `[${attr}]`).join(",")).forEach((element) => {
    if (element.closest(SKIP)) return;
    for (const attr of ATTRS) {
      const current = element.getAttribute(attr);
      if (current === null) continue;
      const stored = originalAttrs.get(element);
      const english = stored?.get(attr) ?? current;
      const translated = language === "ar" ? lookup(english) : undefined;
      const next = translated ?? english;
      if (next === current) continue;
      if (!stored) originalAttrs.set(element, new Map([[attr, english]]));
      else if (!stored.has(attr)) stored.set(attr, english);
      element.setAttribute(attr, next);
    }
  });
}

export function applyLanguage(language: Language) {
  document.documentElement.lang = language;
  document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  translateText(language);
  translateAttributes(language);
}
