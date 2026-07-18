import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function loadAdapters() {
  const source = await readFile(new URL("../lib/ingestion/platform-adapters.ts", import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
}

function fakeR2() {
  const objects = new Map();
  const metadata = new Map();
  return {
    objects,
    metadata,
    async put(key, value, options) {
      objects.set(key, Uint8Array.from(value));
      metadata.set(key, structuredClone(options.customMetadata));
    },
    async get(key) {
      const value = objects.get(key);
      if (!value) return null;
      return {
        async arrayBuffer() {
          return Uint8Array.from(value).buffer;
        },
      };
    },
    async delete(key) {
      objects.delete(key);
      metadata.delete(key);
    },
  };
}

function fakeD1({ success = true } = {}) {
  const writes = [];
  return {
    writes,
    prepare(sql) {
      assert.match(sql, /^INSERT INTO /);
      assert.match(sql, /\?/);
      return {
        bind(...values) {
          return {
            async run() {
              writes.push({ sql, values });
              return { success };
            },
          };
        },
      };
    },
  };
}

test("R2 quarantine keys are owner scoped and deletion is idempotent", async () => {
  const { R2QuarantineStore } = await loadAdapters();
  const bucket = fakeR2();
  const store = new R2QuarantineStore(bucket);
  const owner = { tenantId: "tenant-1", ownerId: "owner-1", scanId: "scan-1" };
  const attacker = { tenantId: "tenant-1", ownerId: "owner-2", scanId: "scan-1" };
  await store.put(owner, new Uint8Array([1, 2, 3]));
  assert.deepEqual(await store.read(owner), new Uint8Array([1, 2, 3]));
  await assert.rejects(store.read(attacker), /QUARANTINE_OBJECT_MISSING/);
  assert.equal(bucket.metadata.get("quarantine/tenant-1/owner-1/scan-1.zip").state, "quarantined");
  await store.delete(owner);
  await store.delete(owner);
  assert.equal(bucket.objects.size, 0);
});

test("R2 quarantine rejects path-like scope identifiers before storage access", async () => {
  const { R2QuarantineStore } = await loadAdapters();
  const bucket = fakeR2();
  const store = new R2QuarantineStore(bucket);
  await assert.rejects(store.put(
    { tenantId: "tenant-1", ownerId: "../owner", scanId: "scan-1" },
    new Uint8Array([1]),
  ), /QUARANTINE_SCOPE_INVALID/);
  assert.equal(bucket.objects.size, 0);
});

test("D1 audit writes use bound values and contain no repository source fields", async () => {
  const { D1AuditEventSink } = await loadAdapters();
  const database = fakeD1();
  const sink = new D1AuditEventSink(database);
  await sink.record({
    type: "ingestion.completed",
    occurredAt: "2026-07-18T00:00:00.000Z",
    scanId: "scan-1",
    tenantId: "tenant-1",
    actorId: "owner-1",
    outcome: "accepted",
    archiveBytes: 123,
    acceptedFileCount: 1,
    ignoredEntryCount: 2,
    cleanup: "completed",
  });
  assert.equal(database.writes.length, 1);
  const serialized = JSON.stringify(database.writes[0]);
  assert.equal(serialized.includes("source"), false);
  assert.equal(serialized.includes("content"), false);
  assert.equal(database.writes[0].values.length, 10);
});

test("D1 alert outbox uses bound values and fails closed on unsuccessful writes", async () => {
  const { D1OperationalAlertSink } = await loadAdapters();
  const database = fakeD1();
  const sink = new D1OperationalAlertSink(database, () => "event-1");
  await sink.alert({
    type: "ingestion.cleanup_failed",
    occurredAt: "2026-07-18T00:00:00.000Z",
    scanId: "scan-1",
    tenantId: "tenant-1",
    actorId: "owner-1",
    reasonCode: "ZIP_CLEANUP_FAILED",
  });
  assert.equal(database.writes[0].values.length, 7);
  const failing = new D1OperationalAlertSink(fakeD1({ success: false }), () => "event-2");
  await assert.rejects(failing.alert({
    type: "ingestion.security_scanner_unavailable",
    occurredAt: "2026-07-18T00:00:00.000Z",
    scanId: "scan-2",
    tenantId: "tenant-1",
    actorId: "owner-1",
    reasonCode: "ZIP_SECURITY_SCAN_UNAVAILABLE",
  }), /D1_WRITE_FAILED/);
});
