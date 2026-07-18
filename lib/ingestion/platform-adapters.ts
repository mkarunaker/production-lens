import type { QuarantineObject, QuarantineStore } from "./ingest-archive";
import type {
  AuditEventSink,
  IngestionAuditEvent,
  OperationalAlert,
  OperationalAlertSink,
} from "../security/operational-events";

type R2ObjectBodyLike = {
  arrayBuffer(): Promise<ArrayBuffer>;
};

export interface R2BucketLike {
  put(
    key: string,
    value: Uint8Array,
    options: { customMetadata: Record<string, string> },
  ): Promise<unknown>;
  get(key: string): Promise<R2ObjectBodyLike | null>;
  delete(key: string): Promise<void>;
}

type D1RunResultLike = {
  success?: boolean;
};

interface D1BoundStatementLike {
  run(): Promise<D1RunResultLike>;
}

interface D1PreparedStatementLike {
  bind(...values: unknown[]): D1BoundStatementLike;
}

export interface D1DatabaseLike {
  prepare(sql: string): D1PreparedStatementLike;
}

function validIdentifier(value: string) {
  return value.length > 0 && value.length <= 128 && /^[a-zA-Z0-9_-]+$/.test(value);
}

function requireObjectIdentifiers(object: QuarantineObject) {
  if (
    !validIdentifier(object.tenantId) ||
    !validIdentifier(object.ownerId) ||
    !validIdentifier(object.scanId)
  ) {
    throw new Error("QUARANTINE_SCOPE_INVALID");
  }
}

function quarantineKey(object: QuarantineObject) {
  requireObjectIdentifiers(object);
  return `quarantine/${object.tenantId}/${object.ownerId}/${object.scanId}.zip`;
}

export class R2QuarantineStore implements QuarantineStore {
  constructor(private readonly bucket: R2BucketLike) {}

  async put(object: QuarantineObject, bytes: Uint8Array) {
    const key = quarantineKey(object);
    await this.bucket.put(key, bytes, {
      customMetadata: {
        tenantId: object.tenantId,
        ownerId: object.ownerId,
        scanId: object.scanId,
        state: "quarantined",
      },
    });
  }

  async read(object: QuarantineObject) {
    const stored = await this.bucket.get(quarantineKey(object));
    if (!stored) throw new Error("QUARANTINE_OBJECT_MISSING");
    return new Uint8Array(await stored.arrayBuffer());
  }

  async delete(object: QuarantineObject) {
    await this.bucket.delete(quarantineKey(object));
  }
}

const INSERT_AUDIT_EVENT = `
INSERT INTO ingestion_audit_events (
  scan_id, occurred_at, tenant_id, actor_id, outcome, reason_code,
  archive_bytes, accepted_file_count, ignored_entry_count, cleanup
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`.trim();

const INSERT_ALERT_OUTBOX_EVENT = `
INSERT INTO operational_alert_outbox (
  event_id, occurred_at, event_type, scan_id, tenant_id, actor_id, reason_code
) VALUES (?, ?, ?, ?, ?, ?, ?)
`.trim();

function requireWrite(result: D1RunResultLike) {
  if (result.success === false) throw new Error("D1_WRITE_FAILED");
}

export class D1AuditEventSink implements AuditEventSink {
  constructor(private readonly database: D1DatabaseLike) {}

  async record(event: IngestionAuditEvent) {
    const result = await this.database.prepare(INSERT_AUDIT_EVENT).bind(
      event.scanId,
      event.occurredAt,
      event.tenantId,
      event.actorId,
      event.outcome,
      event.reasonCode ?? null,
      event.archiveBytes,
      event.acceptedFileCount,
      event.ignoredEntryCount,
      event.cleanup,
    ).run();
    requireWrite(result);
  }
}

export class D1OperationalAlertSink implements OperationalAlertSink {
  constructor(
    private readonly database: D1DatabaseLike,
    private readonly eventId: () => string,
  ) {}

  async alert(event: OperationalAlert) {
    const id = this.eventId();
    if (!validIdentifier(id)) throw new Error("ALERT_EVENT_ID_INVALID");
    const result = await this.database.prepare(INSERT_ALERT_OUTBOX_EVENT).bind(
      id,
      event.occurredAt,
      event.type,
      event.scanId,
      event.tenantId,
      event.actorId,
      event.reasonCode,
    ).run();
    requireWrite(result);
  }
}
