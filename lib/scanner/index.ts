import type { Category, CheckAssessment, EvidenceState, Finding, ReadinessPrinciple, RepositoryFile, ScanResult, TechnologyInventory } from "./types";

export const SCAN_LIMITS = {
  maxFiles: 200,
  maxFileBytes: 256_000,
  maxTotalBytes: 2_000_000,
} as const;

const APPROVED_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".py", ".json", ".lock", ".sql", ".md", ".txt", ".yml", ".yaml"]);
const APPLICATION_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".py"]);

function extension(path: string) {
  const dot = path.lastIndexOf(".");
  return dot < 0 ? "" : path.slice(dot).toLowerCase();
}

export function isApprovedFileExtension(path: string) {
  return APPROVED_EXTENSIONS.has(extension(path));
}

export function isSafePath(path: string) {
  const segments = path.split("/");
  return (
    path.length > 0 &&
    path.length <= 240 &&
    !path.startsWith("/") &&
    !path.includes("\\") &&
    !path.includes("\0") &&
    !/[\u0000-\u001f\u007f]/.test(path) &&
    !segments.some((segment) => segment === "" || segment === "." || segment === "..")
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
  /system\s+(?:message|prompt)\s+(?:override|instruction)/i,
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

type RuleProfile = {
  ruleId: string;
  title: string;
  category: Category;
};

const RULE_PROFILES: RuleProfile[] = [
  { ruleId: "SEC_INDIRECT_PROMPT_INJECTION", title: "Repository instructions remain inert", category: "Prompt injection" },
  { ruleId: "SEC_DANGEROUS_DYNAMIC_EXECUTION", title: "Dynamic code execution is absent", category: "Code security" },
  { ruleId: "SUPPLY_CHAIN_MISSING_LOCKFILE", title: "Dependencies are reproducibly locked", category: "Supply chain" },
  { ruleId: "AUTH_SHARED_SERVICE_ACCOUNT", title: "Data access uses attributable scoped identity", category: "Authorization" },
  { ruleId: "AUTH_MISSING_USER_AUTHORIZATION", title: "Requests enforce requesting-user authorization", category: "Authorization" },
  { ruleId: "OBS_MISSING_AI_AUDIT_LOG", title: "AI and tool activity has an audit trail", category: "Observability" },
  { ruleId: "EVAL_MISSING_FRAMEWORK", title: "Behavior has a regression evaluation framework", category: "Evaluations" },
  { ruleId: "REL_MISSING_NETWORK_GUARDS", title: "Network calls have bounded failure handling", category: "Reliability" },
  { ruleId: "GOV_EMBEDDED_PROMPT", title: "Prompts have versioned ownership", category: "Prompt management" },
  { ruleId: "DATA_SENSITIVE_LOGGING", title: "Sensitive records stay out of logs", category: "Sensitive data" },
  { ruleId: "GOV_MISSING_HUMAN_REVIEW", title: "Sensitive actions have accountable review", category: "Human oversight" },
  { ruleId: "INJ_SQL_OR_ORM", title: "SQL and ORM query structure is separated from input", category: "Injection" },
  { ruleId: "INJ_OS_COMMAND", title: "Input cannot alter shell commands", category: "Injection" },
  { ruleId: "INJ_ARGUMENT", title: "Input cannot alter process argument semantics", category: "Injection" },
  { ruleId: "INJ_NOSQL_QUERY", title: "NoSQL query structure is server-owned", category: "Injection" },
  { ruleId: "INJ_XSS_UNSAFE_HTML", title: "Untrusted content is rendered as inert text", category: "Injection" },
];

function unique(values: string[]) {
  return [...new Set(values)].sort();
}

function inventory(files: RepositoryFile[], applicationSource: string): TechnologyInventory {
  const extensions = new Set(files.map((file) => extension(file.path)));
  const manifestSource = files.filter((file) => /(?:^|\/)package(?:-lock)?\.json$/.test(file.path)).map((file) => file.content).join("\n");
  return {
    languages: unique([
      ...(extensions.has(".ts") || extensions.has(".tsx") ? ["TypeScript"] : []),
      ...(extensions.has(".js") || extensions.has(".jsx") ? ["JavaScript"] : []),
      ...(extensions.has(".py") ? ["Python"] : []),
      ...(extensions.has(".sql") ? ["SQL"] : []),
      ...(extensions.has(".json") ? ["JSON"] : []),
    ]),
    frameworks: unique([
      ...(/"next"\s*:|from\s+["']next/.test(manifestSource + applicationSource) ? ["Next.js"] : []),
      ...(/"react"\s*:|from\s+["']react/.test(manifestSource + applicationSource) || extensions.has(".tsx") || extensions.has(".jsx") ? ["React"] : []),
      ...(/\b(?:from|import)\s+(?:fastapi|starlette)\b/.test(applicationSource) ? ["FastAPI"] : []),
      ...(/\b(?:from|import)\s+(?:langchain|langgraph)(?:_|\.)/.test(applicationSource) ? ["LangChain/LangGraph"] : []),
    ]),
    dataStores: unique([
      ...(/better-sqlite3|\bsqlite\b/i.test(manifestSource + applicationSource) ? ["SQLite"] : []),
      ...(/\b(?:mongodb|mongoose)\b|\.findOne\s*\(/i.test(manifestSource + applicationSource) ? ["MongoDB-style"] : []),
      ...(/\bSELECT\b|\.query\s*\(/i.test(applicationSource) ? ["SQL query API"] : []),
    ]),
    capabilities: unique([
      ...(/mockModelResponse|modelCall|SYSTEM_PROMPT|answerQuestion|ChatOpenAI|ChatAnthropic|ChatPromptTemplate|langchain|langgraph/i.test(applicationSource) ? ["AI/model orchestration"] : []),
      ...(/\bfetch\s*\(|\brequests\.(?:get|post|put|patch|delete|request)\s*\(|\bhttpx\.(?:get|post|put|patch|delete|request)\s*\(/.test(applicationSource) ? ["Outbound HTTP"] : []),
      ...(/\b(?:exec|execFile|spawn)\s*\(|\bos\.system\s*\(|\bsubprocess\.(?:run|call|Popen|check_call|check_output)\s*\(/.test(applicationSource) ? ["Process execution"] : []),
      ...(/userId|principal|authenticate|authorize|permission/i.test(applicationSource) ? ["Identity boundary"] : []),
      ...(/customer|lifetime_value|notes/i.test(applicationSource) ? ["Sensitive customer data"] : []),
    ]),
  };
}

function assessChecks(
  files: RepositoryFile[],
  applicationFiles: RepositoryFile[],
  findings: Finding[],
  technology: TechnologyInventory,
): CheckAssessment[] {
  const applicationSource = applicationFiles.map((file) => file.content).join("\n");
  const docs = files.filter((file) => [".md", ".txt"].includes(extension(file.path)));
  const documentedControl = firstPatternEvidence(docs, [/\b(?:authentication|authorization|authorized|human review|audit logging|evaluation framework)\b/i]);
  const findingByRule = new Map(findings.map((item) => [item.ruleId, item]));
  const hasManifest = files.some((file) => /(?:^|\/)(?:package\.json|requirements\.txt|pyproject\.toml|Pipfile)$/.test(file.path));
  const hasLock = files.some((file) => /(?:^|\/)(?:package-lock\.json|npm-shrinkwrap\.json|pnpm-lock\.yaml|yarn\.lock|uv\.lock|poetry\.lock|Pipfile\.lock)$/.test(file.path));
  const hasEvaluationArtifact = files.some((file) => /(eval|benchmark|golden|dataset)/i.test(file.path));
  const hasAi = technology.capabilities.includes("AI/model orchestration");
  const hasNetwork = technology.capabilities.includes("Outbound HTTP");
  const hasSensitiveData = technology.capabilities.includes("Sensitive customer data");
  const hasChatBoundary = /submitChat\s*\(/.test(applicationSource);
  const hasIdentityCode = /userId|principal|authenticate|authorize|permission/i.test(applicationSource);
  const hasPrompt = /PROMPT|promptConfig|promptVersion/i.test(applicationSource);
  const hasSql = technology.dataStores.includes("SQL query API") || technology.dataStores.includes("SQLite");
  const hasNoSql = technology.dataStores.includes("MongoDB-style");
  const hasProcess = technology.capabilities.includes("Process execution");
  const hasBrowserRendering =
    /dangerouslySetInnerHTML|innerHTML|outerHTML|document\.write|insertAdjacentHTML/.test(applicationSource) ||
    applicationFiles.some((file) => [".tsx", ".jsx"].includes(extension(file.path)));

  function stateFor(ruleId: string): { state: EvidenceState; reason: string; evidence?: CheckAssessment["evidence"] } {
    const detected = findingByRule.get(ruleId);
    if (detected) return { state: "finding", reason: detected.explanation, evidence: detected.evidence };
    if (ruleId === "SEC_INDIRECT_PROMPT_INJECTION") return { state: "passed", reason: "No recognized hostile instruction pattern was detected in approved repository text." };
    if (ruleId === "SEC_DANGEROUS_DYNAMIC_EXECUTION") return { state: "passed", reason: "No supported runtime code-evaluation primitive was detected." };
    if (ruleId === "SUPPLY_CHAIN_MISSING_LOCKFILE") {
      return hasManifest
        ? { state: hasLock ? "passed" : "finding", reason: hasLock ? "A supported dependency lockfile is present." : "A dependency manifest has no supported lockfile." }
        : { state: "not_applicable", reason: "No supported dependency manifest was detected." };
    }
    if (ruleId === "INJ_SQL_OR_ORM") return hasSql
      ? { state: "implemented_unverified", reason: "SQL usage was detected without a high-signal unsafe sink; deeper data-flow verification is still required." }
      : { state: "not_applicable", reason: "No supported SQL or ORM usage was detected." };
    if (ruleId === "INJ_NOSQL_QUERY") return hasNoSql
      ? { state: "implemented_unverified", reason: "Mongo-style usage was detected without a high-signal unsafe sink; schema and operator validation remain unverified." }
      : { state: "not_applicable", reason: "No supported NoSQL query API was detected." };
    if (ruleId === "INJ_OS_COMMAND" || ruleId === "INJ_ARGUMENT") return hasProcess
      ? { state: "implemented_unverified", reason: "Process execution exists without a detected high-signal issue; allowlists and runtime containment remain unverified." }
      : { state: "not_applicable", reason: "No supported process-execution API was detected." };
    if (ruleId === "INJ_XSS_UNSAFE_HTML") return hasBrowserRendering
      ? { state: "implemented_unverified", reason: "Browser rendering exists without a detected unsafe sink; contextual encoding and sanitizer behavior remain unverified." }
      : { state: "not_applicable", reason: "No supported browser HTML rendering surface was detected." };
    if (ruleId === "AUTH_MISSING_USER_AUTHORIZATION") {
      if (!hasChatBoundary) return documentedControl
        ? { state: "documented_only", reason: "Documentation claims a control, but no supported request boundary implementation was detected.", evidence: documentedControl }
        : { state: "not_applicable", reason: "No supported user request boundary was detected." };
      return hasIdentityCode
        ? { state: "implemented_unverified", reason: "Identity-related code exists, but policy enforcement and tenant isolation have not been proven." }
        : { state: "needs_review", reason: "A request boundary exists, but deterministic analysis cannot prove complete authorization." };
    }
    if (ruleId === "AUTH_SHARED_SERVICE_ACCOUNT") return technology.dataStores.length
      ? { state: "needs_review", reason: "No embedded shared credential was detected, but runtime identity scope and attribution require review." }
      : { state: "not_applicable", reason: "No supported data-store access was detected." };
    if (ruleId === "OBS_MISSING_AI_AUDIT_LOG") return hasAi
      ? { state: "implemented_unverified", reason: "Audit-related evidence exists or no absence rule fired, but event completeness and redaction are unverified." }
      : documentedControl
        ? { state: "documented_only", reason: "Documentation mentions controls, but no supported AI orchestration implementation was detected.", evidence: documentedControl }
        : { state: "not_applicable", reason: "No supported AI/model orchestration was detected." };
    if (ruleId === "EVAL_MISSING_FRAMEWORK") return hasAi
      ? { state: hasEvaluationArtifact ? "implemented_unverified" : "needs_review", reason: hasEvaluationArtifact ? "An evaluation artifact exists, but execution and scoring are not verified." : "AI behavior was detected without verified evaluation evidence." }
      : { state: "not_applicable", reason: "No supported AI/model orchestration was detected." };
    if (ruleId === "REL_MISSING_NETWORK_GUARDS") return hasNetwork
      ? { state: "implemented_unverified", reason: "Network calls exist without a detected missing-guard pattern; retry and degraded-mode behavior remain unverified." }
      : { state: "not_applicable", reason: "No supported outbound HTTP call was detected." };
    if (ruleId === "GOV_EMBEDDED_PROMPT") return hasPrompt
      ? { state: "implemented_unverified", reason: "Prompt-related configuration exists, but ownership, review, and rollback evidence remain unverified." }
      : { state: "not_applicable", reason: "No supported application prompt was detected." };
    if (ruleId === "DATA_SENSITIVE_LOGGING") return hasSensitiveData
      ? { state: "needs_review", reason: "Sensitive-data handling exists without a detected raw logging sink; redaction coverage still requires review." }
      : { state: "not_applicable", reason: "No supported sensitive customer-data field was detected." };
    if (ruleId === "GOV_MISSING_HUMAN_REVIEW") return hasSensitiveData
      ? { state: "implemented_unverified", reason: "A review indicator exists or the absence rule did not fire, but approval authority and bypass resistance remain unverified." }
      : { state: "not_applicable", reason: "No supported sensitive action or data field was detected." };
    return { state: "needs_review", reason: "Applicability could not be established deterministically." };
  }

  return RULE_PROFILES.map((profile) => ({ ...profile, ...stateFor(profile.ruleId) }));
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
  INJ_NOSQL_QUERY: [
    { name: "Prove it", reason: "Adversarial tests must show that operator-bearing objects cannot alter the intended query." },
    { name: "Contain it", reason: "Database identities and tenant filters must limit the records exposed by a manipulated filter." },
    { name: "Break the lethal trifecta", reason: "Untrusted request objects can reach a private-data query interpreter and enable disclosure or modification." },
  ],
  INJ_XSS_UNSAFE_HTML: [
    { name: "Prove it", reason: "Browser-focused adversarial tests must show that attacker-controlled markup is rendered only as inert text." },
    { name: "Contain it", reason: "Contextual encoding and a restrictive content security policy limit script execution and data exposure." },
    { name: "Break the lethal trifecta", reason: "Untrusted content rendered in a privileged browser session can reach private data and external actions." },
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
    if (!isSafePath(file.path) || !isApprovedFileExtension(file.path)) return false;
    const bytes = new TextEncoder().encode(file.content).byteLength;
    if (bytes > SCAN_LIMITS.maxFileBytes) return false;
    totalBytes += bytes;
    if (totalBytes > SCAN_LIMITS.maxTotalBytes) throw new Error("Repository exceeds the total size limit.");
    return true;
  });
}

export function scanRepository(repository: string, inputFiles: RepositoryFile[]): ScanResult {
  const files = sanitizeFiles(inputFiles);
  const applicationFiles = files.filter((file) => APPLICATION_EXTENSIONS.has(extension(file.path)));
  const applicationSource = applicationFiles.map((file) => file.content).join("\n");
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
  const dynamicExecutionFile = applicationFiles.find((file) =>
    dynamicExecutionPatterns.some((pattern) => pattern.test(file.content)) ||
    (extension(file.path) === ".py" && /\bexec\s*\(/.test(file.content)),
  );
  if (dynamicExecutionFile) {
    const lines = dynamicExecutionFile.content.split("\n");
    const lineIndex = lines.findIndex((line) =>
      dynamicExecutionPatterns.some((pattern) => pattern.test(line)) ||
      (extension(dynamicExecutionFile.path) === ".py" && /\bexec\s*\(/.test(line)),
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

  const sqlInjectionEvidence = firstPatternEvidence(applicationFiles, [
    /\b(?:query|execute|prepare|raw)\s*\(\s*`[^`]*\$\{[^}]+\}[^`]*`/,
    /\b(?:query|execute|prepare|raw)\s*\(\s*["'][^"']*["']\s*\+/,
    /\$(?:queryRawUnsafe|executeRawUnsafe)\s*\(\s*(?!["'`][^"'`]*["'`]\s*\))/,
    /\b(?:execute|executemany|raw)\s*\(\s*f["'].*\{[^}]+\}.*["']/,
    /\b(?:execute|executemany|raw)\s*\(\s*["'][^"']*["']\s*(?:\+|%)/,
    /\b(?:execute|executemany|raw)\s*\(\s*["'][^"']*\{\}[^"']*["']\.format\s*\(/,
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

  const osCommandEvidence = firstPatternEvidence(applicationFiles, [
    /\b(?:exec|execSync)\s*\(\s*`[^`]*\$\{[^}]+\}[^`]*`/,
    /\b(?:exec|execSync)\s*\(\s*["'][^"']*["']\s*\+/,
    /\bos\.system\s*\(\s*f?["'][^"']*(?:\{[^}]+\}|["']\s*\+)/,
    /\bsubprocess\.(?:run|call|Popen|check_call|check_output)\s*\(\s*f?["'][^"']*(?:\{[^}]+\}|["']\s*\+)[^)]*shell\s*=\s*True/,
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

  const argumentInjectionEvidence = firstPatternEvidence(applicationFiles, [
    /\b(?:spawn|execFile|execFileSync)\s*\(\s*["'][^"']+["']\s*,\s*\[\s*(?:["'][^"']*["']\s*,\s*)*(?:user|input|arg|option|url|path|query|filename)[a-zA-Z0-9_$]*/i,
    /\bsubprocess\.(?:run|call|Popen|check_call|check_output)\s*\(\s*\[\s*["'][^"']+["']\s*,\s*(?:user|input|arg|option|url|path|query|filename)[a-zA-Z0-9_]*\b/i,
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

  const noSqlInjectionEvidence = firstPatternEvidence(applicationFiles, [
    /\b(?:find|findOne|findOneAndUpdate|updateOne|updateMany|deleteOne|deleteMany|countDocuments)\s*\(\s*(?:req(?:uest)?\.body|ctx\.request\.body)\b/i,
    /\b(?:find|findOne|findOneAndUpdate|updateOne|updateMany|deleteOne|deleteMany|countDocuments)\s*\(\s*\{\s*\.\.\.(?:req(?:uest)?\.body|ctx\.request\.body)\b/i,
    /\$(?:where|expr)\s*:\s*(?:req(?:uest)?\.(?:body|query)|ctx\.request\.body|user[A-Za-z0-9_$]*|input[A-Za-z0-9_$]*)\b/i,
  ]);
  if (noSqlInjectionEvidence) {
    findings.push(finding({
      ruleId: "INJ_NOSQL_QUERY",
      title: "Untrusted objects may alter a NoSQL query",
      severity: "critical",
      category: "Injection",
      explanation: "A Mongo-style query sink receives an entire request object, a spread request object, or an untrusted server-side expression.",
      impact: "Operator keys such as $ne, $regex, or $where may bypass intended filters, expose records, modify data, or consume excessive database resources.",
      remediation: "Build a server-owned typed filter from individually validated primitive values, reject keys beginning with '$' or containing '.', disable server-side JavaScript, enforce tenant scope separately, and use a least-privilege database identity.",
      evidence: noSqlInjectionEvidence,
    }));
  }

  const xssEvidence = firstPatternEvidence(applicationFiles, [
    /dangerouslySetInnerHTML\s*=\s*\{\s*\{\s*__html\s*:\s*(?:(?:props|req(?:uest)?\.body)\.)?(?:user|input|untrusted|raw|html|content|markdown|message)[A-Za-z0-9_$]*/i,
    /\.(?:innerHTML|outerHTML)\s*=\s*(?:(?:props|req(?:uest)?\.body)\.)?(?:user|input|untrusted|raw|html|content|markdown|message)[A-Za-z0-9_$]*/i,
    /\b(?:document\.write|insertAdjacentHTML)\s*\([^)]*(?:(?:props|req(?:uest)?\.body)\.)?(?:user|input|untrusted|raw|html|content|markdown|message)[A-Za-z0-9_$]*/i,
  ]);
  if (xssEvidence) {
    findings.push(finding({
      ruleId: "INJ_XSS_UNSAFE_HTML",
      title: "Untrusted content may be rendered as executable HTML",
      severity: "high",
      category: "Injection",
      explanation: "A React or browser HTML sink receives a value whose name indicates externally influenced or raw content without an evident contextual encoding boundary.",
      impact: "An attacker may execute script in another user's browser, access session-visible data, impersonate the user, or trigger consequential actions.",
      remediation: "Render untrusted values through framework text interpolation or textContent. If HTML is required, sanitize it with a maintained allowlist-based sanitizer, prohibit scriptable URLs and event attributes, and retain a restrictive CSP as defense in depth.",
      evidence: xssEvidence,
    }));
  }

  const dependencyManifest = files.find((file) =>
    /(?:^|\/)(?:package\.json|requirements\.txt|pyproject\.toml|Pipfile)$/.test(file.path),
  );
  const hasDependencyLock = files.some((file) =>
    /(?:^|\/)(?:package-lock\.json|npm-shrinkwrap\.json|pnpm-lock\.yaml|yarn\.lock|uv\.lock|poetry\.lock|Pipfile\.lock)$/.test(file.path),
  );
  if (dependencyManifest && !hasDependencyLock) {
    const manifestEvidencePattern =
      extension(dependencyManifest.path) === ".json" ? /"dependencies"\s*:/ : /^(?!\s*#)\s*\S/;
    findings.push(finding({
      ruleId: "SUPPLY_CHAIN_MISSING_LOCKFILE",
      title: "Application dependencies are not locked",
      severity: "high",
      category: "Supply chain",
      explanation: "A dependency manifest is present without a supported dependency lockfile.",
      impact: "Identical builds can resolve different transitive packages, weakening reproducibility and increasing supply-chain exposure.",
      remediation: "Generate and commit one package-manager lockfile, use frozen-lockfile installs in CI, and run an advisory audit before release.",
      evidence: firstPatternEvidence([dependencyManifest], [manifestEvidencePattern]),
    }));
  }

  if (/SERVICE_ACCOUNT/.test(applicationSource) && /password\s*:/.test(applicationSource)) {
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

  if (/submitChat\(message: string\)/.test(applicationSource) && !/(userId|principal|authorize|permission)/i.test(applicationSource)) {
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

  if (/mockModelResponse/.test(applicationSource) && !/(modelCall|toolCall|traceId|auditLog)/.test(applicationSource)) {
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

  const hasAiApplication = /mockModelResponse|SYSTEM_PROMPT|answerQuestion|modelCall|toolCall|ChatOpenAI|ChatAnthropic|ChatPromptTemplate|langchain|langgraph/i.test(applicationSource);
  if (hasAiApplication && !files.some((file) => /(eval|benchmark|golden|dataset)/i.test(file.path))) {
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

  const unguardedNetworkEvidence = firstPatternEvidence(applicationFiles, [
    /\bfetch\s*\(/,
    /\brequests\.(?:get|post|put|patch|delete|request)\s*\((?![^\n]*\btimeout\s*=)/,
    /\bhttpx\.(?:get|post|put|patch|delete|request)\s*\((?![^\n]*\btimeout\s*=)/,
  ]);
  if (unguardedNetworkEvidence && !/(AbortSignal|timeout|retry|backoff)/i.test(applicationSource)) {
    findings.push(finding({
      ruleId: "REL_MISSING_NETWORK_GUARDS",
      title: "CRM calls have no timeout or retry policy",
      severity: "high",
      category: "Reliability",
      explanation: "The CRM request waits on a single fetch with no deadline, bounded retry, or failure mapping.",
      impact: "A slow or transiently unavailable dependency can stall chat requests and create cascading failures.",
      remediation: "Add an abort timeout, retry only transient failures with bounded exponential backoff and jitter, and return a controlled degraded response.",
      evidence: unguardedNetworkEvidence,
    }));
  }

  const embeddedPromptEvidence = firstPatternEvidence(applicationFiles, [
    /\bconst\s+[A-Z0-9_]*PROMPT\s*=/,
    /^[A-Z][A-Z0-9_]*PROMPT\s*(?::[^=]+)?=/,
  ]);
  if (embeddedPromptEvidence) {
    findings.push(finding({
      ruleId: "GOV_EMBEDDED_PROMPT",
      title: "System prompt is embedded in application code",
      severity: "medium",
      category: "Prompt management",
      explanation: "The production instruction set is a source constant with no version, owner, or review metadata.",
      impact: "Prompt changes are hard to audit, evaluate independently, or roll back safely.",
      remediation: "Move the prompt to a versioned configuration artifact with ownership, change review, release notes, and evaluation gates.",
      evidence: embeddedPromptEvidence,
    }));
  }

  const sensitiveLoggingEvidence = firstPatternEvidence(applicationFiles, [
    /console\.log\([^)]*customer/i,
    /\bprint\s*\(\s*(?:customer|record|notes|email|token|credential)(?:_data|_value|_record|_object)?\s*\)/i,
    /\b(?:logger|logging)\.(?:debug|info|warning|error|critical)\s*\([^)]*,\s*(?:customer|record|notes|email|token|credential)(?:_data|_value|_record|_object)?\s*\)/i,
  ]);
  if (sensitiveLoggingEvidence) {
    findings.push(finding({
      ruleId: "DATA_SENSITIVE_LOGGING",
      title: "Sensitive values may be written to application logs",
      severity: "critical",
      category: "Sensitive data",
      explanation: "A sensitive-looking application value is passed directly to an unrestricted logging sink.",
      impact: "Credentials, customer records, or other sensitive values can leak into broadly retained logging systems.",
      remediation: "Remove raw-object logging, apply an allowlist-based redactor, classify fields, and test that sensitive values never reach logs.",
      evidence: sensitiveLoggingEvidence,
    }));
  }

  if (/lifetime_value|notes/.test(applicationSource) && !/(humanReview|approval|escalat|reviewQueue)/i.test(applicationSource)) {
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
  const technology = inventory(files, applicationSource);
  const checks = assessChecks(files, applicationFiles, findings, technology);
  return { repository, scannedFiles: files.length, findings, inventory: technology, checks };
}

export type { CheckAssessment, EvidenceState, Finding, ReadinessPrinciple, RepositoryFile, ScanResult, TechnologyInventory } from "./types";
