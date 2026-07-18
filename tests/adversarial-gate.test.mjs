import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const corpus = JSON.parse(await readFile(
  new URL("./adversarial-corpus.json", import.meta.url),
  "utf8",
));

test("adversarial corpus has stable unique IDs and zero-tolerance release thresholds", () => {
  assert.equal(corpus.version, 1);
  assert.equal(corpus.releaseThresholds.blockingFixturePassRate, 1);
  for (const threshold of [
    "authorizationBypasses",
    "sourceLeakageEvents",
    "cleanupResidueEvents",
    "scannedCodeExecutions",
  ]) {
    assert.equal(corpus.releaseThresholds[threshold], 0, threshold);
  }
  const ids = corpus.fixtures.map((fixture) => fixture.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.every((id) => /^ADV-[A-Z]+(?:-[A-Z]+)*-\d{3}$/.test(id)));
  assert.ok(corpus.fixtures.every((fixture) => fixture.blocking === true));
});

test("every evaluated adversarial family maps to an executable regression test", async () => {
  const testSources = (
    await Promise.all([
      readFile(new URL("./scanner.test.mjs", import.meta.url), "utf8"),
      readFile(new URL("./platform-adapters.test.mjs", import.meta.url), "utf8"),
      readFile(new URL("./security-controls.test.mjs", import.meta.url), "utf8"),
      readFile(new URL("./zip-inspector.test.mjs", import.meta.url), "utf8"),
    ])
  ).join("\n");
  const families = new Set(corpus.fixtures.map((fixture) => fixture.family));
  for (const required of [
    "archive",
    "authorization",
    "admission",
    "operations",
    "exfiltration",
    "prompt_injection",
    "execution",
    "storage",
  ]) {
    assert.ok(families.has(required), required);
  }
  for (const fixture of corpus.fixtures) {
    assert.ok(testSources.includes(`test("${fixture.testName}"`), fixture.id);
    assert.ok(typeof fixture.expected === "string" && fixture.expected.length > 0, fixture.id);
  }
});
