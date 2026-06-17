import * as fs from 'fs';
import * as path from 'path';
import { Rule, FileContent, Violation, ScanResult, FileViolation } from './types';

export async function scanProject(
  projectPath: string,
  rules: Rule[],
  extensions: string[] = ['.ts', '.tsx', '.js', '.jsx']
): Promise<ScanResult> {
  const fileViolations: FileViolation[] = [];

  const fileRules = rules.filter(r => !r.detectProject);
  const projectRules = rules.filter(r => r.detectProject);

  const files = fs.statSync(projectPath).isFile() ? [projectPath] : collectFiles(projectPath, extensions);

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const fileContent: FileContent = { path: file, content };
    const violations = runRules(fileContent, fileRules);

    if (violations.length > 0) {
      fileViolations.push({
        path: file,
        violations,
        riskScore: calculateFileRiskScore(violations),
      });
    }
  }

  for (const rule of projectRules) {
    if (rule.detectProject) {
      const violations = await rule.detectProject(projectPath);
      const grouped = groupViolationsByFile(violations);

      for (const [filePath, ruleViolations] of grouped) {
        const existing = fileViolations.find(f => f.path === filePath);
        if (existing) {
          existing.violations.push(...ruleViolations);
          existing.riskScore = calculateFileRiskScore(existing.violations);
        } else {
          fileViolations.push({
            path: filePath,
            violations: ruleViolations,
            riskScore: calculateFileRiskScore(ruleViolations),
          });
        }
      }
    }
  }

  return {
    files: fileViolations,
    summary: calculateSummary(fileViolations),
    riskScore: calculateOverallRiskScore(fileViolations),
  };
}

export function scanDirectory(
  dir: string,
  rules: Rule[],
  extensions: string[] = ['.ts', '.tsx', '.js', '.jsx']
): ScanResult {
  const files = fs.statSync(dir).isFile() ? [dir] : collectFiles(dir, extensions);
  const fileViolations: FileViolation[] = [];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const fileContent: FileContent = { path: file, content };
    const violations = runRules(fileContent, rules);

    if (violations.length > 0) {
      fileViolations.push({
        path: file,
        violations,
        riskScore: calculateFileRiskScore(violations),
      });
    }
  }

  return {
    files: fileViolations,
    summary: calculateSummary(fileViolations),
    riskScore: calculateOverallRiskScore(fileViolations),
  };
}

function collectFiles(dir: string, extensions: string[]): string[] {
  const files: string[] = [];

  function traverse(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
          traverse(fullPath);
        }
      } else if (extensions.some(ext => entry.name.endsWith(ext))) {
        files.push(fullPath);
      }
    }
  }

  traverse(dir);
  return files;
}

function runRules(file: FileContent, rules: Rule[]): Violation[] {
  const violations: Violation[] = [];

  for (const rule of rules) {
    const ruleViolations = rule.detect(file);
    violations.push(...ruleViolations);
  }

  return violations;
}

function calculateFileRiskScore(violations: Violation[]): number {
  const weights: Record<string, number> = {
    error: 3,
    warning: 2,
    info: 1,
  };

  return violations.reduce((score, v) => score + (weights[v.severity] || 1), 0);
}

function calculateSummary(fileViolations: FileViolation[]): {
  total: number;
  errors: number;
  warnings: number;
  infos: number;
} {
  let errors = 0;
  let warnings = 0;
  let infos = 0;

  for (const file of fileViolations) {
    for (const violation of file.violations) {
      switch (violation.severity) {
        case 'error':
          errors++;
          break;
        case 'warning':
          warnings++;
          break;
        case 'info':
          infos++;
          break;
      }
    }
  }

  return {
    total: errors + warnings + infos,
    errors,
    warnings,
    infos,
  };
}

function calculateOverallRiskScore(fileViolations: FileViolation[]): number {
  return fileViolations.reduce((score, file) => score + file.riskScore, 0);
}

function groupViolationsByFile(violations: Violation[]): Map<string, Violation[]> {
  const grouped = new Map<string, Violation[]>();

  for (const violation of violations) {
    const existing = grouped.get(violation.file) || [];
    existing.push(violation);
    grouped.set(violation.file, existing);
  }

  return grouped;
}
