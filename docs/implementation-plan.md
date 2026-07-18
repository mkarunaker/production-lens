# First milestone implementation plan

## Architecture

Production Lens is a two-route Next.js application. The home route introduces the bundled sample and starts a deterministic scan. The results route runs pure rules over a bundled, text-only snapshot of the sample repository and renders prioritized findings.

The canonical sample remains under `samples/enterprise-analytics-agent`. A build-safe text snapshot is kept in `lib/scanner/sample-bundle.ts`; tests assert that it exactly matches the canonical files. This lets the deployed demo scan the same source without relying on runtime filesystem access and without importing or executing the sample.

## Delivery increments

1. Establish scope, safety rules, and repository conventions.
2. Create the intentionally incomplete sample and expected-findings manifest.
3. Implement typed scanner inputs, limits, redaction, and deterministic rules.
4. Test the known findings and security boundaries.
5. Build the scan and results experience.
6. Validate tests and production build; document the demo.

## Incremental scanner expansion

Post-MVP scanner coverage is tracked in `docs/injection-rule-pack.md`. Injection and interpreter-safety rules are added in evaluated waves and must meet the repository-wide evaluation gates before their coverage status changes.

## Secure ingestion expansion

The hosted ingestion boundary is ZIP-only. Its approved limits, rejected archive features, isolation requirements, failure semantics, and acceptance-test corpus are defined in `docs/secure-ingestion-contract.md`.

Implementation proceeds metadata-first: inspect and reject unsafe archives before extraction, then add isolated bounded text materialization. No upload UI is permitted until authentication, ownership authorization, quarantine, malware scanning, rate controls, cleanup, and audit logging pass their gates.

## Deterministic rules

- shared service-account credential
- missing requesting-user authorization
- missing model/tool-call audit logging
- missing evaluation dataset/framework
- missing timeout and retry handling
- prompt embedded in source
- sensitive customer data written to logs
- missing human review for sensitive requests

## Assumptions

- Milestone 1 accepts only the bundled sample.
- No Production Lens database is needed.
- A scan is synchronous and small enough for a request/render cycle.
- Static rules may be sample-oriented as long as rule IDs and evidence are stable.

## Completion risks and mitigations

- **Line drift:** derive line numbers during scanning and validate rule IDs with a manifest.
- **Untrusted code execution:** represent repository contents only as strings; never dynamically import them.
- **Secret leakage:** redact evidence before returning findings.
- **Oversized or binary input:** enforce extension, per-file, file-count, and aggregate limits.
- **Deployment filesystem mismatch:** use an exact, test-verified source snapshot for the hosted demo.
