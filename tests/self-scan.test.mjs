import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

const ROOT = new URL("../", import.meta.url);
const SCANNED_DIRECTORIES = ["app", "build", "lib", "worker"];
const SCANNED_ROOT_FILES = [
  "eslint.config.mjs",
  "next.config.ts",
  "package.json",
  "postcss.config.mjs",
  "tsconfig.json",
  "vite.config.ts",
];
const EXCLUDED_FILES = new Set([
  // This is an inert text snapshot of the intentionally vulnerable demo repository.
  "lib/scanner/sample-bundle.ts",
]);
const APPROVED_SOURCE_EXTENSIONS = new Set([".js", ".jsx", ".mjs", ".ts", ".tsx", ".json"]);
const SELF_SCAN_BLOCKING_RULES = new Set([
  "SEC_INDIRECT_PROMPT_INJECTION",
  "SEC_DANGEROUS_DYNAMIC_EXECUTION",
  "INJ_SQL_OR_ORM",
  "INJ_OS_COMMAND",
  "INJ_ARGUMENT",
]);

async function loadScanner() {
  const source = await readFile(new URL("lib/scanner/index.ts", ROOT), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  const scanner = outputText.replace('from "./types";', 'from "data:text/javascript,export {}";');
  return import(`data:text/javascript;base64,${Buffer.from(scanner).toString("base64")}`);
}

async function collectFiles(directory) {
  const entries = await readdir(new URL(`${directory}/`, ROOT), { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relativePath = `${directory}/${entry.name}`;
    if (entry.isDirectory()) {
      files.push(...await collectFiles(relativePath));
    } else if (
      APPROVED_SOURCE_EXTENSIONS.has(path.extname(entry.name)) &&
      !EXCLUDED_FILES.has(relativePath)
    ) {
      files.push({
        path: relativePath,
        content: await readFile(new URL(relativePath, ROOT), "utf8"),
      });
    }
  }
  return files;
}

test("Production Lens application source passes its own injection rules", async () => {
  const { scanRepository } = await loadScanner();
  const files = [
    ...await Promise.all(SCANNED_DIRECTORIES.map(collectFiles)).then((groups) => groups.flat()),
    ...await Promise.all(SCANNED_ROOT_FILES.map(async (relativePath) => ({
      path: relativePath,
      content: await readFile(new URL(relativePath, ROOT), "utf8"),
    }))),
  ];

  const result = scanRepository("production-lens-self-scan", files);
  const blockingFindings = result.findings.filter((finding) => SELF_SCAN_BLOCKING_RULES.has(finding.ruleId));
  assert.deepEqual(
    blockingFindings.map(({ ruleId, evidence }) => ({ ruleId, evidence })),
    [],
    `Production Lens introduced injection findings: ${JSON.stringify(blockingFindings, null, 2)}`,
  );
});
