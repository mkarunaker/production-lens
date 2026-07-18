# Production Lens golden demo script

## Public video script — target 2:35

Use your own natural delivery; do not read this mechanically.

### 0:00–0:20 — Problem and product

“AI pilots are easy to demo but hard to prove production-ready. Production Lens is a developer tool that scans an AI application without executing its code, then explains the exact risks, evidence, and safe next steps.”

Show the home page and the statement that scanned code remains inert.

### 0:20–0:55 — Scan and evidence

Select **Scan sample project**.

“This bundled enterprise analytics agent has 11 deterministic findings across authorization, prompt safety, sensitive data, evaluation, reliability, observability, and supply-chain controls.”

Open **Customer records may be written to application logs**.

“Each finding includes severity, file and line evidence, impact, remediation, and the production-readiness principles it violates. Production Lens distinguishes a proven control from something merely documented or implemented but unverified.”

### 0:55–1:35 — Safe remediation and proof

Select **Review remediation options**.

“Codex helped me build a deterministic remediation workflow. It presents the exact patch and validation plan, but nothing changes until I explicitly approve it. The patch applies only to a disposable copy; the canonical sample is never modified.”

Approve and rescan.

“The rescan proves the targeted issue is gone: 11 findings become 10, unrelated findings remain, and no new risk appears. Reset restores the exact baseline.”

Reset the demo.

### 1:35–2:05 — Security differentiation

Open the Security Test Agent.

“The second bundled project demonstrates seven evaluated injection findings, including prompt injection, dynamic execution, SQL, command, argument, NoSQL, and unsafe HTML rendering. Repository instructions cannot suppress the scanner, and Production Lens scans its own source after every code change.”

Briefly open the SQL finding.

### 2:05–2:35 — Codex, GPT-5.6, and impact

“I built Production Lens during OpenAI Build Week using Codex and GPT-5.6. Codex accelerated the scanner, UI, tests, remediation, rescan, and security hardening. GPT-5.6 handled the complex work: threat modeling, rule design, remediation safety, adversarial tests, authorization boundaries, and release review.”

Return to the home page.

“Production Lens turns production readiness from a vague checklist into evidence teams can inspect, fix, verify, and reverse.”

Stop recording before three minutes.

## Presenter setup

1. Open the private Production Lens deployment in a signed-in browser.
2. Keep the Enterprise Analytics Agent home card visible.
3. Confirm the page states that scanning is static and repository code is never executed.
4. Keep this script available separately; do not switch away from the application during the main path.

## Primary golden path

1. Select **Scan sample project**.
2. State: “Production Lens inspected approved text files without running repository code.”
3. Confirm **11 open findings** and point out the detected technology inventory.
4. Explain the six evidence states. Emphasize that Markdown cannot prove or suppress a control.
5. Select **Customer records may be written to application logs**.
6. Show its severity, file and line, code evidence, impact, readiness principles, and recommended remediation.
7. Select **Review remediation options**.
8. Explain the two outcomes:
   - Apply the exact recommended patch to a disposable copy.
   - Defer and keep the risk open without changing code.
9. Review the patch, validation plan, principle evidence, and residual risk.
10. Check the explicit approval box and select **Approve, apply, and rescan**.
11. Confirm **11 → 10 open findings**, one resolved finding, no new findings, and the unchanged canonical sample.
12. Select **Reset demo** and confirm the baseline returns to 11 findings.

## Security rule-pack path

1. Return home and select **Scan security test project**.
2. Confirm **7 open findings**, all with line evidence.
3. Show prompt injection, dynamic execution, SQL, command, argument, NoSQL, and XSS findings.
4. Select the SQL finding and review its parameterized-query remediation.
5. Approve the disposable patch and confirm **7 → 6 open findings** with no new finding.
6. Reset and confirm the security baseline returns to 7.

## Presenter language

- Say “evidence-backed for the supported deterministic scope,” not “100% secure.”
- Say “recommended patch,” not “automatic fix.”
- Say “disposable bundled copy,” not “your repository.”
- Say “implemented but not verified” when the scanner detects a control without sufficient proof.
- Say “documented only” when a repository claims a control without implementation evidence.

## Failure recovery

### Page or authentication failure

1. Reopen the private deployment.
2. Complete the ChatGPT sign-in gate if shown.
3. Return to the home page; no demo state is stored server-side.

### Unexpected finding count

1. Select **Reset demo** or return home and rescan.
2. Do not continue the before/after claim unless the baseline is exactly 11 for Enterprise or 7 for Security.
3. Run the local release gate before retrying.

### Remediation page failure

1. Return to the selected finding.
2. Confirm **Review remediation options** is visible.
3. If the exact patch or approval control is missing, stop the remediation portion and show guidance only.

### Rescan validation failure

1. Do not claim the issue was fixed.
2. Report the resolved, remaining, and introduced findings exactly as shown.
3. Reset to the canonical sample and continue with the scan-only portion.

### Network interruption

1. Reload once.
2. If unavailable, use the local production build.
3. Never substitute screenshots for an unverified live remediation result.

## Release checklist

- `npm run security:check` passes.
- Enterprise baseline is 11 and sensitive-logging remediation is 11 → 10.
- Security baseline is 7 and SQL remediation is 7 → 6.
- No new finding is introduced by either patch.
- The application self-scan and dependency audit pass.
- A signed-in browser click-through is rehearsed on the deployed version.
