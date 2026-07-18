# Injection and Interpreter Safety rule pack

## Milestone purpose

Expand Production Lens from narrow prompt-injection and dynamic-execution checks into an evidence-backed injection and interpreter-safety assessment.

This milestone is incremental. A risk class may be marked:

- **Planned:** no implemented deterministic rule.
- **Partial:** at least one high-signal source/sink pattern and adversarial fixture exists, but supported languages or frameworks are limited.
- **Complete for declared scope:** documented supported languages and frameworks pass positive, negative, and adversarial evaluations.

Production Lens must never claim universal injection coverage.

## Evidence standard

An injection finding should normally require:

1. An interpreter, protocol, query, template, parser, identity, or execution sink.
2. A plausible path from externally influenced or untrusted data.
3. Missing or ineffective separation, parameterization, validation, contextual encoding, or safe configuration.
4. File and line evidence for the sink.
5. A remediation appropriate to the interpreter and framework.

Finding a function name alone is not sufficient for a critical finding. When data flow cannot be established deterministically, report lower-confidence review guidance rather than asserting exploitability.

## Coverage backlog

| Risk class | Initial status | Target scope |
| --- | --- | --- |
| Prompt injection | Partial | Direct, indirect, encoded, obfuscated, tool-output, and persistent patterns |
| Dynamic code execution | Partial | `eval`, dynamic functions, reflection, runtime compilation, and unsafe deserialization |
| SQL and ORM injection | Partial | JavaScript/TypeScript string-built query calls and unsafe Prisma raw-query APIs |
| OS command injection | Partial | JavaScript/TypeScript `exec` and `execSync` with concatenated or interpolated input |
| Argument injection | Partial | JavaScript/TypeScript `spawn` and `execFile` argument arrays with visibly user-controlled values |
| NoSQL injection | Partial | JavaScript/TypeScript Mongo-style query sinks receiving request objects, spread request objects, or untrusted `$where`/`$expr` values |
| Server-side template injection | Planned | Common template engines and untrusted template compilation/rendering |
| XSS and unsafe HTML rendering | Planned | Unsafe HTML sinks, scriptable URLs, and untrusted Markdown/HTML rendering |
| XXE and unsafe XML parsing | Planned | External entities, DTD processing, XInclude, and unsafe parser defaults |
| XPath and XQuery injection | Planned | Dynamically constructed path/query expressions |
| LDAP injection | Planned | Unsafe search-filter and distinguished-name construction |
| HTTP header and CRLF injection | Planned | Untrusted header names/values, redirects, cookies, and response splitting |
| SMTP and IMAP injection | Planned | Untrusted envelope, header, command, and newline construction |
| GraphQL abuse | Planned | Complexity/depth, batching, introspection, authorization, and unsafe resolver sinks |
| SAML validation attacks | Planned | Assertion, audience, recipient, issuer, signature, and replay validation |
| OAuth parameter attacks | Planned | Redirect URI, state, PKCE, audience, issuer, token, and mix-up validation |
| DLL and dynamic library loading | Planned | User-influenced library paths, search-order risks, and unsigned loading |
| Expression-language injection | Planned | Runtime expression and policy-language evaluation |
| Unsafe deserialization | Planned | Executable or polymorphic deserialization of untrusted input |

## Implementation waves

Current Wave 1 increment: SQL/ORM, OS command, argument, and NoSQL injection have vulnerable and secure-equivalent fixtures. Their detection is intentionally high-signal and does not yet perform interprocedural taint analysis.

### Wave 1 — Common application sinks

- SQL and ORM injection
- OS command injection
- Argument injection
- NoSQL injection
- XSS and unsafe HTML rendering

### Wave 2 — Parsers, templates, and directories

- Server-side template injection
- XXE and unsafe XML parsing
- XPath and XQuery injection
- LDAP injection
- Expression-language injection
- Unsafe deserialization

### Wave 3 — Protocol and API abuse

- HTTP header and CRLF injection
- SMTP and IMAP injection
- GraphQL complexity, authorization, and resolver sinks

### Wave 4 — Identity and platform integrity

- SAML validation attacks
- OAuth parameter and redirect attacks
- DLL and dynamic library loading

### Wave 5 — Advanced AI injection

- Encoded and obfuscated prompt injection
- Tool-output and retrieval injection
- Persistent and multi-turn injection
- Action-intent mismatch
- Model-output exfiltration patterns

## Principles-based release readiness

Every rule must map to applicable principles:

- **Own it:** identify the owner of the interpreter, identity boundary, or consequential action.
- **Prove it:** include positive, negative, adversarial, and false-positive evaluations.
- **Contain it:** assess interpreter privilege, data scope, outbound access, and blast radius.
- **Trace and reverse it:** require useful audit evidence and recovery expectations for state-changing sinks.
- **Break the lethal trifecta:** identify when untrusted input can reach private data and external or consequential action in one trust domain.

## Evaluation gate for each rule

A rule cannot move to complete for its declared scope until:

- Supported languages, frameworks, sources, and sinks are documented.
- At least one vulnerable fixture is detected.
- At least one secure equivalent is not detected.
- Tainted and non-tainted variants are evaluated.
- Encoded, malformed, and obfuscated adversarial inputs are evaluated where applicable.
- File and line evidence is correct.
- Severity reflects demonstrated reachability and blast radius.
- Remediation is framework-appropriate and testable.
- Principle mappings and explanations are present.
- Existing scanner findings remain stable.
- No scanned code or dependencies are executed.
- False-positive and false-negative limitations are documented.

## Completion criteria

The overall milestone is complete only when:

- Every backlog row is complete for an explicitly declared initial language/framework scope, or intentionally deferred with documented rationale.
- Coverage claims in the UI match actual evaluated support.
- The sample and compact security fixtures demonstrate the supported rule families.
- All functional, regression, security, adversarial, negative-behavior, operational, and demo gates pass.
