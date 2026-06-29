import * as fs from 'fs';
import * as path from 'path';
import { Violation } from './types';

const BASELINE_FILENAME = '.remediation-baseline.json';
const BASELINE_VERSION = 1;

export interface BaselineViolation {
  rule: string;
  file: string;
  line: number;
  column: number;
  message: string;
}

interface BaselineFile {
  version: number;
  createdAt: string;
  violations: BaselineViolation[];
}

function baselinePath(projectPath: string): string {
  return path.join(path.resolve(projectPath), BASELINE_FILENAME);
}

function toRelative(filePath: string, projectPath: string): string {
  const absProject = path.resolve(projectPath);
  const absFile = path.resolve(filePath);
  if (absFile.startsWith(absProject)) {
    return path.relative(absProject, absFile);
  }
  return path.relative(process.cwd(), absFile);
}

export function saveBaseline(violations: Violation[], projectPath: string): void {
  const baselineViolations: BaselineViolation[] = violations.map((v) => ({
    rule: v.rule,
    file: toRelative(v.file, projectPath),
    line: v.line,
    column: v.column,
    message: v.message,
  }));

  const baseline: BaselineFile = {
    version: BASELINE_VERSION,
    createdAt: new Date().toISOString(),
    violations: baselineViolations,
  };

  fs.writeFileSync(baselinePath(projectPath), JSON.stringify(baseline, null, 2), 'utf-8');
}

export function loadBaseline(projectPath: string): BaselineViolation[] | null {
  const filePath = baselinePath(projectPath);
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed: BaselineFile = JSON.parse(raw);
    return parsed.violations ?? null;
  } catch {
    return null;
  }
}

export function filterNewViolations(
  violations: Violation[],
  baseline: BaselineViolation[],
  projectPath: string
): { fresh: Violation[]; suppressed: number } {
  const baselineSet = new Set<string>(
    baseline.map((b) => `${b.rule}::${b.file}::${b.line}::${b.message}`)
  );

  const fresh: Violation[] = [];
  let suppressed = 0;

  for (const v of violations) {
    const relFile = toRelative(v.file, projectPath);
    const key = `${v.rule}::${relFile}::${v.line}::${v.message}`;
    if (baselineSet.has(key)) {
      suppressed++;
    } else {
      fresh.push(v);
    }
  }

  return { fresh, suppressed };
}
