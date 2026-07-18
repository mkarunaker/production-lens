export type Severity = "critical" | "high" | "medium" | "low";

export type ReadinessPrinciple =
  | "Own it"
  | "Prove it"
  | "Contain it"
  | "Trace and reverse it"
  | "Break the lethal trifecta";

export type Category =
  | "Authorization"
  | "Sensitive data"
  | "Observability"
  | "Evaluations"
  | "Reliability"
  | "Human oversight"
  | "Prompt management"
  | "Prompt injection"
  | "Code security"
  | "Supply chain";

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
  principles: {
    name: ReadinessPrinciple;
    reason: string;
  }[];
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
