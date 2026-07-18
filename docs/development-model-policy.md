# Development model policy

Production Lens uses `gpt-5.6-terra` with medium reasoning as its project-level Codex default.

Use explicit overrides when starting work that falls outside the default:

- **Luna:** bounded test generation, fixture maintenance, documentation, formatting, extraction, and mechanical refactors with clear acceptance criteria.
- **Terra:** normal implementation, multi-file changes, debugging, scanner rules, and remediation proposals.
- **Sol:** security architecture, ingestion and authorization boundaries, secret handling, difficult debugging, adversarial review, and final release decisions.

Codex does not automatically switch the underlying model during a running chat. Select a different model before the task or start a one-off CLI run with the desired model. Reasoning effort is independent of model choice; use the lowest effort that passes the applicable evaluation gate.

This policy configures development work only. Production Lens does not currently call an OpenAI model at runtime. Any future application-level model router belongs to Milestone 4 and must enforce deterministic escalation criteria, budgets, schema validation, evidence verification, logging, and capability isolation.
