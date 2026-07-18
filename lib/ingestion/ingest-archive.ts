import { inspectZip, materializeZip, ZipInspectionError } from "./zip-inspector";
import { authorizeObject, type Principal } from "../security/access-control";
import {
  ingestionOutcome,
  type AuditEventSink,
  type OperationalAlertSink,
} from "../security/operational-events";
import type { RepositoryFile } from "../scanner/types";

export type IngestionFailureCode =
  | "ZIP_SECURITY_SCAN_UNAVAILABLE"
  | "ZIP_SECURITY_SCAN_REJECTED"
  | "ZIP_OPERATION_CANCELLED"
  | "ZIP_OPERATION_TIMED_OUT"
  | "ZIP_CLEANUP_FAILED"
  | "ZIP_AUDIT_UNAVAILABLE"
  | "ZIP_ALERT_UNAVAILABLE";

export class IngestionError extends Error {
  constructor(public readonly code: IngestionFailureCode) {
    super(code);
    this.name = "IngestionError";
  }
}

export type QuarantineObject = {
  ownerId: string;
  tenantId: string;
  scanId: string;
};

export interface QuarantineStore {
  // put must be atomic and delete must be idempotent.
  put(object: QuarantineObject, bytes: Uint8Array): Promise<void>;
  read(object: QuarantineObject): Promise<Uint8Array>;
  delete(object: QuarantineObject): Promise<void>;
}

export type SecurityScanResult = {
  clean: boolean;
};

export interface ArchiveSecurityScanner {
  scan(bytes: Uint8Array, signal: AbortSignal): Promise<SecurityScanResult>;
}

export type IngestionAudit = {
  scanId: string;
  outcome: "accepted";
  acceptedFileCount: number;
  ignoredEntryCount: number;
  archiveBytes: number;
};

export type IngestionResult = {
  scanId: string;
  repositoryName: string;
  files: RepositoryFile[];
  audit: IngestionAudit;
};

export type IngestArchiveOptions = {
  principal: Principal;
  scanId: string;
  archiveName: string;
  archiveBytes: Uint8Array;
  quarantine: QuarantineStore;
  securityScanner: ArchiveSecurityScanner;
  auditEvents: AuditEventSink;
  operationalAlerts: OperationalAlertSink;
  timeoutMs: number;
  signal?: AbortSignal;
};

function reject(code: IngestionFailureCode): never {
  throw new IngestionError(code);
}

function normalizedRepositoryName(archiveName: string) {
  const leaf = archiveName.split("/").at(-1) ?? "";
  return leaf.slice(0, -4).normalize("NFC");
}

function operationSignal(timeoutMs: number, external?: AbortSignal) {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) reject("ZIP_OPERATION_TIMED_OUT");
  const timeout = AbortSignal.timeout(timeoutMs);
  return {
    signal: external ? AbortSignal.any([external, timeout]) : timeout,
    timeout,
  };
}

async function scanWithCancellation(
  scanner: ArchiveSecurityScanner,
  bytes: Uint8Array,
  signal: AbortSignal,
  timeout: AbortSignal,
) {
  if (signal.aborted) reject(timeout.aborted ? "ZIP_OPERATION_TIMED_OUT" : "ZIP_OPERATION_CANCELLED");
  let onAbort: (() => void) | undefined;
  const aborted = new Promise<never>((_, rejectPromise) => {
    onAbort = () => {
      rejectPromise(new IngestionError(timeout.aborted ? "ZIP_OPERATION_TIMED_OUT" : "ZIP_OPERATION_CANCELLED"));
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
  try {
    return await Promise.race([scanner.scan(bytes, signal), aborted]);
  } catch (error) {
    if (error instanceof IngestionError) throw error;
    reject("ZIP_SECURITY_SCAN_UNAVAILABLE");
  } finally {
    if (onAbort) signal.removeEventListener("abort", onAbort);
  }
}

export async function ingestArchive(options: IngestArchiveOptions): Promise<IngestionResult> {
  const principal = authorizeObject(options.principal, "create");
  const object = {
    ownerId: principal.userId,
    tenantId: principal.tenantId,
    scanId: options.scanId,
  };
  const { signal, timeout } = operationSignal(options.timeoutMs, options.signal);
  let stored = false;
  let cleanup: "not_required" | "completed" | "failed" = "not_required";
  let acceptedFileCount = 0;
  let ignoredEntryCount = 0;
  let result: IngestionResult | undefined;
  let primaryError: unknown;

  try {
    if (signal.aborted) reject(timeout.aborted ? "ZIP_OPERATION_TIMED_OUT" : "ZIP_OPERATION_CANCELLED");
    await options.quarantine.put(object, options.archiveBytes);
    stored = true;
    const quarantinedBytes = await options.quarantine.read(object);
    const securityResult = await scanWithCancellation(options.securityScanner, quarantinedBytes, signal, timeout);
    if (!securityResult.clean) reject("ZIP_SECURITY_SCAN_REJECTED");
    if (signal.aborted) reject(timeout.aborted ? "ZIP_OPERATION_TIMED_OUT" : "ZIP_OPERATION_CANCELLED");
    const inspection = inspectZip(options.archiveName, quarantinedBytes);
    const files = materializeZip(options.archiveName, quarantinedBytes);
    acceptedFileCount = files.length;
    ignoredEntryCount = inspection.ignoredFileCount;
    result = {
      scanId: options.scanId,
      repositoryName: normalizedRepositoryName(options.archiveName),
      files,
      audit: {
        scanId: options.scanId,
        outcome: "accepted",
        acceptedFileCount,
        ignoredEntryCount,
        archiveBytes: quarantinedBytes.byteLength,
      },
    };
  } catch (error) {
    primaryError = error;
  } finally {
    if (stored) {
      try {
        await options.quarantine.delete(object);
        cleanup = "completed";
      } catch {
        cleanup = "failed";
        primaryError = new IngestionError("ZIP_CLEANUP_FAILED");
        result = undefined;
      }
    }
  }

  const reasonCode = primaryError instanceof Error && "code" in primaryError
    ? String(primaryError.code)
    : primaryError
      ? "INTERNAL_ERROR"
      : undefined;
  if (reasonCode === "ZIP_SECURITY_SCAN_UNAVAILABLE" || reasonCode === "ZIP_CLEANUP_FAILED") {
    const type = reasonCode === "ZIP_CLEANUP_FAILED"
      ? "ingestion.cleanup_failed"
      : "ingestion.security_scanner_unavailable";
    try {
      await options.operationalAlerts.alert({
        type,
        occurredAt: new Date().toISOString(),
        scanId: options.scanId,
        tenantId: principal.tenantId,
        actorId: principal.userId,
        reasonCode,
      });
    } catch {
      primaryError = new IngestionError("ZIP_ALERT_UNAVAILABLE");
      result = undefined;
    }
  }
  try {
    await options.auditEvents.record({
      type: "ingestion.completed",
      occurredAt: new Date().toISOString(),
      scanId: options.scanId,
      tenantId: principal.tenantId,
      actorId: principal.userId,
      outcome: ingestionOutcome(reasonCode),
      reasonCode,
      archiveBytes: options.archiveBytes.byteLength,
      acceptedFileCount,
      ignoredEntryCount,
      cleanup,
    });
  } catch {
    primaryError = new IngestionError("ZIP_AUDIT_UNAVAILABLE");
    result = undefined;
  }

  if (primaryError) throw primaryError;
  if (!result) throw new ZipInspectionError("ZIP_STRUCTURE_INVALID");
  return result;
}
