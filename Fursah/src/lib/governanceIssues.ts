/**
 * `GovernanceScenario.detectedIssues` holds a list, but the column is a plain
 * `String` and two writers disagreed about how to fill it:
 *
 *   - `createGovernanceScenario` wrote `JSON.stringify(issues)`.
 *   - `scripts/seed-governance.ts` wrote a prose sentence, semicolon separated.
 *
 * The admin governance page called `JSON.parse` on whatever it found, so a
 * single seeded row threw inside the `scenarios.map(...)` and took the whole
 * route down with it — including the audit trail and the pipeline map further
 * down the page. Because the throw happened while streaming, the shell still
 * returned 200 and the failure looked like a blank section rather than an
 * error, which is why it survived: `npm run seed:governance` is the documented
 * setup step, so a fresh environment reproduced it every time.
 *
 * Reading is deliberately tolerant — rows already written in either format have
 * to keep rendering, and no data migration is required to recover the page.
 * Writing always goes through `serializeIssues`, so anything stored from now on
 * is JSON and the two writers cannot drift again.
 */

/** Separator used by the prose form, kept for reading legacy rows. */
const PROSE_SEPARATOR = /\s*;\s*/;

/**
 * Parses a stored `detectedIssues` value into its list of issues.
 *
 * Accepts the JSON array form, the legacy semicolon-separated prose form, and
 * anything else by treating it as a single issue. Never throws: a malformed
 * row degrades to showing its own text rather than removing the page.
 */
export function parseIssues(stored: string): string[] {
  const value = stored?.trim();
  if (!value) return [];

  if (value.startsWith("[")) {
    try {
      const parsed: unknown = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map(entry => String(entry).trim()).filter(Boolean);
      }
    } catch {
      // Falls through to the prose reading below. A row that looks like JSON
      // but is not still has to render.
    }
  }

  return value
    .split(PROSE_SEPARATOR)
    .map(entry => entry.trim())
    .filter(Boolean);
}

/** The single write format. Every writer must use this. */
export function serializeIssues(issues: readonly string[]): string {
  return JSON.stringify(issues.map(issue => issue.trim()).filter(Boolean));
}
