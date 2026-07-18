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
  | "Injection"
  | "Code security"
  | "Supply chain";

export type RepositoryFile = {
  path: string;
  content: string;
};

export type EvidenceState =
  | "finding"
  | "passed"
  | "implemented_unverified"
  | "documented_only"
  | "needs_review"
  | "not_applicable";

export type TechnologyInventory = {
  languages: string[];
  frameworks: string[];
  dataStores: string[];
  capabilities: string[];
};

export type CheckAssessment = {
  ruleId: string;
  title: string;
  category: Category;
  state: EvidenceState;
  reason: string;
  evidence?: {
    path: string;
    line: number;
    code: string;
  };
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
  inventory: TechnologyInventory;
  checks: CheckAssessment[];
};
