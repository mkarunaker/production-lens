import type { RepositoryFile, ScanResult } from "../scanner/types";

export const DEMO_REMEDIATION_RULE_ID = "DATA_SENSITIVE_LOGGING";

export type RemediationProposal = {
  ruleId: string;
  title: string;
  path: string;
  line: number;
  before: string;
  after: string;
  rationale: string;
  checks: string[];
};

const SENSITIVE_LOG_BEFORE = '    console.log("CRM customer response", customer);';
const SENSITIVE_LOG_AFTER = '    console.log("CRM lookup completed");';

export function createDisposableCopy(files: RepositoryFile[]): RepositoryFile[] {
  return files.map((file) => ({ path: file.path, content: file.content }));
}

export function proposeRemediation(
  ruleId: string,
  files: RepositoryFile[],
): RemediationProposal {
  if (ruleId !== DEMO_REMEDIATION_RULE_ID) {
    throw new Error("This finding does not have a bundled demo remediation.");
  }
  const file = files.find((candidate) => candidate.path === "src/agent.ts");
  if (!file) throw new Error("Expected remediation target is missing.");
  const line = file.content.split("\n").findIndex((sourceLine) => sourceLine === SENSITIVE_LOG_BEFORE);
  if (line < 0) throw new Error("Expected vulnerable source line is missing.");

  return {
    ruleId,
    title: "Remove raw customer data from application logs",
    path: file.path,
    line: line + 1,
    before: SENSITIVE_LOG_BEFORE.trim(),
    after: SENSITIVE_LOG_AFTER.trim(),
    rationale: "Preserve a minimal operational event without writing the CRM response, email address, or sales notes to logs.",
    checks: [
      "Canonical bundled sample remains unchanged",
      "Raw customer object is absent from the disposable copy",
      "Sensitive-logging rule is resolved after rescan",
      "No other finding is removed by the patch",
    ],
  };
}

export function applyRemediation(
  ruleId: string,
  inputFiles: RepositoryFile[],
): RepositoryFile[] {
  const proposal = proposeRemediation(ruleId, inputFiles);
  const files = createDisposableCopy(inputFiles);
  const target = files.find((file) => file.path === proposal.path)!;
  target.content = target.content.replace(SENSITIVE_LOG_BEFORE, SENSITIVE_LOG_AFTER);
  return files;
}

export function validateRemediation(
  before: ScanResult,
  after: ScanResult,
  ruleId: string,
) {
  const beforeIds = new Set(before.findings.map((finding) => finding.ruleId));
  const afterIds = new Set(after.findings.map((finding) => finding.ruleId));
  const resolved = [...beforeIds].filter((id) => !afterIds.has(id));
  const introduced = [...afterIds].filter((id) => !beforeIds.has(id));

  return {
    passed:
      beforeIds.has(ruleId) &&
      !afterIds.has(ruleId) &&
      resolved.length === 1 &&
      introduced.length === 0,
    resolved,
    introduced,
    beforeCount: before.findings.length,
    afterCount: after.findings.length,
  };
}
