import * as fs from 'fs';
import { Violation, FileContent, Transform } from './types';

export function applyTransforms(
  violations: Violation[],
  transforms: Map<string, Transform>
): FileContent[] {
  const filesByPath = groupViolationsByFile(violations);
  const results: FileContent[] = [];

  for (const [filePath, fileViolations] of filesByPath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    let modifiedContent = content;

    for (const violation of fileViolations) {
      const transform = transforms.get(violation.rule);
      if (transform) {
        const fileContent: FileContent = { path: filePath, content: modifiedContent };
        modifiedContent = transform.fix(violation, fileContent);
      }
    }

    if (modifiedContent !== content) {
      results.push({ path: filePath, content: modifiedContent });
    }
  }

  return results;
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
