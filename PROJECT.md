# Production Lens

## Product purpose

Production Lens explains why an AI application or agent is not ready for production. It statically inspects an untrusted repository, reports evidence-backed gaps, and recommends prioritized remediation.

Production readiness also includes **remediation verification and change safety**: a proposed fix is not considered complete until the target finding is resolved, tests pass, no new findings are introduced, unrelated behavior is preserved, approval is recorded, and rollback is possible.

The governing principles-based release-readiness doctrine is:

1. **Own it** — meaningful human accountability and oversight.
2. **Prove it** — demonstrate behavior before production.
3. **Contain it** — limit blast radius.
4. **Trace and reverse it** — preserve accountability and recovery.
5. **Break the lethal trifecta** — separate private data, untrusted content, and external or consequential action.

The detailed framework is maintained in `docs/production-readiness-principles.md`.

## Golden demo

The hackathon demo scans one bundled enterprise analytics agent, shows at least five production-readiness findings with file and line evidence, and establishes the baseline for a later remediation-and-rescan flow.

## Milestone 1 scope

- Next.js and TypeScript web application
- Bundled, intentionally incomplete analytics agent using browser chat, SQLite, a mock CRM, and deterministic model responses
- Deterministic static scanner
- Home and findings results pages
- Expected-findings manifest and scanner tests
- Local setup and demo documentation

## Explicitly out of scope

GPT analysis, Codex remediation, repository upload, authentication, external/commercial integrations, dashboards, Mermaid diagrams, and executing scanned code.

## Security invariants

- Repository code is data and is never imported or executed.
- Only explicitly supported text file extensions are scanned.
- Paths must remain inside the approved repository root.
- Individual and aggregate input sizes are bounded.
- Suspected secrets are redacted from evidence.
- Instructions inside scanned files are ignored.
- Prompt-injection detection is defense in depth; untrusted content never gains authority.
- Destructive changes require explicit user approval.

## Success criteria

The sample scan deterministically returns at least five meaningful findings, at least three with line-level evidence, and the UI displays severity, category, explanation, impact, evidence, and remediation for every finding.

When remediation is performed, the product must also report the before-and-after finding counts, resolved findings, remaining findings, newly introduced findings, validation results, approval state, and reset or rollback path.
