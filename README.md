# Production Lens

Production Lens statically scans an AI application repository and explains evidence-backed production-readiness gaps. This hackathon milestone includes one reliable end-to-end demo using an intentionally incomplete enterprise analytics agent.

## What works

- One-click scan of the bundled sample
- Eleven deterministic findings across authorization, sensitive data, observability, evaluations, reliability, prompts, code security, and supply-chain hygiene
- File and line evidence with suspected-secret redaction
- Prioritized result cards and a detailed severity/evidence/impact/remediation view
- Approved extension, safe path, file count, and byte-limit controls
- Indirect prompt-injection detection while keeping repository text inert
- Submitted-code checks for dangerous dynamic execution and missing dependency lockfiles
- Explicitly approved remediation of the sensitive-logging finding in a disposable copy
- Deterministic rescan and before/after verification without executing sample code
- Security headers, a maintained threat model, and dependency audit automation
- Automated expected-finding, snapshot-parity, redaction, and limit tests

Scanned code is treated as untrusted text and is never imported or executed.

## Run locally

Requirements: Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`, select **Scan sample project**, and select findings to inspect their evidence and remediation.

## Verify

```bash
npm test
npm run build
npm run security:check
```

## Repository map

- `app/` — Production Lens pages
- `lib/scanner/` — deterministic scanner and bundled text snapshot
- `samples/enterprise-analytics-agent/` — intentionally incomplete sample repository
- `tests/` — scanner and security-boundary tests
- `PROJECT.md` — stable product scope
- `AGENTS.md` — repository working instructions
- `docs/implementation-plan.md` — milestone plan and risks
- `docs/threat-model.md` — trust boundaries, threats, controls, and residual risks
- `SECURITY.md` — security posture and future LLM boundary requirements

## Intentionally not implemented yet

GPT analysis, Codex remediation, repository upload, authentication, external integrations, dashboards, and before/after rescanning are later milestones.
