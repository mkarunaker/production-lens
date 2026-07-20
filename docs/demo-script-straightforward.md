# Production Lens straightforward demo script

Target: about 2 minutes 45 seconds. Record this as a simple screen capture with your voice.

## Opening

“AI is here to help people and teams do more. We see engineers and businesses everywhere using it to write code and build agents.

“AI is moving fast across every industry, especially software. Sonar reports that 42% of committed code is AI-generated or AI-assisted, while 96% of developers do not fully trust it. Veracode found known security flaws in 45% of the generation tasks it evaluated.

“The code is moving faster than the review process. That is the gap I wanted to work on.

“Production Lens helps teams review application code, with a focus on AI agents, before they put it into production. It is a principles-based, deterministic review with selected OWASP, CWE, and NIST-aligned checks.”

Show the home page. Briefly expand **Why it matters** and point to the linked source cards. Collapse it again.

## Load and scan

“I will start with the Enterprise Analytics Agent. I load the demo project, and the file is ready to scan.

“When I run Lens, it reads the repository as text. It does not run the code, install anything, or follow instructions inside the repository.”

Select **Load demo project**, then **Run Lens**. Wait for the completed summary.

“The scan found 11 issues to review. I choose when to open the review workspace.”

Select **Review and remediate issues**, then open **Customer records may be written to application logs**.

## Review and remediate

“Here is the file, the line, and the evidence. Lens explains why it matters and gives me a recommended patch.

“Nothing changes automatically. Below the approval action, I can open the principles panel. It shows the production-readiness principles that apply to this finding.

“I can review the exact change, approve it, and apply it only to a disposable copy. The original sample stays untouched.”

Open **Why this finding matters**, then collapse it. Approve the patch and rescan.

“The rescan moves the count from 11 to 10. The targeted issue is resolved, the other findings stay open, and I can reset back to the original baseline.”

Reset the demo.

## Security example

“The second project is a security-focused fixture. It has seven evaluated injection findings.

“Here is the SQL issue. Lens shows the evidence and the parameterized-query remediation. The evidence states also make it clear when a control needs human review.”

Return home. Load the Security Test Agent, run Lens, open the review workspace, and select the SQL finding.

## Close

“I built Production Lens during OpenAI Build Week with Codex and GPT-5.6. Codex helped me build the scanner and make it testable. GPT-5.6 helped with threat modeling, rule design, and safe remediation decisions.

“Behind the scenes, every test run also self-scans Production Lens against its implemented injection checks. We use the same evidence discipline we ask teams to use.”

“AI is here to help. If we build it responsibly, we can move it into production with confidence and create real business impact.”

Return to the home page and stop recording.

## Before recording

- Start from the home page and confirm the Enterprise project is available.
- Rehearse the 11 → 10 flow once, then reset.
- Keep the recording focused on the product. Cut pauses and failed clicks.
- Upload to YouTube early and allow time for processing.
