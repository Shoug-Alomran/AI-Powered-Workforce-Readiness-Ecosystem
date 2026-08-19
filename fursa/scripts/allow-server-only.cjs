/**
 * `server-only` throws when loaded outside a React Server Component build.
 * Verification scripts legitimately run the same server modules in plain Node,
 * so this preload neutralizes that guard for scripts only. It is never part of
 * the Next.js build, so the real protection in the app is unaffected.
 */
/* eslint-disable @typescript-eslint/no-require-imports -- this is a CommonJS
   preload for `node --require`, which cannot use ESM import syntax. */
const Module = require("node:module");
const load = Module._load;

Module._load = function (request, parent, isMain) {
  if (request === "server-only") return {};
  return load.apply(this, [request, parent, isMain]);
};
