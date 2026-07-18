# Production Lens security policy

## Security posture

Production Lens treats every scanned repository as hostile input. The hosted application scans only bundled samples and does not execute repository code, call a model, accept uploads, or mutate scanned projects. A separate localhost-only development harness can scan a bounded ZIP in memory.

Security is a maintained risk-management process, not a claim of perfect protection. Controls must be tested continuously and reassessed whenever uploads, LLM analysis, remediation, authentication, persistence, or external integrations are introduced.

## Core controls

- Repository files are represented only as strings and are never dynamically imported or executed.
- Approved text extensions, relative path containment, file-count limits, per-file limits, and aggregate byte limits are enforced before rules run.
- Suspected credentials are redacted before evidence is returned.
- Prompt-like instructions inside repository content are treated as data. Deterministic detection can flag common direct and indirect prompt-injection patterns, but detection is not considered a security boundary.
- Every accepted repository file is also evaluated for code-security and supply-chain rules; current coverage includes dynamic execution primitives and missing dependency lockfiles.
- The deployed worker adds CSP, anti-framing, MIME-sniffing, referrer, permissions, cross-origin isolation, and HSTS headers.
- Runtime dependency auditing and regression tests are available through `npm run security:check`.

## LLM boundary for a future milestone

Before any model analysis is enabled:

1. Keep system instructions and repository data in structurally separate channels.
2. Give the analysis model no write, shell, network, or repository-tool authority.
3. Require schema-constrained output and validate it deterministically.
4. Treat model findings as untrusted proposals, never authorization decisions.
5. Re-run deterministic controls after model analysis and before remediation.
6. Require explicit human approval for writes and high-impact actions.
7. Add adversarial evaluations for direct, indirect, encoded, obfuscated, and multi-turn injection attempts.
8. Log redacted security decisions without storing repository secrets or sensitive source.

## Repository upload boundary

The hosted upload design is ZIP-only and governed by `docs/secure-ingestion-contract.md`. No upload interface may be enabled until archive inspection, bomb and path defenses, private quarantine, authentication, object authorization, malware scanning, rate controls, cleanup, and adversarial tests are implemented and passing.

A standalone local test harness is available through `npm run demo:zip`. It binds to `127.0.0.1`, refuses production mode, accepts a length-declared ZIP body of at most 10 MiB, uses the bounded in-memory materializer, and neither persists nor executes repository content. It has no authentication, quarantine, malware scanner, distributed admission control, or production authorization; those omissions are why it must not be exposed as a hosted route or network service.

A browser or API client must never submit a server filesystem path. Local directory scanning is reserved for a future separately distributed local CLI with its own containment contract.

## Vulnerability management

- Run `npm run security:check` before release.
- Review all high or critical advisories before deployment.
- Moderate and lower findings require documented reachability and impact review.
- Reassess the threat model at each scope expansion.

## Reporting

Do not include secrets, private repository contents, or exploit payloads in a public report. Provide a minimal reproduction, affected component, impact, and suggested mitigation through the project owner's private reporting channel.
