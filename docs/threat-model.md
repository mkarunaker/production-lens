# Threat model

## Assets

- Scanned source and configuration
- Credentials or personal data accidentally present in source
- Integrity of findings and severity
- Production Lens build and deployment
- Future remediation changes

## Trust boundaries

1. **Repository input → scanner:** hostile text crosses into bounded deterministic parsing.
2. **Scanner → results UI:** redacted structured findings cross into React text rendering.
3. **Browser → deployed worker:** public HTTP requests cross into a stateless application.
4. **Future upload worker → owner-scoped quarantine:** untrusted archive bytes cross into private temporary storage through a narrow put/read/delete interface. The worker has no external communication, model, execution, or consequential-action authority.
5. **Quarantine → security scanner:** bounded archive bytes cross into a required fail-closed malware/secret-scanning interface. Scanner rejection, outage, timeout, or cancellation cannot produce repository files.
6. **Future model boundary:** not present in the active path; it must remain non-privileged when added.

Every architecture revision must explicitly evaluate the lethal trifecta: private-data access, untrusted-content processing, and external communication or consequential action must not coexist in one uncontrolled trust domain.

## Principal threats and controls

| Threat | Current control | Residual risk |
| --- | --- | --- |
| Executing malicious repository code | No imports, child processes, package installation, or eval; source is string data | Future parsers must preserve this invariant |
| Path traversal | Relative-path validation rejects `..`, absolute paths, and NUL | Unicode/path normalization needs reassessment for uploads |
| Resource exhaustion | File-count, per-file, aggregate byte, and process-local rate/quota/concurrency limits | Shared multi-instance admission state is needed before uploads |
| Cross-user or cross-tenant access | Principal validation and owner/tenant authorization policy cover every declared object action; ingestion derives quarantine ownership from the principal | No persisted upload/result routes or deployment-backed authorization store exist yet |
| Quarantine retention after failure | Lifecycle orchestration deletes owner-scoped objects after success, rejection, scanner outage, timeout, cancellation, and parser failure; cleanup failure blocks success | No deployment-backed quarantine adapter or operational alert exists yet |
| Malware or secrets in uploads | A required security-scanner interface fails closed before materialization | No production malware/secret scanner is connected yet |
| Source or secret leakage through operations data | Typed ingestion events exclude paths and source; regression tests use a suspected API key and assert it never reaches audit or alert records | No durable production sink, access policy, or retention control exists yet |
| Silent scanner or cleanup failure | Required alert events are emitted for scanner outage and cleanup failure; unavailable delivery fails closed | No paging route, incident procedure, or emergency-disable integration exists yet |
| Secret disclosure | Evidence redaction and bounded single-line evidence | Pattern-based redaction cannot identify every secret format |
| Indirect prompt injection | No LLM in current path; deterministic warning rule | Future LLMs remain probabilistic and need capability isolation |
| Malicious submitted code | Static checks flag dynamic execution and dependency hygiene; submitted code is never run | Deterministic rules are intentionally incomplete and require ongoing expansion |
| XSS from source evidence | React text escaping plus restrictive CSP and MIME controls | CSP must be regression-tested after UI framework changes |
| Supply-chain compromise | Lockfile, dependency audit, minimal dependencies | Advisories and compromised packages require continuous review |
| Clickjacking/cross-origin abuse | CSP `frame-ancestors`, X-Frame-Options, COOP/CORP | Hosting/auth changes may require policy adjustments |

## Non-goals

The current application does not claim formal verification, complete secret detection, complete vulnerability discovery, or foolproof prompt-injection prevention.
