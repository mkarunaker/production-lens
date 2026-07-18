import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import ts from "typescript";

export const LOCAL_ZIP_MAX_BYTES = 10 * 1024 * 1024;

let runtimePromise;

async function moduleUrl(path, replacements = []) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  const linked = replacements.reduce(
    (text, [specifier, replacement]) => text.replaceAll(`"${specifier}"`, `"${replacement}"`),
    outputText,
  );
  return `data:text/javascript;base64,${Buffer.from(linked).toString("base64")}`;
}

async function loadRuntime() {
  if (!runtimePromise) {
    runtimePromise = (async () => {
      const scannerUrl = await moduleUrl("../lib/scanner/index.ts");
      const inspectorUrl = await moduleUrl("../lib/ingestion/zip-inspector.ts", [
        ["../scanner/index", scannerUrl],
      ]);
      const [scanner, inspector] = await Promise.all([
        import(scannerUrl),
        import(inspectorUrl),
      ]);
      return {
        scanRepository: scanner.scanRepository,
        materializeZip: inspector.materializeZip,
      };
    })();
  }
  return runtimePromise;
}

function securityHeaders(contentType) {
  return {
    "cache-control": "no-store",
    "content-security-policy": "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; form-action 'none'; frame-ancestors 'none'; base-uri 'none'",
    "content-type": contentType,
    "cross-origin-opener-policy": "same-origin",
    "cross-origin-resource-policy": "same-origin",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
  };
}

function writeJson(response, status, value) {
  response.writeHead(status, securityHeaders("application/json; charset=utf-8"));
  response.end(JSON.stringify(value));
}

function archiveName(request) {
  const encoded = request.headers["x-archive-name"];
  if (typeof encoded !== "string") throw new Error("ZIP_SIGNATURE_INVALID");
  let name;
  try {
    name = decodeURIComponent(encoded);
  } catch {
    throw new Error("ZIP_SIGNATURE_INVALID");
  }
  if (
    !name.toLowerCase().endsWith(".zip") ||
    name.includes("/") ||
    name.includes("\\") ||
    name.includes("\0") ||
    name.length > 240
  ) {
    throw new Error("ZIP_SIGNATURE_INVALID");
  }
  return name;
}

export async function readBoundedBody(request, maxBytes = LOCAL_ZIP_MAX_BYTES) {
  const declared = Number(request.headers["content-length"]);
  if (!Number.isSafeInteger(declared) || declared < 1 || declared > maxBytes) {
    throw new Error("ZIP_LIMIT_EXCEEDED");
  }
  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    total += chunk.length;
    if (total > maxBytes) throw new Error("ZIP_LIMIT_EXCEEDED");
    chunks.push(chunk);
  }
  if (total !== declared) throw new Error("ZIP_STRUCTURE_INVALID");
  return new Uint8Array(Buffer.concat(chunks, total));
}

function errorCode(error) {
  if (error && typeof error === "object" && "code" in error) return String(error.code);
  if (error instanceof Error && /^[A-Z_]+$/.test(error.message)) return error.message;
  return "ZIP_STRUCTURE_INVALID";
}

async function scanUpload(request, response) {
  if (request.headers["content-type"] !== "application/zip") {
    writeJson(response, 415, { error: "ZIP_SIGNATURE_INVALID" });
    return;
  }
  try {
    const name = archiveName(request);
    const bytes = await readBoundedBody(request);
    const { materializeZip, scanRepository } = await loadRuntime();
    const files = materializeZip(name, bytes);
    const repository = name.slice(0, -4);
    const result = scanRepository(repository, files);
    writeJson(response, 200, {
      repository: result.repository,
      scannedFiles: result.scannedFiles,
      findings: result.findings,
      inventory: result.inventory,
      checks: result.checks,
      safety: "Repository text was validated and scanned in memory. No repository code was executed.",
    });
  } catch (error) {
    writeJson(response, 400, { error: errorCode(error) });
  }
}

const PAGE = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Production Lens — Local ZIP Test</title>
  <style>
    :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, sans-serif; background: #07110e; color: #eefcf5; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; background: radial-gradient(circle at top right, #123b2d 0, #07110e 42%); }
    main { width: min(980px, calc(100% - 32px)); margin: 0 auto; padding: 56px 0 80px; }
    .eyebrow { color: #6ee7b7; font-size: 13px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; }
    h1 { max-width: 760px; margin: 12px 0; font-size: clamp(38px, 7vw, 68px); line-height: .98; letter-spacing: -.045em; }
    .lede { max-width: 720px; color: #b8cfc5; font-size: 18px; line-height: 1.6; }
    .notice { margin: 28px 0; padding: 14px 16px; border: 1px solid #285a47; border-radius: 12px; background: #0b2019; color: #b9f5d8; }
    .panel { margin-top: 28px; padding: 26px; border: 1px solid #24483a; border-radius: 20px; background: rgba(9, 27, 21, .9); box-shadow: 0 24px 80px rgba(0,0,0,.3); }
    label { display: block; font-weight: 800; margin-bottom: 10px; }
    input { width: 100%; padding: 20px; border: 1px dashed #4c8d72; border-radius: 14px; background: #081712; color: #dff8ed; }
    button { margin-top: 16px; padding: 13px 18px; border: 0; border-radius: 10px; background: #6ee7b7; color: #052016; font-weight: 900; cursor: pointer; }
    button:disabled { opacity: .5; cursor: wait; }
    #status { min-height: 24px; margin-top: 16px; color: #b8cfc5; }
    .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 22px 0; }
    .metric { padding: 16px; border-radius: 12px; background: #0c261c; }
    .metric strong { display: block; font-size: 28px; color: #6ee7b7; }
    .finding { margin-top: 14px; padding: 18px; border: 1px solid #254d3d; border-radius: 14px; background: #091c15; }
    .finding h3 { margin: 0 0 8px; }
    .meta { color: #80d9b4; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; }
    code { display: block; margin-top: 10px; padding: 12px; overflow-wrap: anywhere; border-radius: 8px; background: #030b08; color: #d8f8e9; }
    @media (max-width: 640px) { .summary { grid-template-columns: 1fr; } main { padding-top: 32px; } }
  </style>
</head>
<body>
<main>
  <div class="eyebrow">Local test harness</div>
  <h1>Validate an AI agent ZIP without running it.</h1>
  <p class="lede">Choose a ZIP from your machine. Production Lens validates the archive, materializes approved text in memory, and runs deterministic readiness checks.</p>
  <div class="notice">Localhost only · 10 MiB maximum · no extraction to disk · no dependency installation · no repository execution · no model calls</div>
  <section class="panel">
    <label for="archive">AI agent project (.zip)</label>
    <input id="archive" type="file" accept=".zip,application/zip">
    <button id="scan" type="button">Validate and scan ZIP</button>
    <div id="status" role="status" aria-live="polite"></div>
    <div id="results"></div>
  </section>
</main>
<script>
  const input = document.querySelector("#archive");
  const button = document.querySelector("#scan");
  const status = document.querySelector("#status");
  const results = document.querySelector("#results");
  const text = (tag, value, className) => {
    const element = document.createElement(tag);
    element.textContent = value;
    if (className) element.className = className;
    return element;
  };
  button.addEventListener("click", async () => {
    const file = input.files[0];
    results.replaceChildren();
    if (!file) { status.textContent = "Choose a ZIP file first."; return; }
    if (!file.name.toLowerCase().endsWith(".zip")) { status.textContent = "Only ZIP files are accepted."; return; }
    if (file.size > ${LOCAL_ZIP_MAX_BYTES}) { status.textContent = "ZIP exceeds the 10 MiB limit."; return; }
    button.disabled = true;
    status.textContent = "Validating archive and scanning approved text…";
    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "content-type": "application/zip", "x-archive-name": encodeURIComponent(file.name) },
        body: file,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "ZIP_REJECTED");
      status.textContent = data.safety;
      const summary = text("div", "", "summary");
      for (const [value, label] of [[data.findings.length, "Open findings"], [data.scannedFiles, "Scanned files"], [data.checks.length, "Catalog checks"]]) {
        const metric = text("div", "", "metric");
        metric.append(text("strong", String(value)), text("span", label));
        summary.append(metric);
      }
      results.append(text("h2", data.repository), summary);
      if (data.findings.length === 0) results.append(text("p", "No finding matched the evaluated deterministic rules."));
      for (const finding of data.findings) {
        const card = text("article", "", "finding");
        card.append(text("div", finding.severity + " · " + finding.category + " · " + finding.ruleId, "meta"));
        card.append(text("h3", finding.title));
        card.append(text("p", finding.explanation));
        if (finding.evidence) {
          card.append(text("p", finding.evidence.path + ":" + finding.evidence.line));
          card.append(text("code", finding.evidence.code));
        }
        card.append(text("p", "Remediation: " + finding.remediation));
        results.append(card);
      }
    } catch (error) {
      status.textContent = "Archive rejected: " + error.message;
    } finally {
      button.disabled = false;
    }
  });
</script>
</body>
</html>`;

export async function handleZipDemoRequest(request, response) {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  if (request.method === "GET" && url.pathname === "/") {
    response.writeHead(200, securityHeaders("text/html; charset=utf-8"));
    response.end(PAGE);
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/scan") {
    await scanUpload(request, response);
    return;
  }
  writeJson(response, 404, { error: "NOT_FOUND" });
}

export function createZipDemoServer({ environment = process.env.NODE_ENV } = {}) {
  if (environment === "production") {
    throw new Error("LOCAL_ZIP_DEMO_DISABLED_IN_PRODUCTION");
  }
  const server = createServer(handleZipDemoRequest);
  server.headersTimeout = 5_000;
  server.requestTimeout = 15_000;
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT ?? 4317);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) throw new Error("Invalid PORT.");
  const server = createZipDemoServer();
  server.listen(port, "127.0.0.1", () => {
    console.log(`Production Lens local ZIP test: http://127.0.0.1:${port}`);
  });
}
