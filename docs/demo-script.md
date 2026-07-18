# Production Lens golden demo script

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
