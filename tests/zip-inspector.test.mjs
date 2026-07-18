import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function loadInspector() {
  const source = await readFile(new URL("../lib/ingestion/zip-inspector.ts", import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
}

function zip(entries, overrides = {}) {
  const encoder = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  let localOffset = 0;
  for (const entry of entries) {
    const name = encoder.encode(entry.path);
    const data = entry.data ?? new Uint8Array(entry.compressedBytes ?? 0);
    const compressedBytes = entry.compressedBytes ?? data.length;
    const expandedBytes = entry.expandedBytes ?? data.length;
    const flags = entry.flags ?? 0x0800;
    const method = entry.method ?? 0;
    const local = new Uint8Array(30 + name.length + data.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, flags, true);
    localView.setUint16(8, method, true);
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
  assert.throws(() => inspectZip("nested.zip", zip([{ path: "vendor/archive.zip" }])), (error) =>
    error instanceof ZipInspectionError && error.code === "ZIP_NESTED_ARCHIVE_REJECTED");
  for (const entry of [{ path: "secret.ts", flags: 0x0801 }, { path: "method.ts", method: 99 }]) {
    assert.throws(() => inspectZip("feature.zip", zip([entry])), (error) =>
      error instanceof ZipInspectionError && error.code === "ZIP_FEATURE_UNSUPPORTED");
  }
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
