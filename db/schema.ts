export const CREATE_INGESTION_AUDIT_EVENTS = `
CREATE TABLE IF NOT EXISTS ingestion_audit_events (
  scan_id TEXT PRIMARY KEY,
  occurred_at TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  outcome TEXT NOT NULL,
  reason_code TEXT,
  archive_bytes INTEGER NOT NULL,
  accepted_file_count INTEGER NOT NULL,
  ignored_entry_count INTEGER NOT NULL,
  cleanup TEXT NOT NULL
) STRICT
`.trim();

export const CREATE_OPERATIONAL_ALERT_OUTBOX = `
CREATE TABLE IF NOT EXISTS operational_alert_outbox (
  event_id TEXT PRIMARY KEY,
  occurred_at TEXT NOT NULL,
  event_type TEXT NOT NULL,
  scan_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  reason_code TEXT NOT NULL,
  delivery_state TEXT NOT NULL DEFAULT 'pending'
) STRICT
`.trim();

export const CREATE_OPERATIONAL_ALERT_PENDING_INDEX = `
CREATE INDEX IF NOT EXISTS operational_alert_pending_idx
ON operational_alert_outbox (delivery_state, occurred_at)
`.trim();
