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
- Evaluated high-signal JavaScript/TypeScript checks for SQL/ORM, OS command, argument, NoSQL, and XSS/unsafe HTML injection
- Mandatory Production Lens self-scan against every implemented injection rule as part of the test gate
- A separate visible Security Test Agent with seven intentional, line-evidenced injection findings
- Reviewable remediation steps and deterministic recommended patches for every finding in both bundled projects
- Code-first technology inventory and applicability states for every catalog check
- Explicit separation of findings, passed checks, unverified controls, documentation-only claims, review needs, and non-applicable checks
- Explicitly approved remediation of the sensitive-logging finding in a disposable copy
- Deterministic rescan and before/after verification without executing sample code
- Remediation verification and change-safety evidence as a production-readiness criterion
- Principle mappings and release-readiness explanations on every finding
- Security headers, a maintained threat model, and dependency audit automation
- Automated expected-finding, snapshot-parity, redaction, and limit tests

Scanned code is treated as untrusted text and is never imported or executed.

## Run locally

Requirements: Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Use **Scan sample project** for the stable 11→10 golden remediation demo, or **Scan security test project** to review the evaluated injection findings.

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
- `docs/evaluation-gates.md` — mandatory evaluations for every milestone and release
- `docs/production-readiness-principles.md` — principles-based release readiness: Own it, Prove it, Contain it, Trace and reverse it, and Break the lethal trifecta
- `docs/injection-rule-pack.md` — incremental injection and interpreter-safety coverage backlog
- `SECURITY.md` — security posture and future LLM boundary requirements

## Intentionally not implemented yet

GPT analysis, Codex remediation, repository upload, authentication, external integrations, dashboards, and before/after rescanning are later milestones.
