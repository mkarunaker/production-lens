# Deployment storage decision

Status: approved design, adapters implemented against local contract fakes, resources not provisioned.

## Decision

Use the existing Sites/Cloudflare deployment surface:

- **R2** stores bounded ZIP quarantine bytes under `quarantine/{tenant}/{owner}/{scan}.zip`.
- **D1** stores ingestion ownership metadata, content-free audit events, and a durable operational-alert outbox.
- **ChatGPT-host authentication headers** identify the requesting user; server authorization derives tenant and owner scope and never trusts a client-supplied owner.

The logical D1 and R2 bindings remain `null` in `.openai/hosting.json` until provisioning is explicitly approved. No upload route is added by this decision.

## Why

- The current Sites project already supports logical D1 and R2 bindings.
- R2 is designed for uploaded blobs and provides strongly consistent reads and deletes through its Workers binding.
- D1 supports prepared bound statements and transactional batches for structured ownership and operational records.
- Keeping quarantine bytes out of D1 prevents source from entering searchable operational tables.
- A D1 alert outbox preserves a durable internal security event without adding a real external alert integration in the MVP.

## Deferred choices

- A real malware and secret-scanning service
- Distributed admission atomicity under multi-instance concurrency
- Alert-outbox delivery and dead-letter handling
- R2 lifecycle-rule provisioning and cleanup alerts
- Retention duration and jurisdiction
- Emergency-disable control

Durable Objects may be reconsidered for atomic per-tenant coordination if D1 conditional updates do not meet the evaluated concurrency gate. Queues may be reconsidered for alert delivery only after a real destination and dead-letter procedure are approved.

## Security invariants

- R2 keys are derived only from validated tenant, owner, and opaque scan identifiers.
- Cross-owner reads resolve to different keys and fail closed.
- Quarantine deletion is explicit after every terminal path and idempotent.
- D1 writes use bound prepared-statement values.
- Audit and alert tables contain no archive bytes, repository paths, source excerpts, or suspected secrets.
- Adapter failure cannot turn a rejected ingestion into success.
- No repository content is executed, installed, rendered, or sent to a model.

## Evaluation gate

Before provisioning or uploads:

1. Approve retention duration, jurisdiction, malware/secret scanner, and alert destination.
2. Add D1 migrations and bind D1/R2 through Sites.
3. Validate R2 owner isolation, exact read-after-write, delete verification, lifecycle expiry, and cleanup alerts.
4. Validate D1 uniqueness, ordering, retry/idempotency, cross-tenant denial, and multi-instance concurrency.
5. Exercise alert-outbox delivery, retry, dead-letter, and emergency-disable behavior.
