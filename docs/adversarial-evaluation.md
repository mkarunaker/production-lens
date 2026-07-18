# Production Lens adversarial evaluation

Status: in progress. The first release-blocking deterministic corpus is executable; model-specific and deployment-infrastructure corpora remain pending.

## Purpose

Milestone 7 converts hostile-input tests into a stable release gate. Every evaluated fixture has a durable ID, one expected fail-safe outcome, an executable regression test, and blocking status in `tests/adversarial-corpus.json`.

The gate maps to:

- **Prove it:** hostile and malformed cases must demonstrate their expected outcomes on every change.
- **Contain it:** authorization bypass, cleanup residue, and resource-limit failure have zero tolerance.
- **Trace and reverse it:** fixture IDs and expected outcomes are versioned and reviewable.
- **Break the lethal trifecta:** scanned content cannot gain execution or suppress deterministic controls, and operational records cannot disclose repository source.

## Current release thresholds

- 100% of blocking fixtures pass.
- Zero authorization bypasses.
- Zero repository-source or suspected-secret leakage events.
- Zero quarantine cleanup residue events in evaluated terminal paths.
- Zero scanned-code executions.

Any threshold violation blocks release. There is no weighted score or exception based on passing unrelated fixtures.

## Evaluated families

- Archive paths, normalized collisions, special types, nested/disguised archives, bombs, and size/count/depth limits
- Cross-owner, cross-tenant, malformed-principal, and ingestion ownership authorization
- Rate, quota, concurrency, replay, and subject-isolation behavior
- Scanner outage, cancellation, timeout, cleanup failure, audit failure, and alert failure
- Operational source/secret exfiltration
- Repository prompt instructions attempting to suppress deterministic findings
- Negative proof that inert repository text is not executed during materialization
- R2 owner scoping and identifier containment plus D1 bound, source-free, fail-closed writes

## Intentionally not yet evaluated

- Deployment-backed quarantine isolation, retention, and multi-instance cleanup
- Distributed admission atomicity and race behavior
- Durable audit ordering, retry, access control, and retention
- Real malware and secret-scanner quality
- Encoded, obfuscated, fragmented, and multi-file prompt-injection corpora
- GPT model manipulation, tool misuse, schema evasion, and denial-of-wallet
- Cross-tenant behavior across future upload, result, remediation, and deletion routes
- External penetration testing

## Exact next gate

Before uploads are exposed, connect the control interfaces to selected deployment services and add adversarial integration fixtures for owner isolation, atomic quotas, concurrency races, replay across instances, cleanup on worker termination, scanner outage, audit ordering, alert delivery, retention, and emergency disable.
