import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function loadScanner() {
  const [{ outputText: scanner }, { outputText: bundle }] = await Promise.all([
    transpile("lib/scanner/index.ts"),
    transpile("lib/scanner/sample-bundle.ts"),
  ]);
  const scannerUrl = `data:text/javascript;base64,${Buffer.from(scanner.replace('from \"./types\";', 'from \"data:text/javascript,export {}\";')).toString("base64")}`;
  const scannerModule = await import(scannerUrl);
  const bundleCode = bundle.replace('from \"./types\";', 'from \"data:text/javascript,export {}\";');
  const bundleModule = await import(`data:text/javascript;base64,${Buffer.from(bundleCode).toString("base64")}`);
  return { ...scannerModule, ...bundleModule };
}

async function transpile(path) {
  return ts.transpileModule(await readFile(new URL(`../${path}`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
}

test("finds every expected issue with evidence-rich output", async () => {
  const { scanRepository, sampleFiles, sampleRepositoryName } = await loadScanner();
  const manifest = JSON.parse(await readFile(new URL("../samples/enterprise-analytics-agent/expected-findings.json", import.meta.url), "utf8"));
  const result = scanRepository(sampleRepositoryName, sampleFiles);
  assert.ok(result.findings.length >= manifest.minimumFindingCount);
  assert.deepEqual(new Set(result.findings.map((finding) => finding.ruleId)), new Set(manifest.expectedRuleIds));
  assert.ok(result.findings.filter((finding) => finding.evidence).length >= 3);
  for (const finding of result.findings) {
    assert.ok(finding.title && finding.explanation && finding.impact && finding.remediation);
  }
});

test("bundled scan text exactly matches the canonical sample files", async () => {
  const { sampleFiles } = await loadScanner();
  for (const file of sampleFiles) {
    const canonical = await readFile(new URL(`../samples/enterprise-analytics-agent/${file.path}`, import.meta.url), "utf8");
    assert.equal(file.content, canonical, `${file.path} snapshot drifted`);
  }
});

test("rejects path traversal, unsupported extensions, and redacts credentials", async () => {
  const { redactSecrets, sanitizeFiles } = await loadScanner();
  const clean = sanitizeFiles([
    { path: "../escape.ts", content: "unsafe" },
    { path: "image.png", content: "binary" },
    { path: "src/index.ts", content: "safe" },
  ]);
  assert.deepEqual(clean, [{ path: "src/index.ts", content: "safe" }]);
  assert.equal(redactSecrets('password: "super-secret-value"'), 'password: "[REDACTED]"');
});

test("enforces file count limits", async () => {
  const { sanitizeFiles, SCAN_LIMITS } = await loadScanner();
  const files = Array.from({ length: SCAN_LIMITS.maxFiles + 1 }, (_, index) => ({ path: `${index}.ts`, content: "" }));
  assert.throws(() => sanitizeFiles(files), /file count limit/);
});
