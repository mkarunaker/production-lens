# Production Lens Devpost submission draft

This is an editing draft. Rewrite a few phrases in your own voice before pasting it into Devpost.

## Category

Developer Tools

## Project description

### Inspiration

Teams can build an AI pilot in days, but proving that it is ready for production is much harder. The important gaps are scattered across application code, prompts, authorization, logging, evaluation, reliability, and operational controls. A checklist can say what should exist, but it usually cannot show the exact evidence or prove that a proposed fix worked.

I built Production Lens to make that gap visible and actionable.

### What it does

Production Lens statically scans an AI application repository without executing it. It returns prioritized production-readiness findings with severity, category, file and line evidence, impact, governing readiness principles, and concrete remediation.

The demo includes two bundled projects. The Enterprise Analytics Agent exposes 11 production-readiness gaps. The Security Test Agent exposes seven evaluated injection risks. For every bundled finding, a user can review one deterministic recommended patch, explicitly approve or defer it, apply it only to a disposable copy, rescan, compare resolved and remaining findings, detect newly introduced risks, and reset to the exact baseline.

### How I built it

Production Lens is a TypeScript and Next.js application deployed through Vinext on a Cloudflare Worker. Scanner behavior is isolated in `lib/scanner`; UI components contain no detection logic. Repositories are represented as bounded text and are never imported, installed, built, or executed.

The scanner uses stable rule IDs, centralized file and byte limits, secret redaction, deterministic evidence, technology applicability states, and an inert self-scan of Production Lens itself. The remediation engine requires exact before-text, explicit approval, disposable-copy mutation, and deterministic rescan verification.

I also built and evaluated the secure boundary for future ZIP ingestion: path and collision rejection, special-entry checks, compression-bomb limits, CRC validation, strict decoding, disguised nested-archive detection, owner/tenant authorization, rate and replay policies, source-free operational events, and a release-blocking adversarial corpus. Arbitrary uploads remain disabled until real quarantine and malware-scanning infrastructure passes its gates.

### How I used Codex and GPT-5.6

Codex was the primary engineering collaborator throughout Build Week. It helped turn the initial idea into a complete product workflow, created the deterministic scanner and tests, implemented the UI, hardened trust boundaries, built the remediation and rescan flow, and continuously verified the product with tests, builds, audits, and production-server end-to-end checks.

GPT-5.6 was especially valuable for the complex work: security architecture, threat modeling, injection-rule design, remediation safety, adversarial fixtures, authorization boundaries, capability separation, and release-readiness decisions. I used Terra as the everyday GPT-5.6 development model and Sol for the most ambiguous and security-critical reasoning. The final product deliberately keeps deterministic controls—not model judgment—as the production security boundary.

### Challenges

The hardest challenge was resisting the temptation to execute or install scanned code. Production Lens treats every repository instruction, comment, and source file as hostile data. Another challenge was defining honest evidence states: detecting a control is not the same as proving it works, and a Markdown claim cannot override contradictory code.

Remediation also required more than changing one line. A fix is only considered successful when the original finding disappears, unrelated findings remain stable, no new issue is introduced, tests pass, approval is recorded, and reset restores the exact original state.

### Accomplishments

- A complete scan → evidence → remediation approval → rescan → comparison → reset workflow
- Eleven deterministic enterprise findings and seven evaluated injection findings
- Exact line evidence, secret redaction, and principle mapping
- Deterministic remediation for every bundled finding
- Production Lens self-scan and release-blocking adversarial tests
- A private live deployment judges can use without rebuilding
- A security design that keeps scanned content inert and capability-bounded

### What I learned

Production readiness is not a score. It is current evidence that accountable people own the system, behavior has been proved, blast radius is contained, consequential actions are traceable and reversible, and no uncontrolled component holds private data, untrusted content, and external action authority at the same time.

### What is next

The next milestone is deployment-backed private ZIP quarantine, real malware and secret scanning, shared authorization and admission state, durable audit delivery, and expanded adversarial evaluation. GPT-assisted repository analysis comes only after those boundaries are proven.

## Built with

- Codex
- GPT-5.6
- TypeScript
- Next.js
- React
- Vinext
- Cloudflare Workers
- Node.js

## Judge testing instructions

Open https://production-lens.karunaker-molugu.chatgpt.site and sign in with ChatGPT if prompted.

1. Select **Scan sample project** and confirm 11 findings.
2. Open **Customer records may be written to application logs**.
3. Review its evidence and choose **Review remediation options**.
4. Check the approval box and apply the recommended fix.
5. Confirm the comparison shows 11 → 10 with no new finding.
6. Reset and confirm the baseline returns to 11.
7. Return home and scan the Security Test Agent to inspect seven injection findings.

No additional credentials or setup are required.

## Developer-tool installation and platform answer

Production Lens runs on Node.js 22.13+ with npm on macOS, Linux, or Windows. Run `npm install`, then `npm run dev`, and open `http://localhost:3000`. Run `npm run security:check` for the full test, audit, build, and production-server E2E gate. Judges can use the live private demo without rebuilding.

## Submission checklist

- Category: Developer Tools
- Description: revise this draft in your own voice, then add it to Devpost
- Repository URL: add after publishing or sharing the repository
- Video: add the public YouTube URL after recording
- `/feedback` Session ID: run `/feedback` in the Codex session containing most core work and copy the returned ID
- Submitter type and country: answer directly in Devpost
- Final submission: submit only after every required field is present
