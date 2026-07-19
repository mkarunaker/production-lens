import assert from "node:assert/strict";
import { spawn } from "node:child_process";

const port = 43_000 + (process.pid % 1_000);
const origin = `http://127.0.0.1:${port}`;
const server = spawn("npm", ["run", "start", "--", "--port", String(port)], {
  cwd: new URL("../", import.meta.url),
  env: { ...process.env, WRANGLER_LOG_PATH: ".wrangler/wrangler-e2e.log" },
  stdio: ["ignore", "pipe", "pipe"],
});

let serverOutput = "";
server.stdout.on("data", (chunk) => { serverOutput += chunk; });
server.stderr.on("data", (chunk) => { serverOutput += chunk; });

async function fetchText(path) {
  const response = await fetch(`${origin}${path}`);
  assert.equal(response.status, 200, `${path} returned ${response.status}`);
  return response.text();
}

async function waitUntilReady() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(origin);
      if (response.ok) return;
    } catch {
      // The local production server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Production server did not become ready.\n${serverOutput}`);
}

function visibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&rarr;|&#x2192;/g, "→")
    .replace(/&larr;|&#x2190;/g, "←")
    .replace(/&middot;|&#xb7;/g, "·")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

try {
  await waitUntilReady();

  const home = visibleText(await fetchText("/"));
  assert.match(home, /Scan sample project/);
  assert.match(home, /Scan security test project/);
  assert.match(home, /Repository code is never executed/);

  const enterprise = visibleText(await fetchText("/results"));
  assert.match(enterprise, /11 open findings/);
  assert.match(enterprise, /What Production Lens evaluated/);
  assert.match(enterprise, /Select a finding card or flagged file/);
  assert.match(enterprise, /finding card or flagged file/);
  assert.match(enterprise, /Caught with Lens/);

  const security = visibleText(await fetchText("/results?sample=security"));
  assert.match(security, /7 open findings/);
  assert.match(security, /security-test-agent/);

  const proposal = visibleText(await fetchText("/remediation?finding=data_sensitive_logging-1"));
  assert.match(proposal, /How should Production Lens proceed/);
  assert.match(proposal, /Apply recommended fix/);
  assert.match(proposal, /Defer and keep open/);
  assert.match(proposal, /Approve, apply, and rescan/);

  const enterpriseAfter = visibleText(await fetchText("/results?mode=after&approved=yes&rule=DATA_SENSITIVE_LOGGING"));
  assert.match(enterpriseAfter, /Remediation verified/);
  assert.match(enterpriseAfter, /11 → 10 open findings/);
  assert.match(enterpriseAfter, /no new findings introduced/);

  const securityAfter = visibleText(await fetchText("/results?sample=security&mode=after&approved=yes&rule=INJ_SQL_OR_ORM"));
  assert.match(securityAfter, /Remediation verified/);
  assert.match(securityAfter, /7 → 6 open findings/);

  console.log("Golden-path production-server E2E passed.");
} finally {
  server.kill("SIGTERM");
  await new Promise((resolve) => {
    server.once("exit", resolve);
    setTimeout(resolve, 2_000);
  });
}
