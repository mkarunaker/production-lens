# Production Lens evaluation gates

Every milestone and meaningful implementation increment must define and pass its evaluations before it can be marked complete or deployed.

Evaluations must demonstrate the applicable Production Lens readiness principles: **Own it, Prove it, Contain it, Trace and reverse it, and Break the lethal trifecta**.

## Required evaluation layers

Every change must be assessed across the layers that apply:

1. **Functional:** the intended behavior works with expected inputs.
2. **Regression:** previously supported behavior and expected findings remain stable.
3. **Security:** trust boundaries, authorization, redaction, isolation, limits, and dependency posture remain intact.
4. **Adversarial:** hostile, malformed, misleading, oversized, and prompt-injected inputs fail safely.
5. **Evidence quality:** paths, lines, code excerpts, severity, impact, and remediation remain accurate.
6. **Negative behavior:** the system does not execute scanned code, leak secrets, follow repository instructions, or perform unapproved writes.
7. **Operational:** failures are bounded, observable, recoverable, and do not leave sensitive temporary data.
8. **Demo:** the user-visible golden path is deterministic, understandable, and resettable.
9. **Remediation verification:** every applied fix resolves its target, introduces no new findings, preserves unrelated behavior, records approval, and supports rollback.
10. **Capability separation:** no uncontrolled component simultaneously holds private-data access, untrusted-content processing, and external communication or consequential-action authority.

## Universal release gate

Before any milestone is marked complete:

- New acceptance criteria are written.
- Positive and negative tests are added.
- Relevant adversarial fixtures are added.
- Existing tests pass.
- The production build passes.
- `npm audit` reports no unresolved high or critical vulnerabilities.
- Security invariants are reviewed.
- `docs/project-status.md` is updated with exact status and remaining limitations.
- Deployment occurs only after the validated source is committed.

## Milestone-specific evaluations

### Deterministic scanning

- Expected rule IDs are stable.
- Findings include complete explanation, impact, and remediation.
- Evidence points to the correct file and line.
- Evidence redacts secrets.
- Unsupported files and unsafe paths are rejected.
- File-count and byte limits are enforced.
- Repository instructions cannot suppress or alter findings.
- No repository code or dependency is executed.
- Injection coverage claims match the exact languages, frameworks, sources, sinks, and adversarial fixtures that have been evaluated.
- New injection rules include both vulnerable and secure-equivalent fixtures.
- Production Lens application source passes the implemented injection rules after every code change; intentionally vulnerable bundled samples and adversarial fixtures remain explicitly excluded from this self-scan.

### Remediation proposal

- The selected rule maps to exactly one supported remediation.
- The proposal identifies the expected target and source line.
- The before-text matches the disposable source exactly.
- The patch is minimal and contains no unrelated changes.
- The proposal explains the security rationale.
- Unsupported findings fail closed without mutation.

### Approval and application

- No change occurs before explicit approval.
- Only a disposable copy is mutated.
- The canonical sample remains byte-for-byte unchanged.
- The approved patch is the patch that is applied.
- Repeated application fails safely or remains idempotent.
- No scanned application code is executed.

### Rescan and comparison

- The targeted finding existed before remediation.
- The targeted finding is absent afterward.
- Expected unrelated findings remain.
- Newly introduced findings are reported.
- Before and after counts are accurate.
- Remediation-specific and existing regression tests pass.
- The approved patch matches the applied patch.
- Approval and validation results are retained as evidence.
- A rollback or reset path is available and verified.
- Reset restores the exact original result.

### Repository upload

- Authentication and object ownership are enforced.
- Extension, signature, compressed-size, expanded-size, file-count, depth, and ratio limits are tested.
- Traversal, symlink, hard-link, device-file, nested-archive, duplicate-path, case-collision, Unicode, and archive-bomb fixtures are rejected.
- Malware scanner failure blocks processing.
- Temporary content is deleted after success, rejection, timeout, and internal error.
- Cross-user repository access is denied.
- Rate, quota, and concurrency limits are enforced.

### GPT analysis

- Repository content is structurally separated from trusted instructions.
- Direct, indirect, encoded, obfuscated, and multi-turn injection corpora are evaluated.
- The model has no shell, network, filesystem, Git, write, or authorization authority.
- Outputs conform to a strict schema.
- Claimed paths and lines are verified deterministically.
- Secret-containing inputs and outputs are redacted.
- Token, cost, timeout, retry, and concurrency budgets are enforced.
- Model failure cannot remove deterministic findings.

### Codex remediation

- Generated patches are constrained to approved paths.
- Destructive or broad changes require explicit approval.
- Tests are added before completion.
- The patch is checked for new security findings.
- Tool or command execution occurs only in an isolated disposable environment and only when separately authorized.
- Failed validation leaves the original project untouched.

### Authorization and operations

- Tenant and object-level authorization tests cover every read and write.
- Rate-limit bypass and replay cases are tested.
- Audit events are complete, ordered, and redacted.
- Logs contain no repository source, secrets, or sensitive model content.
- Alerting and emergency-disable procedures are exercised.

### Pre-production validation

- Full golden-path browser test passes.
- Failure-recovery demo is rehearsed.
- Accessibility and responsive checks pass.
- Independent penetration testing covers application, uploads, isolation, authorization, model injection, exfiltration, and denial of wallet.
- Critical and high findings are remediated before launch.
- Residual risks are documented and explicitly accepted.

## Reporting format

Every milestone handoff must report:

- What was evaluated
- What passed
- What failed
- What was intentionally not evaluated
- Residual risks
- Exact next evaluation gate
