import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function loadControls() {
  const source = await readFile(new URL("../lib/security/access-control.ts", import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
}

test("object authorization permits only the owning user and tenant for every action", async () => {
  const { authorizeObject, AccessDeniedError } = await loadControls();
  const owner = { userId: "user-1", tenantId: "tenant-1" };
  const object = { ownerId: "user-1", tenantId: "tenant-1" };
  assert.deepEqual(authorizeObject(owner, "create"), owner);
  for (const action of ["read", "update", "delete"]) {
    assert.deepEqual(authorizeObject(owner, action, object), owner);
    for (const attacker of [
      { userId: "user-2", tenantId: "tenant-1" },
      { userId: "user-1", tenantId: "tenant-2" },
      null,
    ]) {
      assert.throws(() => authorizeObject(attacker, action, object), (error) =>
        error instanceof AccessDeniedError && error.code === "ACCESS_DENIED");
    }
  }
});

test("invalid principals and object identifiers fail closed", async () => {
  const { authorizeObject, AccessDeniedError } = await loadControls();
  for (const principal of [
    { userId: "", tenantId: "tenant-1" },
    { userId: "../user", tenantId: "tenant-1" },
    { userId: "user-1", tenantId: "" },
  ]) {
    assert.throws(() => authorizeObject(principal, "create"), (error) =>
      error instanceof AccessDeniedError);
  }
});

test("admission control enforces concurrency, replay, rate, and quota per subject", async () => {
  const { InMemoryAdmissionController, AdmissionRejectedError } = await loadControls();
  let now = 1_000;
  const controller = new InMemoryAdmissionController({
    maxRequestsPerWindow: 2,
    windowMs: 100,
    maxConcurrent: 1,
    maxQuotaPerPeriod: 3,
    quotaPeriodMs: 1_000,
  }, () => now);
  const principal = { userId: "user-1", tenantId: "tenant-1" };
  const acquire = (idempotencyKey) => controller.acquire({ principal, idempotencyKey });
  const first = acquire("request-1");
  assert.throws(() => acquire("request-2"), (error) =>
    error instanceof AdmissionRejectedError && error.code === "CONCURRENCY_LIMITED");
  first.release();
  first.release();
  assert.throws(() => acquire("request-1"), (error) =>
    error instanceof AdmissionRejectedError && error.code === "REPLAY_REJECTED");
  const second = acquire("request-2");
  second.release();
  assert.throws(() => acquire("request-3"), (error) =>
    error instanceof AdmissionRejectedError && error.code === "RATE_LIMITED");
  now += 100;
  const third = acquire("request-3");
  third.release();
  assert.throws(() => acquire("request-4"), (error) =>
    error instanceof AdmissionRejectedError && error.code === "QUOTA_EXCEEDED");
});

test("limits are isolated by tenant and user and reset only after their periods", async () => {
  const { InMemoryAdmissionController } = await loadControls();
  let now = 5_000;
  const controller = new InMemoryAdmissionController({
    maxRequestsPerWindow: 1,
    windowMs: 10,
    maxConcurrent: 1,
    maxQuotaPerPeriod: 1,
    quotaPeriodMs: 20,
  }, () => now);
  const acquire = (principal, idempotencyKey) => controller.acquire({ principal, idempotencyKey });
  acquire({ userId: "user-1", tenantId: "tenant-1" }, "request-a").release();
  acquire({ userId: "user-2", tenantId: "tenant-1" }, "request-a").release();
  acquire({ userId: "user-1", tenantId: "tenant-2" }, "request-a").release();
  now += 20;
  acquire({ userId: "user-1", tenantId: "tenant-1" }, "request-a").release();
});
