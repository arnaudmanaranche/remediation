export interface Rule {
  name: string;
  description: string;
  detect: (file: FileContent) => Violation[];
  detectProject?: (projectPath: string) => Promise<Violation[]>;
}

export interface Transform {
  name: string;
  fix: (violation: Violation, file: FileContent) => string;
}

export interface FileContent {
  path: string;
  content: string;
}

export interface Violation {
  rule: string;
  file: string;
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
  suggestion?: string;
}

export interface ScanResult {
  files: FileViolation[];
  summary: {
    total: number;
    errors: number;
    warnings: number;
    infos: number;
  };
  riskScore: number;
}

export interface FileViolation {
  path: string;
  violations: Violation[];
  riskScore: number;
}
