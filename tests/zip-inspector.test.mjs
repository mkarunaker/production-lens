import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";
import { deflateRawSync } from "node:zlib";

async function loadInspector() {
  const scannerSource = await readFile(new URL("../lib/scanner/index.ts", import.meta.url), "utf8");
  const { outputText: scannerOutput } = ts.transpileModule(scannerSource, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  const scannerUrl = `data:text/javascript;base64,${Buffer.from(scannerOutput).toString("base64")}`;
  const source = await readFile(new URL("../lib/ingestion/zip-inspector.ts", import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  const linkedOutput = outputText.replace("../scanner/index", scannerUrl);
  return import(`data:text/javascript;base64,${Buffer.from(linkedOutput).toString("base64")}`);
}

async function loadIngestion() {
  const inspectorUrl = await moduleUrl("../lib/ingestion/zip-inspector.ts", [
    ["../scanner/index", await scannerModuleUrl()],
  ]);
  const accessControlUrl = await moduleUrl("../lib/security/access-control.ts");
  const operationalEventsUrl = await moduleUrl("../lib/security/operational-events.ts");
  return import(await moduleUrl("../lib/ingestion/ingest-archive.ts", [
    ["./zip-inspector", inspectorUrl],
    ["../security/access-control", accessControlUrl],
    ["../security/operational-events", operationalEventsUrl],
  ]));
}

async function scannerModuleUrl() {
  return moduleUrl("../lib/scanner/index.ts");
}

async function moduleUrl(path, replacements = []) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  const linked = replacements.reduce((text, [specifier, replacement]) =>
    text.replaceAll(`"${specifier}"`, `"${replacement}"`), outputText);
  return `data:text/javascript;base64,${Buffer.from(linked).toString("base64")}`;
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function zip(entries, overrides = {}) {
  const encoder = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  let localOffset = 0;
  for (const entry of entries) {
    const name = encoder.encode(entry.path);
    const expandedData = entry.data ?? new Uint8Array(entry.expandedBytes ?? entry.compressedBytes ?? 0);
    const data = entry.method === 8 ? deflateRawSync(expandedData) : expandedData;
    const compressedBytes = entry.compressedBytes ?? data.length;
    const expandedBytes = entry.expandedBytes ?? expandedData.length;
    const flags = entry.flags ?? 0x0800;
    const method = entry.method ?? 0;
    const local = new Uint8Array(30 + name.length + data.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, flags, true);
    localView.setUint16(8, method, true);
    localView.setUint32(14, entry.localCrc32 ?? entry.crc32 ?? crc32(expandedData), true);
    localView.setUint32(18, entry.localCompressedBytes ?? compressedBytes, true);
    localView.setUint32(22, entry.localExpandedBytes ?? expandedBytes, true);
    localView.setUint16(26, name.length, true);
    local.set(name, 30);
    local.set(data, 30 + name.length);
    localParts.push(local);

    const central = new Uint8Array(46 + name.length);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, entry.versionMadeBy ?? 0x0314, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, flags, true);
    centralView.setUint16(10, method, true);
    centralView.setUint32(16, entry.crc32 ?? crc32(expandedData), true);
    centralView.setUint32(20, compressedBytes, true);
    centralView.setUint32(24, expandedBytes, true);
    centralView.setUint16(28, name.length, true);
    centralView.setUint32(38, entry.externalAttributes ?? (entry.path.endsWith("/") ? (0o040755 << 16) >>> 0 : (0o100644 << 16) >>> 0), true);
    centralView.setUint32(42, localOffset, true);
    central.set(name, 46);
    centralParts.push(central);
    localOffset += local.length;
  }
  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, 0x06054b50, true);
  eocdView.setUint16(4, overrides.disk ?? 0, true);
  eocdView.setUint16(6, 0, true);
  eocdView.setUint16(8, entries.length, true);
  eocdView.setUint16(10, entries.length, true);
  eocdView.setUint32(12, centralSize, true);
  eocdView.setUint32(16, localOffset, true);
  const output = new Uint8Array(localOffset + centralSize + eocd.length);
  let cursor = 0;
  for (const part of [...localParts, ...centralParts, eocd]) {
    output.set(part, cursor);
    cursor += part.length;
  }
  return output;
}

test("accepts safe metadata without extracting entry content", async () => {
  const { inspectZip } = await loadInspector();
  const bytes = zip([
    { path: "src/" },
    { path: "src/index.ts", data: new TextEncoder().encode("doNotExecute()") },
    { path: "assets/logo.png", data: new Uint8Array([1, 2, 3]) },
  ]);
  const result = inspectZip("repository.zip", bytes);
  assert.equal(result.entryCount, 3);
  assert.equal(result.acceptedFileCount, 1);
  assert.equal(result.ignoredFileCount, 1);
  assert.deepEqual(result.entries.map((entry) => entry.path), ["src", "src/index.ts", "assets/logo.png"]);
});

test("rejects invalid signatures and malformed local metadata", async () => {
  const { inspectZip, ZipInspectionError } = await loadInspector();
  assert.throws(() => inspectZip("fake.zip", new Uint8Array(22)), (error) =>
    error instanceof ZipInspectionError && error.code === "ZIP_SIGNATURE_INVALID");
  assert.throws(() => inspectZip("../repository.zip", zip([])), (error) =>
    error instanceof ZipInspectionError && error.code === "ZIP_SIGNATURE_INVALID");
  const mismatched = zip([{ path: "src/index.ts", data: new Uint8Array([1]), localExpandedBytes: 2 }]);
  assert.throws(() => inspectZip("mismatch.zip", mismatched), (error) =>
    error instanceof ZipInspectionError && error.code === "ZIP_STRUCTURE_INVALID");
});

test("rejects traversal, absolute, drive, backslash, and ambiguous paths", async () => {
  const { inspectZip, ZipInspectionError } = await loadInspector();
  for (const path of ["../escape.ts", "/absolute.ts", "C:/drive.ts", "src\\escape.ts", "src//empty.ts", "src/./dot.ts"]) {
    assert.throws(() => inspectZip("paths.zip", zip([{ path }])), (error) =>
      error instanceof ZipInspectionError && error.code === "ZIP_PATH_REJECTED", path);
  }
});

test("rejects case, Unicode, and platform-normalized collisions", async () => {
  const { inspectZip, ZipInspectionError } = await loadInspector();
  const collisionSets = [
    ["src/App.ts", "src/app.ts"],
    ["src/café.ts", "src/café.ts"],
    ["src/name.ts", "src/name.ts."],
  ];
  for (const paths of collisionSets) {
    assert.throws(() => inspectZip("collision.zip", zip(paths.map((path) => ({ path })))), (error) =>
      error instanceof ZipInspectionError && error.code === "ZIP_COLLISION_REJECTED");
  }
});

test("rejects symlinks, nested archives, encryption, and unsupported methods", async () => {
  const { inspectZip, ZipInspectionError } = await loadInspector();
  assert.throws(() => inspectZip("symlink.zip", zip([{
    path: "src/link.ts",
    externalAttributes: (0o120777 << 16) >>> 0,
  }])), (error) => error instanceof ZipInspectionError && error.code === "ZIP_ENTRY_TYPE_REJECTED");
  assert.throws(() => inspectZip("ambiguous-unix-type.zip", zip([{
    path: "src/ambiguous.ts",
    externalAttributes: 0,
  }])), (error) => error instanceof ZipInspectionError && error.code === "ZIP_ENTRY_TYPE_REJECTED");
  for (const mode of [0o020666, 0o060666, 0o010666, 0o140666]) {
    assert.throws(() => inspectZip("special.zip", zip([{
      path: "src/special.ts",
      externalAttributes: (mode << 16) >>> 0,
    }])), (error) => error instanceof ZipInspectionError && error.code === "ZIP_ENTRY_TYPE_REJECTED");
  }
  assert.throws(() => inspectZip("nested.zip", zip([{ path: "vendor/archive.zip" }])), (error) =>
    error instanceof ZipInspectionError && error.code === "ZIP_NESTED_ARCHIVE_REJECTED");
  for (const entry of [{ path: "secret.ts", flags: 0x0801 }, { path: "method.ts", method: 99 }]) {
    assert.throws(() => inspectZip("feature.zip", zip([entry])), (error) =>
      error instanceof ZipInspectionError && error.code === "ZIP_FEATURE_UNSUPPORTED");
  }
});

function memoryQuarantine({ failDelete = false } = {}) {
  const objects = new Map();
  const key = (object) => `${object.tenantId}:${object.ownerId}:${object.scanId}`;
  return {
    objects,
    async put(object, bytes) {
      objects.set(key(object), Uint8Array.from(bytes));
    },
    async read(object) {
      const bytes = objects.get(key(object));
      if (!bytes) throw new Error("missing");
      return Uint8Array.from(bytes);
    },
    async delete(object) {
      if (failDelete) throw new Error("cleanup failed");
      objects.delete(key(object));
    },
  };
}

function ingestionOptions(quarantine, securityScanner, overrides = {}) {
  const auditRecords = [];
  const alerts = [];
  return {
    principal: { userId: "owner-1", tenantId: "tenant-1" },
    scanId: "scan-opaque-1",
    archiveName: "repository.zip",
    archiveBytes: zip([
      { path: "src/index.ts", data: new TextEncoder().encode("export const inert = true;") },
      { path: "asset.bin", data: new Uint8Array([1, 2, 3]) },
    ]),
    quarantine,
    securityScanner,
    auditEvents: {
      async record(event) {
        auditRecords.push(event);
      },
    },
    operationalAlerts: {
      async alert(event) {
        alerts.push(event);
      },
    },
    timeoutMs: 1_000,
    testEvents: { auditRecords, alerts },
    ...overrides,
  };
}

test("ingestion scans owner-scoped quarantine, returns redacted metadata, and cleans up after success", async () => {
  const { ingestArchive } = await loadIngestion();
  const quarantine = memoryQuarantine();
  const options = ingestionOptions(quarantine, {
    async scan() {
      return { clean: true };
    },
  });
  const result = await ingestArchive(options);
  assert.deepEqual(result.files, [{ path: "src/index.ts", content: "export const inert = true;" }]);
  assert.equal(result.repositoryName, "repository");
  assert.equal(result.audit.acceptedFileCount, 1);
  assert.equal(result.audit.ignoredEntryCount, 1);
  assert.equal(quarantine.objects.size, 0);
  assert.equal(JSON.stringify(result.audit).includes("export const"), false);
  assert.equal(options.testEvents.auditRecords.length, 1);
  assert.equal(options.testEvents.auditRecords[0].outcome, "accepted");
  assert.equal(options.testEvents.auditRecords[0].cleanup, "completed");
  assert.equal(options.testEvents.alerts.length, 0);
});

test("ingestion rejects an invalid principal before writing quarantine data", async () => {
  const { ingestArchive } = await loadIngestion();
  const quarantine = memoryQuarantine();
  await assert.rejects(ingestArchive(ingestionOptions(quarantine, {
    async scan() {
      return { clean: true };
    },
  }, {
    principal: { userId: "../owner", tenantId: "tenant-1" },
  })), (error) => error?.code === "ACCESS_DENIED");
  assert.equal(quarantine.objects.size, 0);
});

test("ingestion fails closed and cleans up after rejection, scanner failure, cancellation, and timeout", async () => {
  const { ingestArchive, IngestionError } = await loadIngestion();
  const cases = [
    [{ async scan() { return { clean: false }; } }, {}, "ZIP_SECURITY_SCAN_REJECTED"],
    [{ async scan() { throw new Error("offline"); } }, {}, "ZIP_SECURITY_SCAN_UNAVAILABLE"],
    [{ async scan() { return { clean: true }; } }, { signal: AbortSignal.abort() }, "ZIP_OPERATION_CANCELLED"],
    [{ async scan(_bytes, signal) {
      await new Promise((resolve) => signal.addEventListener("abort", resolve, { once: true }));
      return { clean: true };
    } }, { timeoutMs: 5 }, "ZIP_OPERATION_TIMED_OUT"],
  ];
  for (const [scanner, overrides, code] of cases) {
    const quarantine = memoryQuarantine();
    const options = ingestionOptions(quarantine, scanner, overrides);
    await assert.rejects(ingestArchive(options), (error) =>
      error instanceof IngestionError && error.code === code);
    assert.equal(quarantine.objects.size, 0, code);
    assert.equal(options.testEvents.auditRecords.length, 1, code);
    assert.equal(options.testEvents.auditRecords[0].reasonCode, code);
    assert.equal(options.testEvents.alerts.length, code === "ZIP_SECURITY_SCAN_UNAVAILABLE" ? 1 : 0);
  }

  const quarantine = memoryQuarantine();
  const controller = new AbortController();
  const cancelled = ingestArchive(ingestionOptions(quarantine, {
    async scan(_bytes, signal) {
      await new Promise((resolve) => signal.addEventListener("abort", resolve, { once: true }));
      return { clean: true };
    },
  }, { signal: controller.signal }));
  setTimeout(() => controller.abort(), 0);
  await assert.rejects(cancelled, (error) =>
    error instanceof IngestionError && error.code === "ZIP_OPERATION_CANCELLED");
  assert.equal(quarantine.objects.size, 0);
});

test("cleanup failure blocks a successful ingestion result", async () => {
  const { ingestArchive, IngestionError } = await loadIngestion();
  const quarantine = memoryQuarantine({ failDelete: true });
  const options = ingestionOptions(quarantine, {
    async scan() {
      return { clean: true };
    },
  });
  await assert.rejects(ingestArchive(options), (error) =>
    error instanceof IngestionError && error.code === "ZIP_CLEANUP_FAILED");
  assert.equal(options.testEvents.auditRecords[0].cleanup, "failed");
  assert.equal(options.testEvents.alerts[0].type, "ingestion.cleanup_failed");
});

test("operational records never contain archive content or suspected secrets", async () => {
  const { ingestArchive } = await loadIngestion();
  const quarantine = memoryQuarantine();
  const options = ingestionOptions(quarantine, {
    async scan() {
      return { clean: true };
    },
  }, {
    archiveBytes: zip([{
      path: "src/secret.ts",
      data: new TextEncoder().encode('const apiKey = "sk-secretvalue123";'),
    }]),
  });
  await ingestArchive(options);
  const serialized = JSON.stringify(options.testEvents);
  assert.equal(serialized.includes("sk-secretvalue123"), false);
  assert.equal(serialized.includes("const apiKey"), false);
  assert.equal(serialized.includes("secret.ts"), false);
});

test("audit and required operational alert delivery fail closed", async () => {
  const { ingestArchive, IngestionError } = await loadIngestion();
  const auditQuarantine = memoryQuarantine();
  await assert.rejects(ingestArchive(ingestionOptions(auditQuarantine, {
    async scan() {
      return { clean: true };
    },
  }, {
    auditEvents: {
      async record() {
        throw new Error("audit offline");
      },
    },
  })), (error) => error instanceof IngestionError && error.code === "ZIP_AUDIT_UNAVAILABLE");
  assert.equal(auditQuarantine.objects.size, 0);

  const alertQuarantine = memoryQuarantine();
  await assert.rejects(ingestArchive(ingestionOptions(alertQuarantine, {
    async scan() {
      throw new Error("scanner offline");
    },
  }, {
    operationalAlerts: {
      async alert() {
        throw new Error("alert offline");
      },
    },
  })), (error) => error instanceof IngestionError && error.code === "ZIP_ALERT_UNAVAILABLE");
  assert.equal(alertQuarantine.objects.size, 0);
});

test("rejects per-entry and overall compression bombs from metadata", async () => {
  const { inspectZip, ZipInspectionError } = await loadInspector();
  assert.throws(() => inspectZip("file-bomb.zip", zip([{
    path: "bomb.ts",
    data: new Uint8Array([0]),
    compressedBytes: 1,
    expandedBytes: 101,
  }])), (error) => error instanceof ZipInspectionError && error.code === "ZIP_LIMIT_EXCEEDED");
  assert.throws(() => inspectZip("overall-bomb.zip", zip([
    { path: "one.ts", data: new Uint8Array([0, 0]), compressedBytes: 2, expandedBytes: 80 },
    { path: "two.ts", data: new Uint8Array([0, 0]), compressedBytes: 2, expandedBytes: 80 },
  ])), (error) => error instanceof ZipInspectionError && error.code === "ZIP_LIMIT_EXCEEDED");
});

test("rejects excessive path length, depth, file size, and entry count", async () => {
  const { inspectZip, ZipInspectionError, ZIP_INGESTION_LIMITS } = await loadInspector();
  const excessive = [
    zip([{ path: `${"a".repeat(ZIP_INGESTION_LIMITS.maxPathCharacters)}.ts` }]),
    zip([{ path: `${Array.from({ length: ZIP_INGESTION_LIMITS.maxDirectoryDepth + 1 }, () => "d").join("/")}/file.ts` }]),
    zip([{ path: "large.ts", expandedBytes: ZIP_INGESTION_LIMITS.maxFileBytes + 1, compressedBytes: ZIP_INGESTION_LIMITS.maxFileBytes + 1 }]),
    zip(Array.from({ length: ZIP_INGESTION_LIMITS.maxEntries + 1 }, (_, index) => ({ path: `src/${index}.ts` }))),
  ];
  for (const bytes of excessive) {
    assert.throws(() => inspectZip("limits.zip", bytes), (error) =>
      error instanceof ZipInspectionError && error.code === "ZIP_LIMIT_EXCEEDED");
  }
});

test("materializes stored and deflated approved text without writing or executing it", async () => {
  const { materializeZip } = await loadInspector();
  const files = materializeZip("repository.zip", zip([
    { path: "src/stored.ts", data: new TextEncoder().encode("doNotExecute()") },
    { path: "src/deflated.ts", method: 8, data: new TextEncoder().encode("export const safe = true;") },
    { path: "src/café.ts", data: new TextEncoder().encode("export const unicode = true;") },
    { path: "assets/logo.png", data: new Uint8Array([1, 2, 3]) },
  ]));
  assert.deepEqual(files, [
    { path: "src/stored.ts", content: "doNotExecute()" },
    { path: "src/deflated.ts", content: "export const safe = true;" },
    { path: "src/café.ts", content: "export const unicode = true;" },
  ]);
});

test("rejects disguised archives, invalid UTF-8, embedded NUL, and corrupt expanded data", async () => {
  const { materializeZip, ZipInspectionError } = await loadInspector();
  const archiveSignatures = [
    new Uint8Array([0x50, 0x4b, 0x03, 0x04]),
    new Uint8Array([0x1f, 0x8b]),
    new Uint8Array([0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c]),
    new Uint8Array([0x52, 0x61, 0x72, 0x21, 0x1a, 0x07]),
    Uint8Array.from({ length: 262 }, (_, index) => [0x75, 0x73, 0x74, 0x61, 0x72][index - 257] ?? 0),
  ];
  for (const signature of archiveSignatures) {
    assert.throws(() => materializeZip("disguised.zip", zip([{ path: "src/payload.txt", data: signature }])), (error) =>
      error instanceof ZipInspectionError && error.code === "ZIP_NESTED_ARCHIVE_REJECTED");
  }
  const cases = [
    ["utf8.zip", zip([{ path: "src/bad.txt", data: new Uint8Array([0xc3, 0x28]) }]), "ZIP_TEXT_INVALID"],
    ["nul.zip", zip([{ path: "src/nul.txt", data: new Uint8Array([0x61, 0, 0x62]) }]), "ZIP_TEXT_INVALID"],
    ["crc.zip", zip([{ path: "src/crc.txt", data: new TextEncoder().encode("changed"), crc32: 1 }]), "ZIP_STRUCTURE_INVALID"],
  ];
  for (const [name, bytes, code] of cases) {
    assert.throws(() => materializeZip(name, bytes), (error) =>
      error instanceof ZipInspectionError && error.code === code);
  }
});
