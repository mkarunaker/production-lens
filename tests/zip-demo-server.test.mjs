import assert from "node:assert/strict";
import test from "node:test";
import {
  createZipDemoServer,
  handleZipDemoRequest,
  LOCAL_ZIP_MAX_BYTES,
  readBoundedBody,
} from "../scripts/zip-demo-server.mjs";

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function storedZip(entries) {
  const encoder = new TextEncoder();
  const locals = [];
  const centrals = [];
  let localOffset = 0;
  for (const entry of entries) {
    const name = encoder.encode(entry.path);
    const data = encoder.encode(entry.content);
    const crc = crc32(data);
    const local = new Uint8Array(30 + name.length + data.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0x0800, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, data.length, true);
    localView.setUint32(22, data.length, true);
    localView.setUint16(26, name.length, true);
    local.set(name, 30);
    local.set(data, 30 + name.length);
    locals.push(local);
    const central = new Uint8Array(46 + name.length);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 0x0314, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0x0800, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, data.length, true);
    centralView.setUint32(24, data.length, true);
    centralView.setUint16(28, name.length, true);
    centralView.setUint32(38, (0o100644 << 16) >>> 0, true);
    centralView.setUint32(42, localOffset, true);
    central.set(name, 46);
    centrals.push(central);
    localOffset += local.length;
  }
  const centralSize = centrals.reduce((sum, part) => sum + part.length, 0);
  const eocd = new Uint8Array(22);
  const view = new DataView(eocd.buffer);
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(8, entries.length, true);
  view.setUint16(10, entries.length, true);
  view.setUint32(12, centralSize, true);
  view.setUint32(16, localOffset, true);
  const output = new Uint8Array(localOffset + centralSize + 22);
  let cursor = 0;
  for (const part of [...locals, ...centrals, eocd]) {
    output.set(part, cursor);
    cursor += part.length;
  }
  return output;
}

async function invoke({ method = "GET", url = "/", headers = {}, body = new Uint8Array() }) {
  const request = {
    method,
    url,
    headers: {
      ...headers,
      ...(body.byteLength > 0 ? { "content-length": String(body.byteLength) } : {}),
    },
    async *[Symbol.asyncIterator]() {
      if (body.byteLength > 0) yield Buffer.from(body);
    },
  };
  const output = [];
  const response = {
    status: 0,
    headers: {},
    writeHead(status, responseHeaders) {
      this.status = status;
      this.headers = responseHeaders;
    },
    end(value = "") {
      output.push(String(value));
    },
  };
  await handleZipDemoRequest(request, response);
  return {
    status: response.status,
    headers: response.headers,
    text: output.join(""),
    json() {
      return JSON.parse(output.join(""));
    },
  };
}

test("local ZIP demo is unavailable in production mode", () => {
  assert.throws(
    () => createZipDemoServer({ environment: "production" }),
    /LOCAL_ZIP_DEMO_DISABLED_IN_PRODUCTION/,
  );
});

test("local ZIP demo validates and scans an inert archive in memory", async () => {
  const page = await invoke({});
  assert.equal(page.status, 200);
  assert.match(page.text, /Validate an AI agent ZIP without running it/);
  assert.equal(LOCAL_ZIP_MAX_BYTES, 20 * 1024 * 1024);
  assert.match(page.text, /20 MiB maximum/);
  assert.match(page.headers["content-security-policy"], /default-src 'none'/);
  const archive = storedZip([
    { path: "package.json", content: '{"dependencies":{"next":"1"}}' },
    { path: "src/index.ts", content: "export const inert = true;" },
  ]);
  const response = await invoke({
    method: "POST",
    url: "/api/scan",
    headers: {
      "content-type": "application/zip",
      "x-archive-name": encodeURIComponent("judge-agent.zip"),
    },
    body: archive,
  });
  assert.equal(response.status, 200);
  const result = response.json();
  assert.equal(result.repository, "judge-agent");
  assert.equal(result.scannedFiles, 2);
  assert.ok(result.findings.some((finding) => finding.ruleId === "SUPPLY_CHAIN_MISSING_LOCKFILE"));
  assert.match(result.safety, /No repository code was executed/);
});

test("local ZIP demo rejects malformed archives without returning source", async () => {
  const response = await invoke({
    method: "POST",
    url: "/api/scan",
    headers: {
      "content-type": "application/zip",
      "x-archive-name": encodeURIComponent("malformed.zip"),
    },
    body: new Uint8Array([1, 2, 3]),
  });
  assert.equal(response.status, 400);
  assert.deepEqual(response.json(), { error: "ZIP_SIGNATURE_INVALID" });
});

test("local ZIP demo bounds streamed request bodies", async () => {
  const request = {
    headers: { "content-length": String(LOCAL_ZIP_MAX_BYTES + 1) },
    async *[Symbol.asyncIterator]() {
      yield Buffer.from([1]);
    },
  };
  await assert.rejects(readBoundedBody(request), /ZIP_LIMIT_EXCEEDED/);
});
