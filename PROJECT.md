# Production Lens

## Product purpose

Production Lens explains why an AI application or agent is not ready for production. It statically inspects an untrusted repository, reports evidence-backed gaps, and recommends prioritized remediation.

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
