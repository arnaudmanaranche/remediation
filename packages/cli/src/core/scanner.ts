import * as fs from 'fs';
import * as path from 'path';
import { Rule, FileContent, Violation, ScanResult, FileViolation } from './types';
import { loadConfig, shouldIgnoreFile, getRuleSeverity, RemediationConfig } from './config';

export interface ScanProgress {
  onFile?: (file: string, current: number, total: number) => void;
  onProjectRule?: (rule: string) => void;
}

export async function scanProject(
  projectPath: string,
  rules: Rule[],
  extensions: string[] = ['.ts', '.tsx', '.js', '.jsx'],
  progress?: ScanProgress
): Promise<ScanResult> {
  const configDir = fs.statSync(projectPath).isFile() ? path.dirname(projectPath) : projectPath;
  const config = loadConfig(configDir);
  const fileViolations: FileViolation[] = [];

  const activeRules = filterRulesByConfig(rules, config);
  const fileRules = activeRules.filter(r => !r.detectProject);
  const projectRules = activeRules.filter(r => r.detectProject);

  const files = fs.statSync(projectPath).isFile() ? [projectPath] : collectFiles(projectPath, extensions, config);

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    progress?.onFile?.(file, i + 1, files.length);

    const content = fs.readFileSync(file, 'utf-8');
    const fileContent: FileContent = { path: file, content };
    const violations = runRules(fileContent, fileRules, config);

    if (violations.length > 0) {
      fileViolations.push({
        path: file,
        violations,
        riskScore: calculateFileRiskScore(violations),
      });
    }
  }

  for (const rule of projectRules) {
    progress?.onProjectRule?.(rule.name);

    if (rule.detectProject) {
      const violations = await rule.detectProject(projectPath);
      const filtered = filterViolationsByConfig(violations, config);
      const grouped = groupViolationsByFile(filtered);

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
  extensions: string[] = ['.ts', '.tsx', '.js', '.jsx'],
  progress?: ScanProgress
): ScanResult {
  const configDir = fs.statSync(dir).isFile() ? path.dirname(dir) : dir;
  const config = loadConfig(configDir);
  const activeRules = filterRulesByConfig(rules, config);
  const files = fs.statSync(dir).isFile() ? [dir] : collectFiles(dir, extensions, config);
  const fileViolations: FileViolation[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    progress?.onFile?.(file, i + 1, files.length);

    const content = fs.readFileSync(file, 'utf-8');
    const fileContent: FileContent = { path: file, content };
    const violations = runRules(fileContent, activeRules, config);

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

function collectFiles(dir: string, extensions: string[], config: RemediationConfig = {}): string[] {
  const files: string[] = [];
  const ignorePatterns = config.ignore || [];

  function traverse(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (shouldIgnoreFile(fullPath, ignorePatterns)) {
        continue;
      }

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

function runRules(file: FileContent, rules: Rule[], config: RemediationConfig = {}): Violation[] {
  const violations: Violation[] = [];

  for (const rule of rules) {
    const ruleViolations = rule.detect(file);
    const filtered = ruleViolations.map(v => ({
      ...v,
      severity: getRuleSeverity(v.rule, config, v.severity) as Violation['severity'],
    })).filter(v => v.severity !== 'off');
    violations.push(...filtered);
  }

  return violations;
}

function calculateFileRiskScore(violations: Violation[]): number {
  const errors = violations.filter(v => v.severity === 'error').length;
  const warnings = violations.filter(v => v.severity === 'warning').length;
  const infos = violations.filter(v => v.severity === 'info').length;

  const raw = (errors * 10) + (warnings * 2) + (infos * 0.5);
  const log = Math.log(raw + 1) * 15;

  return Math.min(Math.round(log), 100);
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
  const totalErrors = fileViolations.reduce((sum, f) =>
    sum + f.violations.filter(v => v.severity === 'error').length, 0);
  const totalWarnings = fileViolations.reduce((sum, f) =>
    sum + f.violations.filter(v => v.severity === 'warning').length, 0);
  const totalInfos = fileViolations.reduce((sum, f) =>
    sum + f.violations.filter(v => v.severity === 'info').length, 0);

  const raw = (totalErrors * 10) + (totalWarnings * 2) + (totalInfos * 0.5);
  const log = Math.log(raw + 1) * 15;

  return Math.min(Math.round(log), 100);
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

function filterRulesByConfig(rules: Rule[], config: RemediationConfig): Rule[] {
  if (!config.rules) {
    return rules;
  }

  return rules.filter(rule => {
    const configured = config.rules![rule.name];
    return configured !== 'off';
  });
}

function filterViolationsByConfig(violations: Violation[], config: RemediationConfig): Violation[] {
  if (!config.rules) {
    return violations;
  }

  return violations.map(v => ({
    ...v,
    severity: getRuleSeverity(v.rule, config, v.severity) as Violation['severity'],
  })).filter(v => v.severity !== 'off');
}
