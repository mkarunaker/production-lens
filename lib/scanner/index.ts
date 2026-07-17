import type { Finding, RepositoryFile, ScanResult } from "./types";

export const SCAN_LIMITS = {
  maxFiles: 200,
  maxFileBytes: 256_000,
  maxTotalBytes: 2_000_000,
} as const;

const APPROVED_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".json", ".sql", ".md", ".txt", ".yml", ".yaml"]);

function extension(path: string) {
  const dot = path.lastIndexOf(".");
  return dot < 0 ? "" : path.slice(dot).toLowerCase();
}

function isSafePath(path: string) {
  return !path.startsWith("/") && !path.split(/[\\/]/).includes("..") && !path.includes("\0");
}

export function redactSecrets(code: string) {
  return code
    .replace(/((?:password|secret|token|api[_-]?key)\s*[:=]\s*["'])[^"']+(["'])/gi, "$1[REDACTED]$2")
    .replace(/\b(sk-[a-z0-9_-]{8,})\b/gi, "[REDACTED]");
}

function evidence(files: RepositoryFile[], path: string, pattern: RegExp) {
  const file = files.find((candidate) => candidate.path === path);
  if (!file) return undefined;
  const lines = file.content.split("\n");
  const index = lines.findIndex((line) => pattern.test(line));
  if (index < 0) return undefined;
  return { path, line: index + 1, code: redactSecrets(lines[index].trim()) };
}

function finding(input: Omit<Finding, "id">): Finding {
  return { id: `${input.ruleId.toLowerCase()}-1`, ...input };
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

export type { Finding, RepositoryFile, ScanResult } from "./types";
