export type Severity = "critical" | "high" | "medium" | "low";

export type Category =
  | "Authorization"
  | "Sensitive data"
  | "Observability"
  | "Evaluations"
  | "Reliability"
  | "Human oversight"
  | "Prompt management"
  | "Prompt injection";

export type RepositoryFile = {
  path: string;
  content: string;
};

export type Finding = {
  id: string;
  ruleId: string;
  title: string;
  severity: Severity;
  category: Category;
  explanation: string;
  impact: string;
  remediation: string;
  evidence?: {
    path: string;
    line: number;
    code: string;
  };
};

export type ScanResult = {
  repository: string;
  scannedFiles: number;
  findings: Finding[];
};
