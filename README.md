# Production Lens

Production Lens is a developer tool that statically inspects an AI application repository and explains why it is not ready for production. It turns vague launch concerns into prioritized, evidence-backed findings with concrete remediation and verification steps.

**Hackathon category:** Developer Tools

**Live demo:** https://production-lens.karunaker-molugu.chatgpt.site

## The problem

Teams can build impressive AI pilots quickly, but production readiness is harder to prove. Authorization, prompt injection, unsafe interpreters, sensitive logging, missing evaluations, reliability gaps, and weak human oversight often live across code and configuration. Generic checklists do not show where the problem is or how to verify a safe fix.

Production Lens treats repository code as hostile data, scans it without executing it, and connects every finding to deterministic evidence and five release-readiness principles:

1. Own it
2. Prove it
3. Contain it
4. Trace and reverse it
5. Break the lethal trifecta

## The complete demo workflow

1. Select one of two bundled AI-agent repositories.
2. Run a deterministic static scan without importing, installing, building, or executing repository code.
3. Review prioritized findings with severity, category, file, line, evidence, impact, readiness principles, and remediation.
4. Inspect the technology inventory and the evidence state of every catalog check.
5. Select a finding and review one exact deterministic patch.
6. Explicitly approve or defer the change.
7. Apply an approved patch only to a disposable in-memory copy.
8. Rescan and compare resolved, remaining, and newly introduced findings.
9. Reset to the exact canonical baseline.

The Enterprise Analytics Agent demonstrates an **11 → 10** remediation. The Security Test Agent demonstrates a **7 → 6** injection remediation.

## What is implemented

- Eleven deterministic production-readiness findings for the enterprise sample
- Seven evaluated injection findings for the security sample
- Sanitized hosted Chief of Staff Python demo fixture (credentials, tokens, virtualenvs, caches, and Git data excluded)
- Line-level evidence with suspected-secret redaction
- Technology inventory and explicit applicability/evidence states
- Prompt-injection, dynamic-execution, lockfile, SQL/ORM, OS-command, argument, NoSQL, and unsafe-HTML checks for declared evaluated patterns
- Deterministic remediation proposals for every bundled finding
- Explicit approval, disposable-copy mutation, rescan, comparison, and reset
- Mandatory self-scan of Production Lens application source
- ZIP metadata inspection, bounded in-memory materialization, and a localhost-only ZIP test harness with path, collision, special-entry, compression-bomb, CRC, UTF-8, NUL, and disguised-archive defenses
- Owner/tenant authorization and rate, quota, concurrency, and replay policy boundaries
- Source-free audit and operational-alert contracts
- A formal release-blocking adversarial corpus with stable fixture IDs
- Security headers, threat model, evaluation gates, and dependency auditing

Hosted arbitrary uploads and runtime GPT analysis are deliberately disabled until their isolation, authorization, operational, and adversarial gates are complete. The hosted UI includes a fixed sanitized Chief of Staff demo fixture; it is selected by an allowlisted demo ID, not an arbitrary user upload.

## Try it without rebuilding

Open the [private live demo](https://production-lens.karunaker-molugu.chatgpt.site) and sign in with ChatGPT if prompted.

1. Choose **Scan sample project**.
2. Confirm the Enterprise baseline contains 11 findings.
3. Open **Customer records may be written to application logs**.
4. Choose **Review remediation options**.
5. Review the exact patch, check the approval box, and apply it.
6. Confirm the comparison shows 11 → 10, one resolved finding, and no new findings.
7. Reset and confirm the baseline returns to 11.
8. Repeat with **Scan security test project** to inspect seven injection findings.

No credentials beyond the hosting platform’s normal ChatGPT sign-in are required.

## Installation

### Requirements

- Node.js 22.13 or newer
- npm
- macOS, Linux, or Windows with a Node.js-compatible shell

The hosted build targets a Cloudflare Worker through Vinext. Local scanning and tests do not require Cloudflare credentials.

The hosted demo provides three sanitized ZIP downloads under `public/demo-archives/`. Judges may download one, select it in the upload control, and click **Run Lens**. The hosted control accepts only those provided demo filenames; use `npm run demo:zip` for custom local ZIPs.

### Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

### Test a local AI-agent ZIP

```bash
npm run demo:zip
```

Open `http://127.0.0.1:4317`, choose a `.zip`, and select **Validate and scan ZIP**. This standalone development harness accepts at most 10 MiB, materializes approved text in memory, and never extracts, imports, installs, builds, or executes repository code. It binds only to localhost, refuses `NODE_ENV=production`, makes no model or external network calls, and stores no archive or result. It is intentionally absent from the hosted demo.

### Production-like verification

```bash
npm test
npm run build
npm run security:check
```

`npm run security:check` runs the complete automated suite, dependency audit, production build, and production-server golden-path test.

## Sample data

Both samples are bundled and inert:

- `samples/enterprise-analytics-agent/` — intentionally incomplete analytics agent
- `lib/scanner/security-sample-bundle.ts` — intentionally vulnerable injection test agent

Tests assert that bundled snapshots match their canonical source and expected finding manifests.

## Supported platforms and scope

- Browser UI: current desktop and mobile browsers supported by the deployed Next.js/Vinext application
- Local development: Node.js 22.13+ on macOS, Linux, and Windows
- Evaluated scanner languages: declared high-signal Python, JavaScript/TypeScript, React/browser, SQL, configuration, and Markdown patterns
- Archive input contract: ZIP only; local ZIP testing is available and hosted arbitrary upload remains disabled

Production Lens does not claim universal language coverage or perfect security.

## How Codex accelerated development

Codex was the primary engineering collaborator throughout Build Week. It:

- Translated the product idea into milestones, trust boundaries, and evaluation gates
- Built the scanner, UI, deterministic sample snapshots, and expected-finding tests
- Added evidence redaction, file/path limits, security headers, and self-scan invariants
- Expanded injection coverage using paired vulnerable and secure-equivalent fixtures
- Built explicit remediation approval, disposable-copy patching, rescan, comparison, and reset
- Implemented secure ZIP inspection and bounded materialization without executing repository code
- Developed authorization, admission, audit, alert, and adversarial-evaluation boundaries
- Repeatedly ran tests, production builds, dependency audits, and end-to-end checks

The repository’s dated commits show the Build Week progression from the first scanner through the complete remediation workflow and security boundaries.

## How GPT-5.6 contributed

GPT-5.6 was used through Codex for the complex work: security architecture, threat modeling, deterministic rule design, remediation safety, adversarial fixtures, authorization boundaries, operational failure handling, and release-readiness review.

The project uses the GPT-5.6 family deliberately:

- **Terra** is the project’s everyday development default.
- **Luna** is reserved for bounded, repeatable tasks such as documentation and mechanical fixtures.
- **Sol** is used for ambiguous, security-critical design and final review.

GPT-5.6 is not treated as a production security boundary. The demo’s scan results and remediation verification remain deterministic, testable, and reproducible.

## Key product and engineering decisions

- **Evidence over checklists:** every finding must point to deterministic evidence and actionable verification.
- **Never execute scanned code:** repository content is data, including comments and embedded instructions.
- **Code outranks claims:** Markdown cannot suppress application-code findings.
- **Explicit evidence states:** implemented-but-unverified and documented-only controls are not silently marked safe.
- **Human approval before mutation:** remediation requires an exact patch and explicit approval.
- **Disposable changes:** the canonical sample never changes during the demo.
- **Prove the fix:** success requires rescan, no new findings, preserved unrelated behavior, and reset.
- **Bound capability:** uploads and runtime model analysis remain disabled until their security gates pass.

## Built during OpenAI Build Week

Production Lens was created during the submission period beginning July 13, 2026. The first repository commit is dated July 17, 2026. The complete scanner, UI, remediation, rescan, security hardening, ingestion boundaries, authorization policies, operational contracts, and adversarial gate were developed during Build Week using Codex and GPT-5.6.

## Repository map

- `app/` — product UI and routes
- `lib/scanner/` — deterministic scanner behavior
- `lib/remediation/` — deterministic disposable-copy remediation
- `lib/ingestion/` — secure ZIP inspection and ingestion boundaries
- `lib/security/` — headers, authorization, admission, audit, and alert policies
- `samples/` — inert bundled sample repository
- `tests/` — functional, security, adversarial, self-scan, and E2E tests
- `docs/demo-script.md` — narrated demo and recovery runbook
- `docs/evaluation-gates.md` — mandatory release evaluations
- `docs/production-readiness-principles.md` — governing doctrine
- `docs/threat-model.md` — trust boundaries and residual risks
- `docs/project-status.md` — current milestone checkpoint

## License

Licensed under the MIT License. See `LICENSE`.
