# Production Lens golden demo script

## Public video script: target 2:45

Use your own natural delivery; do not read this mechanically.

### 0:00–0:35: Problem and product

“Production Lens is a developer tool I built during OpenAI Build Week to show teams what stands between an AI agent and production. It reads source as inert text, shows the evidence behind a risk, and lets the team review a safe fix.

“AI is moving quickly across every industry, and one of the biggest changes is software. Sonar reports that 42% of committed code is AI-generated or AI-assisted, while 96% of developers do not fully trust it. Veracode found known security flaws in 45% of the generation tasks it evaluated.

“The review process has not caught up with the speed and volume of code being created. Security, reliability, governance, and ownership gaps can sit in the same repository without clear evidence that it is ready for production. That is why I built Production Lens.

“It is a principles-based, deterministic review with selected OWASP, CWE, and NIST-aligned checks. It does not claim full framework coverage.”

Show the home page, expand **Why it matters**, briefly point to the two rows of source-linked cards, then collapse it. Point out the statement that scanned code remains inert.

### 0:35–0:59: Load, scan, and evidence

Select **Load demo project** for Enterprise Analytics Agent. Point out the new first status line: **File loaded — enterprise-analytics-agent.zip**. Then select **Run Lens**.

“The file is loaded. When I run Lens, it stays on this screen. It checks the approved text without executing the repository.”

Point out the **11 findings need review** summary and select **Review and remediate issues**. In the workspace, select the sensitive-logging finding card.

“There are 11 findings. I decide when to open the review workspace. This one points to the file and line that matter, then gives me the reason it is risky.”

### 0:59–1:37: Safe remediation and proof

“The source sits in the middle. The suggested change is shown inline. Nothing has changed yet.”

“Under the approval action is the principles-based readiness panel. I can open it to see why this finding matters: the blast radius needs to be contained, and the handling needs to be traceable and recoverable.

“Codex helped me build this workflow. I can review the exact patch, then approve it. The change goes only to a disposable copy held in memory. The original sample stays untouched.”

Expand **Why this finding matters**, point to the readable principle labels and finding-specific evidence, collapse it, then approve and rescan.

“The rescan takes the count from 11 to 10. The other findings stay open. Reset brings me back to the baseline.”

Reset the demo.

### 1:37–2:05: Security differentiation

Return home, select **Load security demo**, confirm the loaded filename, then select **Run Lens** and **Review and remediate issues**.

“The second project is a focused security fixture. It has seven evaluated injection findings. Here is the SQL issue. The evidence states also show where the scanner has a confirmed finding and where a human still needs to review the control.”

Briefly open the SQL finding.

### 2:05–2:44: Codex, GPT-5.6, and dogfooding

“I built Production Lens during OpenAI Build Week with Codex and GPT-5.6. Codex helped me build the scanner and make it testable. GPT-5.6 was most useful for threat modeling and safe remediation decisions.”

“Behind the scenes, every test run self-scans Production Lens against its implemented injection checks. We use the same evidence discipline we ask teams to use.”

Return to the home page.

Stop recording before three minutes.

## Presenter setup

1. Open the private Production Lens deployment in a signed-in browser.
2. Keep the Enterprise Analytics Agent home card visible.
3. Confirm the page states that scanning is static and repository code remains inert.
4. Keep this script available separately; do not switch away from the application during the main path.

## Primary golden path

1. Select **Load demo project** and confirm **File loaded — enterprise-analytics-agent.zip**.
2. Select **Run Lens**. State: “Production Lens inspected approved text files without running repository code.”
3. Confirm the in-place summary shows **11 findings need review** and the completed scan outcome.
4. Select **Review and remediate issues** to enter the code-review workspace.
5. Explain the evidence states. Markdown cannot prove or suppress a control.
6. Select the sensitive-logging finding card. Show the file and line first. Then explain the impact and the recommended remediation.
7. Expand **Why this finding matters** below the approval action. Point out the readable principle labels, canonical principle names, and finding-specific evidence; collapse it again before approval.
8. Explain the two outcomes:
   - Apply the exact recommended patch to a disposable copy.
   - Defer and keep the risk open without changing code.
9. Review the inline patch. Explain the validation plan and residual risk.
10. Check the explicit approval box and select **Approve, apply, and rescan**.
11. Confirm **11 → 10 open findings**. Confirm the resolved finding and unchanged canonical sample.
12. Select **Reset demo** and confirm the baseline returns to 11 findings.

## Security rule-pack path

1. Return home and select **Load security demo**. Confirm the loaded filename, then select **Run Lens** and **Review and remediate issues**.
2. Confirm **7 findings need review** and inspect the line evidence in the workspace.
3. Show the SQL finding and briefly point out the other injection findings.
4. Select the SQL finding and review its parameterized-query remediation.
5. Approve the disposable patch and confirm **7 → 6 open findings** with no new finding.
6. Reset and confirm the security baseline returns to 7.

## Presenter language

- Say “evidence-backed for the supported deterministic scope.”
- Say “the six homepage cards are linked industry context, not Production Lens metrics.”
- Say “this finding maps to these principles” when opening **Why this finding matters**.
- Call it a “recommended patch.”
- Refer to a “disposable bundled copy.”
- Say “implemented but not verified” when the scanner detects a control without sufficient proof.
- Say “documented only” when a repository claims a control without implementation evidence.
- Mention the behind-the-scenes self-scan only as an engineering practice, not as a workflow shown in the UI.

## Failure recovery

### Page or authentication failure

1. Reopen the private deployment.
2. Complete the ChatGPT sign-in gate if shown.
3. Return to the home page; no demo state is stored server-side.

### Unexpected finding count

1. Select **Reset demo**. If needed, return home, reload the demo, and select **Run Lens** again.
2. Do not continue the before/after claim unless the baseline is exactly 11 for Enterprise or 7 for Security.
3. Run the local release gate before retrying.

### Review workspace failure

1. Return to the selected finding.
2. Confirm **Review and remediate issues** opens the code-review workspace.
3. If the exact patch or approval control is missing, stop the remediation portion and show guidance only.

### Rescan validation failure

1. Do not claim the issue was fixed.
2. Report the resolved finding and any remaining findings exactly as shown.
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

## Devpost notes — ready to paste

### About the project

#### What inspired me

AI is moving quickly across every industry, and one of the biggest changes is software. Sonar reports that 42% of committed code is AI-generated or AI-assisted, while 96% of developers do not fully trust it. Veracode found known security flaws in 45% of the AI code-generation tasks it evaluated.

The issue is not that teams are using AI. The review process has not caught up with the speed and volume of code being created. Security, reliability, governance, and ownership gaps can sit in the same repository without clear evidence that it is ready for production.

That is why I built Production Lens. I wanted to make that conversation concrete. Instead of a long checklist, it shows the code evidence, explains the risk, and gives the team a safe way to review a fix.

#### What I built

Production Lens is a deterministic, principles-based review tool for application code, with a focus on AI-agent repositories. It reads repository code as inert text and looks for selected security, reliability, governance, and injection risks. Each finding includes the file, line, evidence, impact, and a recommended remediation.

The demo starts with a bundled agent, finds the issues, and opens a code-review workspace. You can review a proposed patch, explicitly approve it, apply it only to a disposable copy, then rescan and see what changed. The original sample always stays untouched.

#### How I built it

I built Production Lens with TypeScript, Next.js, React, Vinext, and Cloudflare Workers. The scanner is separate from the UI, so the rules stay deterministic and testable. I added file limits, secret redaction, security headers, technology inventory, explicit evidence states, and a test suite for the scanner, remediation flow, archive handling, authorization boundaries, and adversarial cases.

Codex was my main engineering partner during Build Week. GPT-5.6 helped most with threat modeling, rule design, and thinking through safe remediation and evaluation boundaries.

#### Challenges I ran into

The biggest challenge was keeping the scanned repository completely inert. I did not want the product to import code, install dependencies, or follow instructions hidden in a repository. I also learned that detecting a control is different from proving it works. That is why Production Lens distinguishes between a confirmed finding, a control that is implemented but not verified, and a claim that is only documented.

#### What I learned

Production readiness is not one score. It comes down to evidence: who owns the decision, whether the behavior has been tested, whether the blast radius is contained, and whether a change can be traced and reversed. I also learned to keep the product honest about its scope. Production Lens has selected OWASP, CWE, and NIST-aligned checks today, not complete framework coverage.

### Built with

`Codex` · `GPT-5.6` · `TypeScript` · `Next.js` · `React` · `Node.js` · `Vinext` · `Cloudflare Workers` · `Static Analysis` · `Application Security` · `Developer Tools` · `AI Agents` · `OWASP` · `CWE` · `NIST AI RMF`

### Links

- **Try it:** [Production Lens live demo](https://production-lens.karunaker-molugu.chatgpt.site)
- **See the code:** [Production Lens on GitHub](https://github.com/mkarunaker/production-lens)
- **Demo video:** add the public YouTube URL after recording

## Recording checklist

- Record a straightforward screencast with your voice. Keep the screen on the working product rather than adding marketing footage.
- Lead with the elevator pitch in the first few seconds, then immediately show the product working.
- Rehearse the full flow once before recording: load the Enterprise demo, scan, review the sensitive-logging finding, approve the patch, rescan, reset, then show the Security Test Agent.
- Record more than one take. Cut pauses, loading mistakes, and failed clicks so the final video only shows the clean, repeatable path.
- Upload the recording to YouTube early, even as unlisted, and give it time to process before the Devpost deadline. Paste the final public URL into the Devpost links section.
