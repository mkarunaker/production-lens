# Production Lens principles-based release readiness

Production Lens makes release-readiness decisions through five governing principles. This is a principles-based judgment framework, not a checklist score: scanner findings supply evidence, evaluations challenge that evidence, accountable people review the residual risk, and the principles determine whether release is justified.

Every scanner rule, finding, remediation, evaluation, and launch decision should map to at least one principle.

## 1. Own it

### Human accountability and oversight

A named person owns the change, understands it, reviews it, and approves consequential actions. “Human in the loop” is not sufficient by itself; the person must have the context, authority, time, and evidence needed to make a meaningful decision.

Production evidence should include:

- Named accountable owner
- Named reviewer or approver for consequential actions
- Clear decision scope
- Evidence presented at approval time
- Recorded approval or rejection
- Escalation path

## 2. Prove it

### Prove behavior before production

Test intended behavior, failure modes, misuse, security boundaries, integrations, and production-scale conditions before release.

Production evidence should include:

- Expected-behavior tests
- Failure and degraded-mode tests
- Adversarial and misuse evaluations
- Authorization and isolation tests
- Integration contract tests
- Production-scale load, timeout, retry, and cost evaluations
- Release-blocking thresholds
- Regression results after every material change

## 3. Contain it

### Limit the blast radius

Use least privilege, scoped data access, sandboxing, rate and spending limits, canary releases, and kill switches.

Production evidence should include:

- Least-privilege identities and tool permissions
- Tenant, user, and record-level data scopes
- Sandboxed or isolated execution
- Rate, concurrency, token, and spending limits
- Bounded retries and tool chains
- Canary or staged release controls
- Tested emergency-disable and kill-switch procedures

## 4. Trace and reverse it

### Trace and reverse

Record what happened, what data and tools were used, and who approved it. Make deployments and state-changing actions reversible where possible, with tested rollback or recovery procedures.

Production evidence should include:

- Correlated request, model, tool, policy, and approval records
- Redacted data lineage
- Actor and approver identity
- Versioned prompts, models, tools, policies, and scanner rules
- Before-and-after state
- Idempotency and recovery behavior
- Tested rollback, reset, or compensating action

## 5. Break the lethal trifecta

Do not allow one system or trust domain to simultaneously:

1. Access private data
2. Process untrusted content
3. Communicate externally or take consequential actions

If the business requires all three capabilities, separate them with isolation, strict allowlists, deterministic validation, least-privilege interfaces, and explicit human approval boundaries.

Production evidence should include:

- A data-flow and trust-boundary diagram
- A capability inventory for every component
- Proof that no single component holds all three capabilities by default
- Strict outbound destination and action allowlists
- Structured, validated messages between trust domains
- Human approval before sensitive disclosure or consequential action
- Monitoring for boundary violations

## Finding requirements

Every Production Lens finding should identify:

- Applicable readiness principle
- Missing or weak control
- Evidence
- Potential impact and blast radius
- Accountable owner
- Recommended remediation
- Required verification
- Rollback or recovery expectation when state can change

## Release decision

An application is not production ready when:

- A consequential capability has no accountable owner.
- Important behavior has not been demonstrated under expected, failure, misuse, and production-scale conditions.
- Blast radius is not bounded.
- Consequential actions cannot be traced or reversed.
- One uncontrolled component holds all three lethal-trifecta capabilities.

Passing a checklist is not sufficient. Production readiness requires current, reviewable evidence that these principles hold for the deployed system.

The release decision should record:

- Applicable principles
- Supporting and contradicting evidence
- Evaluation results
- Known limitations and residual risks
- Accountable owner
- Approver
- Decision and rationale
- Conditions, expiry, or required follow-up
- Rollback or emergency-disable plan
