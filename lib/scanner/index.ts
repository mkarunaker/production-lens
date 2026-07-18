import type { Finding, ReadinessPrinciple, RepositoryFile, ScanResult } from "./types";

export const SCAN_LIMITS = {
  maxFiles: 200,
  maxFileBytes: 256_000,
  maxTotalBytes: 2_000_000,
} as const;

const APPROVED_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".json", ".lock", ".sql", ".md", ".txt", ".yml", ".yaml"]);

function extension(path: string) {
  const dot = path.lastIndexOf(".");
  return dot < 0 ? "" : path.slice(dot).toLowerCase();
}

function isSafePath(path: string) {
  return (
    path.length > 0 &&
    path.length <= 240 &&
    !path.startsWith("/") &&
    !path.includes("\\") &&
    !path.includes("\0") &&
    !path.split("/").some((segment) => segment === "" || segment === "..") &&
    /^[a-zA-Z0-9._/@+-]+$/.test(path)
  );
}

export function redactSecrets(code: string) {
  return code
    .replace(/((?:password|secret|token|api[_-]?key)\s*[:=]\s*["'])[^"']+(["'])/gi, "$1[REDACTED]$2")
    .replace(/\b(sk-[a-z0-9_-]{8,}|AKIA[A-Z0-9]{16})\b/gi, "[REDACTED]")
    .replace(/\b(Bearer\s+)[a-z0-9._~+/-]+=*\b/gi, "$1[REDACTED]")
    .replace(/-----BEGIN [A-Z ]+PRIVATE KEY-----[\s\S]*?-----END [A-Z ]+PRIVATE KEY-----/g, "[REDACTED PRIVATE KEY]");
}

const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(?:all\s+)?previous\s+instructions?/i,
  /(?:reveal|repeat|print|show)\s+(?:the\s+)?(?:system\s+)?prompt/i,
  /you\s+are\s+now\s+(?:in\s+)?developer\s+mode/i,
  /system\s+(?:message|prompt|override)/i,
  /(?:bypass|disable|override)\s+(?:the\s+)?(?:safety|security|policy|guardrails?)/i,
];

export function detectPromptInjection(content: string) {
  const lines = content.split("\n");
  const index = lines.findIndex((line) => PROMPT_INJECTION_PATTERNS.some((pattern) => pattern.test(line)));
  return index < 0 ? undefined : { line: index + 1, code: redactSecrets(lines[index].trim()) };
}

function evidence(files: RepositoryFile[], path: string, pattern: RegExp) {
  const file = files.find((candidate) => candidate.path === path);
  if (!file) return undefined;
  const lines = file.content.split("\n");
  const index = lines.findIndex((line) => pattern.test(line));
  if (index < 0) return undefined;
  return { path, line: index + 1, code: redactSecrets(lines[index].trim()) };
}

function firstPatternEvidence(files: RepositoryFile[], patterns: RegExp[]) {
  for (const file of files) {
    const lines = file.content.split("\n");
    const line = lines.findIndex((candidate) => patterns.some((pattern) => pattern.test(candidate)));
    if (line >= 0) {
      return { path: file.path, line: line + 1, code: redactSecrets(lines[line].trim()) };
    }
  }
  return undefined;
}

const PRINCIPLES_BY_RULE: Record<string, { name: ReadinessPrinciple; reason: string }[]> = {
  SEC_INDIRECT_PROMPT_INJECTION: [
    { name: "Prove it", reason: "Adversarial evaluation must show that hostile repository instructions cannot change system behavior." },
    { name: "Contain it", reason: "Untrusted content must remain isolated from privileged capabilities." },
    { name: "Break the lethal trifecta", reason: "A component reading hostile content must not also hold sensitive data and consequential action authority." },
  ],
  SEC_DANGEROUS_DYNAMIC_EXECUTION: [
    { name: "Contain it", reason: "Dynamic execution dramatically expands the blast radius of attacker-controlled input." },
    { name: "Break the lethal trifecta", reason: "Untrusted input can cross directly into a consequential execution capability." },
  ],
  INJ_SQL_OR_ORM: [
    { name: "Prove it", reason: "Adversarial and secure-equivalent evaluations must demonstrate that query structure cannot be changed by input." },
    { name: "Contain it", reason: "A compromised query must not inherit broad access to customer or tenant data." },
    { name: "Break the lethal trifecta", reason: "Untrusted input can reach a private-data interpreter and may enable disclosure or consequential writes." },
  ],
  INJ_OS_COMMAND: [
    { name: "Prove it", reason: "Tests must demonstrate that hostile metacharacters and arguments cannot alter the executed operation." },
    { name: "Contain it", reason: "Process execution must use minimal operating-system privileges and a tightly scoped environment." },
    { name: "Break the lethal trifecta", reason: "Untrusted input can cross into a consequential operating-system capability." },
  ],
  INJ_ARGUMENT: [
    { name: "Prove it", reason: "Tests must show that user-controlled values cannot become flags or change command semantics." },
    { name: "Contain it", reason: "Allowlisted arguments and least-privilege processes limit the impact of argument manipulation." },
    { name: "Break the lethal trifecta", reason: "Untrusted input can influence a consequential external process even when no shell is used." },
  ],
  SUPPLY_CHAIN_MISSING_LOCKFILE: [
    { name: "Prove it", reason: "Reproducible builds are necessary for meaningful security and regression evidence." },
    { name: "Trace and reverse it", reason: "A locked dependency graph makes deployed components identifiable and rollback reproducible." },
  ],
  AUTH_SHARED_SERVICE_ACCOUNT: [
    { name: "Own it", reason: "A shared identity prevents actions from being attributed to an accountable person." },
    { name: "Contain it", reason: "A broad reusable credential increases the impact of compromise." },
    { name: "Trace and reverse it", reason: "Individual actions cannot be reliably reconstructed or revoked." },
  ],
  AUTH_MISSING_USER_AUTHORIZATION: [
    { name: "Own it", reason: "Consequential data access has no verified requesting-user accountability." },
    { name: "Contain it", reason: "Missing user and tenant scope leaves the data-access blast radius unbounded." },
    { name: "Break the lethal trifecta", reason: "Untrusted requests can reach private data through a consequential tool without an approval boundary." },
  ],
  OBS_MISSING_AI_AUDIT_LOG: [
    { name: "Own it", reason: "Owners and approvers lack the evidence needed for meaningful accountability." },
    { name: "Trace and reverse it", reason: "Model and tool behavior cannot be reconstructed, investigated, or safely recovered." },
  ],
  EVAL_MISSING_FRAMEWORK: [
    { name: "Prove it", reason: "No repeatable evidence demonstrates intended behavior, failure handling, or misuse resistance." },
  ],
  REL_MISSING_NETWORK_GUARDS: [
    { name: "Prove it", reason: "Failure, latency, and degraded-mode behavior have not been demonstrated." },
    { name: "Contain it", reason: "Unbounded waits and retries can amplify dependency failures and resource consumption." },
  ],
  GOV_EMBEDDED_PROMPT: [
    { name: "Own it", reason: "The prompt has no explicit owner or review record." },
    { name: "Prove it", reason: "Prompt changes cannot be independently versioned and evaluated before release." },
    { name: "Trace and reverse it", reason: "Prompt versions and rollback history are not explicit." },
  ],
  DATA_SENSITIVE_LOGGING: [
    { name: "Contain it", reason: "Raw customer records can spread into a broad, long-lived logging system." },
    { name: "Trace and reverse it", reason: "Sensitive log disclosure is difficult to retract and requires auditable handling." },
  ],
  GOV_MISSING_HUMAN_REVIEW: [
    { name: "Own it", reason: "No accountable person reviews sensitive or high-impact disclosures." },
    { name: "Break the lethal trifecta", reason: "The agent can combine private data, untrusted requests, and disclosure without a human boundary." },
  ],
};

function finding(input: Omit<Finding, "id" | "principles">): Finding {
  const principles = PRINCIPLES_BY_RULE[input.ruleId];
  if (!principles?.length) throw new Error(`Finding rule ${input.ruleId} has no release-readiness principle mapping.`);
  return { id: `${input.ruleId.toLowerCase()}-1`, principles, ...input };
}

export function sanitizeFiles(files: RepositoryFile[]) {
  if (files.length > SCAN_LIMITS.maxFiles) throw new Error("Repository exceeds the file count limit.");
  let totalBytes = 0;
  return files.filter((file) => {
    if (!isSafePath(file.path) || !APPROVED_EXTENSIONS.has(extension(file.path))) return false;
    const bytes = new TextEncoder().encode(file.content).byteLength;
    if (bytes > SCAN_LIMITS.maxFileBytes) return false;
    totalBytes += bytes;
    if (totalBytes > SCAN_LIMITS.maxTotalBytes) throw new Error("Repository exceeds the total size limit.");
    return true;
  });
}

export function scanRepository(repository: string, inputFiles: RepositoryFile[]): ScanResult {
  const files = sanitizeFiles(inputFiles);
  const allSource = files.map((file) => file.content).join("\n");
  const findings: Finding[] = [];

  const injectionFile = files.find((file) => detectPromptInjection(file.content));
  if (injectionFile) {
    const match = detectPromptInjection(injectionFile.content)!;
    findings.push(finding({
      ruleId: "SEC_INDIRECT_PROMPT_INJECTION",
      title: "Repository content contains an indirect prompt-injection pattern",
      severity: "high",
      category: "Prompt injection",
      explanation: "A source file contains language that attempts to instruct an AI reviewer to ignore higher-priority instructions.",
      impact: "If repository text is later passed to an LLM without strict isolation, an attacker could manipulate findings, suppress risks, or induce unauthorized actions.",
      remediation: "Keep repository content in a clearly delimited untrusted-data channel, never grant the analysis model tool authority, validate structured outputs, and require deterministic policy checks before acting.",
      evidence: { path: injectionFile.path, line: match.line, code: match.code },
    }));
  }

  const dynamicExecutionPatterns = [
    /\beval\s*\(/,
    /\bnew\s+Function\s*\(/,
  ];
  const dynamicExecutionFile = files.find((file) =>
    dynamicExecutionPatterns.some((pattern) => pattern.test(file.content)),
  );
  if (dynamicExecutionFile) {
    const lines = dynamicExecutionFile.content.split("\n");
    const lineIndex = lines.findIndex((line) =>
      dynamicExecutionPatterns.some((pattern) => pattern.test(line)),
    );
    findings.push(finding({
      ruleId: "SEC_DANGEROUS_DYNAMIC_EXECUTION",
      title: "Untrusted data can reach a dynamic code-execution primitive",
      severity: "critical",
      category: "Code security",
      explanation: "The repository uses a runtime code-evaluation primitive that can interpret attacker-controlled text as executable code.",
      impact: "A crafted request could execute arbitrary code with the application's privileges and expose data or infrastructure.",
      remediation: "Remove dynamic evaluation. Parse an allowlisted filter grammar into typed operations and reject unsupported fields, operators, and values.",
      evidence: {
        path: dynamicExecutionFile.path,
        line: lineIndex + 1,
        code: redactSecrets(lines[lineIndex].trim()),
      },
    }));
  }

  const sqlInjectionEvidence = firstPatternEvidence(files, [
    /\b(?:query|execute|prepare|raw)\s*\(\s*`[^`]*\$\{[^}]+\}[^`]*`/,
    /\b(?:query|execute|prepare|raw)\s*\(\s*["'][^"']*["']\s*\+/,
    /\$(?:queryRawUnsafe|executeRawUnsafe)\s*\(\s*(?!["'`][^"'`]*["'`]\s*\))/,
  ]);
  if (sqlInjectionEvidence) {
    findings.push(finding({
      ruleId: "INJ_SQL_OR_ORM",
      title: "Input may alter a SQL or ORM query",
      severity: "critical",
      category: "Injection",
      explanation: "A SQL or raw ORM sink receives a query assembled with interpolation, concatenation, or an explicitly unsafe raw-query API.",
      impact: "An attacker may change query structure to read or modify data outside the intended user, tenant, or operation scope.",
      remediation: "Use parameterized queries or the ORM's safe tagged-template/query builder, allowlist identifiers that cannot be parameterized, and authorize the resulting operation within the requesting user's tenant scope.",
      evidence: sqlInjectionEvidence,
    }));
  }

  const osCommandEvidence = firstPatternEvidence(files, [
    /\b(?:exec|execSync)\s*\(\s*`[^`]*\$\{[^}]+\}[^`]*`/,
    /\b(?:exec|execSync)\s*\(\s*["'][^"']*["']\s*\+/,
  ]);
  if (osCommandEvidence) {
    findings.push(finding({
      ruleId: "INJ_OS_COMMAND",
      title: "Input may alter an operating-system command",
      severity: "critical",
      category: "Injection",
      explanation: "A shell command is assembled with interpolated or concatenated values before execution.",
      impact: "Shell metacharacters in an attacker-controlled value may execute additional commands with the application's privileges.",
      remediation: "Avoid the shell. Invoke a fixed executable with an argument array, validate each value against a strict allowlist, use absolute executable paths, and run the process with minimal privileges and resource limits.",
      evidence: osCommandEvidence,
    }));
  }

  const argumentInjectionEvidence = firstPatternEvidence(files, [
    /\b(?:spawn|execFile|execFileSync)\s*\(\s*["'][^"']+["']\s*,\s*\[\s*(?:["'][^"']*["']\s*,\s*)*(?:user|input|arg|option|url|path|query|filename)[a-zA-Z0-9_$]*/i,
  ]);
  if (argumentInjectionEvidence) {
    findings.push(finding({
      ruleId: "INJ_ARGUMENT",
      title: "User-controlled value may become a process argument",
      severity: "high",
      category: "Injection",
      explanation: "An externally influenced value is passed into a process argument array without an evident allowlist or option boundary.",
      impact: "A leading flag or specially formed value may change the invoked program's behavior even though no shell is used.",
      remediation: "Map user choices to server-owned arguments, reject leading-option syntax, insert a supported end-of-options marker where appropriate, validate value shape, and test malicious flag inputs.",
      evidence: argumentInjectionEvidence,
    }));
  }

  const hasPackageManifest = files.some((file) => file.path === "package.json");
  const hasDependencyLock = files.some((file) =>
    /(?:^|\/)(?:package-lock\.json|npm-shrinkwrap\.json|pnpm-lock\.yaml|yarn\.lock)$/.test(file.path),
  );
  if (hasPackageManifest && !hasDependencyLock) {
    findings.push(finding({
      ruleId: "SUPPLY_CHAIN_MISSING_LOCKFILE",
      title: "Application dependencies are not locked",
      severity: "high",
      category: "Supply chain",
      explanation: "A package manifest is present without a supported dependency lockfile.",
      impact: "Identical builds can resolve different transitive packages, weakening reproducibility and increasing supply-chain exposure.",
      remediation: "Generate and commit one package-manager lockfile, use frozen-lockfile installs in CI, and run an advisory audit before release.",
      evidence: evidence(files, "package.json", /"dependencies"\s*:/),
    }));
  }

  if (/SERVICE_ACCOUNT/.test(allSource) && /password\s*:/.test(allSource)) {
    findings.push(finding({
      ruleId: "AUTH_SHARED_SERVICE_ACCOUNT",
      title: "Shared service account is embedded in the data layer",
      severity: "critical",
      category: "Authorization",
      explanation: "All analytics queries run under one reusable application identity with an embedded credential.",
      impact: "Actions cannot be attributed to a requesting user, and a leaked shared credential grants broad data access.",
      remediation: "Remove the credential from source, load a scoped secret at runtime, and exchange the signed-in user identity for least-privilege data access.",
      evidence: evidence(files, "src/analytics.ts", /password\s*:/),
    }));
  }

  if (/submitChat\(message: string\)/.test(allSource) && !/(userId|principal|authorize|permission)/i.test(allSource)) {
    findings.push(finding({
      ruleId: "AUTH_MISSING_USER_AUTHORIZATION",
      title: "Requests are not authorized for the requesting user",
      severity: "critical",
      category: "Authorization",
      explanation: "The chat boundary accepts only a message and forwards it directly to the agent.",
      impact: "Any caller can request customer or revenue data without role, tenant, or record-level checks.",
      remediation: "Require an authenticated principal, authorize every data request against role and tenant policy, and pass a scoped access context to tools.",
      evidence: evidence(files, "src/chat.ts", /submitChat\(message: string\)/),
    }));
  }

  if (/mockModelResponse/.test(allSource) && !/(modelCall|toolCall|traceId|auditLog)/.test(allSource)) {
    findings.push(finding({
      ruleId: "OBS_MISSING_AI_AUDIT_LOG",
      title: "Model and tool calls have no structured audit trail",
      severity: "high",
      category: "Observability",
      explanation: "The agent invokes analytics, CRM, and model logic without recording structured request, tool, outcome, latency, or trace metadata.",
      impact: "Incidents cannot be reconstructed and production failures will be difficult to diagnose.",
      remediation: "Add correlated structured events for model requests, tool calls, policy decisions, latency, status, and redacted outputs.",
      evidence: evidence(files, "src/agent.ts", /return mockModelResponse/),
    }));
  }

  if (!files.some((file) => /(eval|benchmark|golden|dataset)/i.test(file.path))) {
    findings.push(finding({
      ruleId: "EVAL_MISSING_FRAMEWORK",
      title: "No evaluation dataset or regression framework",
      severity: "high",
      category: "Evaluations",
      explanation: "The repository contains no evaluation cases, expected answers, scoring logic, or regression runner.",
      impact: "Prompt or tool changes can silently reduce answer quality, safety, or correctness.",
      remediation: "Add a versioned golden dataset covering normal, adversarial, authorization, and sensitive-data cases with automated scoring in CI.",
    }));
  }

  if (/await fetch\(/.test(allSource) && !/(AbortSignal|timeout|retry|backoff)/i.test(allSource)) {
    findings.push(finding({
      ruleId: "REL_MISSING_NETWORK_GUARDS",
      title: "CRM calls have no timeout or retry policy",
      severity: "high",
      category: "Reliability",
      explanation: "The CRM request waits on a single fetch with no deadline, bounded retry, or failure mapping.",
      impact: "A slow or transiently unavailable dependency can stall chat requests and create cascading failures.",
      remediation: "Add an abort timeout, retry only transient failures with bounded exponential backoff and jitter, and return a controlled degraded response.",
      evidence: evidence(files, "src/crm.ts", /await fetch/),
    }));
  }

  if (/const SYSTEM_PROMPT\s*=/.test(allSource)) {
    findings.push(finding({
      ruleId: "GOV_EMBEDDED_PROMPT",
      title: "System prompt is embedded in application code",
      severity: "medium",
      category: "Prompt management",
      explanation: "The production instruction set is a source constant with no version, owner, or review metadata.",
      impact: "Prompt changes are hard to audit, evaluate independently, or roll back safely.",
      remediation: "Move the prompt to a versioned configuration artifact with ownership, change review, release notes, and evaluation gates.",
      evidence: evidence(files, "src/agent.ts", /const SYSTEM_PROMPT/),
    }));
  }

  if (/console\.log\([^)]*customer/i.test(allSource)) {
    findings.push(finding({
      ruleId: "DATA_SENSITIVE_LOGGING",
      title: "Customer records may be written to application logs",
      severity: "critical",
      category: "Sensitive data",
      explanation: "The complete CRM customer object is passed to an unrestricted console log.",
      impact: "Email addresses, sales notes, and other customer data can leak into broadly retained logging systems.",
      remediation: "Remove raw-object logging, apply an allowlist-based redactor, classify fields, and test that sensitive values never reach logs.",
      evidence: evidence(files, "src/agent.ts", /console\.log/),
    }));
  }

  if (/lifetime_value|notes/.test(allSource) && !/(humanReview|approval|escalat|reviewQueue)/i.test(allSource)) {
    findings.push(finding({
      ruleId: "GOV_MISSING_HUMAN_REVIEW",
      title: "Sensitive requests bypass human review",
      severity: "high",
      category: "Human oversight",
      explanation: "Customer notes and financial-value data can be retrieved and returned without an approval or escalation step.",
      impact: "High-impact or privacy-sensitive requests can be fulfilled automatically even when policy requires judgment.",
      remediation: "Classify sensitive intents and records, pause high-risk requests, and require an authorized reviewer before tool execution or disclosure.",
      evidence: evidence(files, "src/analytics.ts", /lifetime_value/),
    }));
  }

  const rank = { critical: 0, high: 1, medium: 2, low: 3 };
  findings.sort((a, b) => rank[a.severity] - rank[b.severity] || a.title.localeCompare(b.title));
  return { repository, scannedFiles: files.length, findings };
}

export type { Finding, ReadinessPrinciple, RepositoryFile, ScanResult } from "./types";
