export type IngestionOutcome =
  | "accepted"
  | "rejected"
  | "cancelled"
  | "timed_out"
  | "failed";

export type IngestionAuditEvent = {
  type: "ingestion.completed";
  occurredAt: string;
  scanId: string;
  tenantId: string;
  actorId: string;
  outcome: IngestionOutcome;
  reasonCode?: string;
  archiveBytes: number;
  acceptedFileCount: number;
  ignoredEntryCount: number;
  cleanup: "not_required" | "completed" | "failed";
};

export type OperationalAlert = {
  type: "ingestion.security_scanner_unavailable" | "ingestion.cleanup_failed";
  occurredAt: string;
  scanId: string;
  tenantId: string;
  actorId: string;
  reasonCode: string;
};

export interface AuditEventSink {
  record(event: IngestionAuditEvent): Promise<void>;
}

export interface OperationalAlertSink {
  alert(event: OperationalAlert): Promise<void>;
}

export function ingestionOutcome(reasonCode?: string): IngestionOutcome {
  if (!reasonCode) return "accepted";
  if (reasonCode === "ZIP_OPERATION_CANCELLED") return "cancelled";
  if (reasonCode === "ZIP_OPERATION_TIMED_OUT") return "timed_out";
  if (
    reasonCode === "ZIP_SECURITY_SCAN_REJECTED" ||
    reasonCode.startsWith("ZIP_")
  ) {
    return "rejected";
  }
  return "failed";
}
