import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const errors = [];

function filesIn(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? filesIn(path) : [path];
  });
}

const renderedRoots = [join(root, "src/app"), join(root, "src/components")];
const contentFiles = [
  join(root, "src/lib/knowledgeBase.ts"),
  join(root, "src/lib/nationalImpact.ts"),
  join(root, "src/lib/policies.ts"),
  join(root, "src/lib/standards.ts"),
];
const sourceFiles = [
  ...renderedRoots.flatMap(filesIn),
  ...contentFiles,
].filter((path) => [".ts", ".tsx", ".js", ".jsx"].includes(extname(path)));

for (const path of sourceFiles) {
  const lines = readFileSync(path, "utf8").split("\n");
  let inBlockComment = false;
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("/*") || trimmed.startsWith("{/*")) inBlockComment = true;
    const isComment = inBlockComment || trimmed.startsWith("//") || trimmed.startsWith("*");
    if (!isComment && line.includes("—")) {
      errors.push(`${relative(root, path)}:${index + 1}: replace the em dash with a full stop, comma, or colon`);
    }
    if (inBlockComment && trimmed.includes("*/")) inBlockComment = false;
  });
}

for (const path of contentFiles.slice(0, 2)) {
  readFileSync(path, "utf8").split("\n").forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith("//") && /[\u0600-\u06ff]/.test(line)) {
      errors.push(`${relative(root, path)}:${index + 1}: English content data must not contain Arabic text; add it to the Arabic dictionary`);
    }
  });
}

if (errors.length) {
  console.error("Content-style check failed:\n" + errors.map((error) => `  - ${error}`).join("\n"));
  process.exit(1);
}

console.log("Content style passed: no em dashes or mixed-language English records.");
