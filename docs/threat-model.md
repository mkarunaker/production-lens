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
4. **Future model boundary:** not present in milestone 1; must remain non-privileged when added.

## Principal threats and controls

| Threat | Current control | Residual risk |
| --- | --- | --- |
| Executing malicious repository code | No imports, child processes, package installation, or eval; source is string data | Future parsers must preserve this invariant |
| Path traversal | Relative-path validation rejects `..`, absolute paths, and NUL | Unicode/path normalization needs reassessment for uploads |
| Resource exhaustion | File-count, per-file, and aggregate byte limits | Request-level rate limits are needed before uploads |
| Secret disclosure | Evidence redaction and bounded single-line evidence | Pattern-based redaction cannot identify every secret format |
| Indirect prompt injection | No LLM in current path; deterministic warning rule | Future LLMs remain probabilistic and need capability isolation |
| XSS from source evidence | React text escaping plus restrictive CSP and MIME controls | CSP must be regression-tested after UI framework changes |
| Supply-chain compromise | Lockfile, dependency audit, minimal dependencies | Advisories and compromised packages require continuous review |
| Clickjacking/cross-origin abuse | CSP `frame-ancestors`, X-Frame-Options, COOP/CORP | Hosting/auth changes may require policy adjustments |

## Non-goals

The current application does not claim formal verification, complete secret detection, complete vulnerability discovery, or foolproof prompt-injection prevention.
