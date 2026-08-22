import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const globalsPath = join(root, "src/app/globals.css");
const expectedTokens = new Map([
  ["color-primary", "#0f172a"],
  ["color-secondary", "#1e3a8a"],
  ["color-accent", "#2563eb"],
  ["color-ai", "#6d5dfb"],
  ["color-background", "#f8fafc"],
  ["color-surface", "#ffffff"],
  ["color-border", "#e2e8f0"],
  ["color-text", "#111827"],
  ["color-muted", "#64748b"],
]);

const errors = [];
const css = readFileSync(globalsPath, "utf8");
for (const [token, value] of expectedTokens) {
  const declaration = new RegExp(`--${token}\\s*:\\s*${value}`, "i");
  if (!declaration.test(css)) errors.push(`globals.css: --${token} must be ${value}`);
}
if (!css.includes("font-family:var(--font-sans)!important")) {
  errors.push("globals.css: the final global font contract is missing");
}

function filesIn(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? filesIn(path) : [path];
  });
}

const sourceRoots = [join(root, "src/app"), join(root, "src/components")];
const sourceFiles = sourceRoots.flatMap(filesIn).filter((path) => [".ts", ".tsx", ".js", ".jsx"].includes(extname(path)));
const hardCodedStyle = /\b(?:color|fontFamily)\s*:\s*["'](?!var\(--|inherit["']|currentColor["'])/;

for (const path of sourceFiles) {
  readFileSync(path, "utf8").split("\n").forEach((line, index) => {
    if (hardCodedStyle.test(line)) errors.push(`${relative(root, path)}:${index + 1}: use a design token for inline text color or font`);
  });
}

if (errors.length) {
  console.error("Design-system check failed:\n" + errors.map((error) => `  - ${error}`).join("\n"));
  process.exit(1);
}
console.log("Design-system typography and color contract passed.");
