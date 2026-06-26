import { Rule, FileContent, Violation } from '../../types';
import * as fs from 'fs';
import * as path from 'path';

interface ComponentInfo {
  path: string;
  name: string;
  jsxHash: string;
  lineCount: number;
}

function findComponentFiles(projectPath: string): string[] {
  const files: string[] = [];

  function traverse(dir: string) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (!entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== 'build') {
            traverse(fullPath);
          }
        } else if (/\.tsx$/.test(entry.name) && !entry.name.endsWith('.test.tsx') && !entry.name.endsWith('.stories.tsx')) {
          files.push(fullPath);
        }
      }
    } catch {
      // skip unreadable dirs
    }
  }

  traverse(projectPath);
  return files;
}

/**
 * Extracts a structural hash from JSX: just the element type names in order,
 * ignoring all props/attributes. Two components with the same element structure
 * but different styling are considered drift candidates.
 *
 * Example: <button><span>{x}</span></button> → "button|span"
 */
function buildJsxStructureHash(content: string): string {
  const elements = content.match(/<([A-Za-z][A-Za-z0-9.]*)[^>]*>/g) || [];
  return elements
    .map(tag => {
      const m = tag.match(/^<([A-Za-z][A-Za-z0-9.]*)/);
      return m ? m[1].toLowerCase() : '';
    })
    .filter(Boolean)
    .join('|');
}

function isSimilarName(a: string, b: string): boolean {
  if (a === b) return false;

  const normalize = (s: string) =>
    s.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().split(/\s+/);

  const partsA = normalize(a);
  const partsB = normalize(b);

  const shared = partsA.filter(p => partsB.includes(p));
  const union = new Set([...partsA, ...partsB]).size;

  // Jaccard similarity >= 0.5 means half or more of the words overlap
  return shared.length / union >= 0.5;
}

function findDuplicates(components: ComponentInfo[]): ComponentInfo[][] {
  const groups: ComponentInfo[][] = [];
  const used = new Set<number>();

  // Only consider files with meaningful content (> 5 lines)
  const candidates = components.filter(c => c.lineCount > 5);

  for (let i = 0; i < candidates.length; i++) {
    if (used.has(i)) continue;

    const group: ComponentInfo[] = [candidates[i]];
    used.add(i);

    for (let j = i + 1; j < candidates.length; j++) {
      if (used.has(j)) continue;

      const a = candidates[i];
      const b = candidates[j];

      const sameStructure =
        a.jsxHash.length > 0 &&
        a.jsxHash === b.jsxHash;

      const similarName = isSimilarName(a.name, b.name);

      if (sameStructure || similarName) {
        group.push(b);
        used.add(j);
      }
    }

    if (group.length > 1) {
      groups.push(group);
    }
  }

  return groups;
}

export const driftRule: Rule = {
  name: 'drift',
  description: 'Detects duplicate components that should be merged',

  detect(_file: FileContent): Violation[] {
    return [];
  },

  async detectProject(projectPath: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const componentFiles = findComponentFiles(projectPath);

    const components: ComponentInfo[] = componentFiles.map(file => {
      const content = fs.readFileSync(file, 'utf-8');
      return {
        path: file,
        name: path.basename(file, '.tsx'),
        jsxHash: buildJsxStructureHash(content),
        lineCount: content.split('\n').length,
      };
    });

    const groups = findDuplicates(components);

    for (const group of groups) {
      const names = group.map(c => c.name);
      for (const component of group) {
        const otherNames = names.filter(n => n !== component.name);
        violations.push({
          rule: 'drift',
          file: component.path,
          line: 1,
          column: 1,
          message: `Drift candidate: ${component.name} is structurally similar to ${otherNames.join(', ')}`,
          severity: 'warning',
          suggestion: `Consider merging these ${names.length} components or extracting a shared base`,
        });
      }
    }

    return violations;
  },
};
