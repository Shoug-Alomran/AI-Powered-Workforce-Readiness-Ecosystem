/**
 * Preload for the verification and seed scripts.
 *
 * Two jobs.
 *
 * 1. Environment. Next loads `.env` and `.env.local` itself, so the app sees
 *    DATABASE_URL, the Worker credentials and the R2 settings. Plain `tsx`
 *    does not, so scripts ran against a different environment than the app and
 *    reported configuration as missing when it was present — a smoke test that
 *    says "not configured" about a configured system is worse than no smoke
 *    test. Loading the same files here makes the two agree.
 *
 * 2. `server-only` throws when loaded outside a React Server Component build.
 * Verification scripts legitimately run the same server modules in plain Node,
 * so this preload neutralizes that guard for scripts only. It is never part of
 * the Next.js build, so the real protection in the app is unaffected.
 */
/* eslint-disable @typescript-eslint/no-require-imports -- this is a CommonJS
   preload for `node --require`, which cannot use ESM import syntax. */
const path = require("node:path");
const Module = require("node:module");

// Same precedence Next uses: .env.local wins over .env, and anything already
// exported in the shell wins over both.
for (const file of [".env.local", ".env"]) {
  require("dotenv").config({ path: path.join(__dirname, "..", file), override: false });
}

const load = Module._load;

Module._load = function (request, parent, isMain) {
  if (request === "server-only") return {};
  return load.apply(this, [request, parent, isMain]);
};
