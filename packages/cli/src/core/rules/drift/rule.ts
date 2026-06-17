import { Rule, FileContent, Violation } from '../../types';
import * as fs from 'fs';
import * as path from 'path';

interface ComponentInfo {
  path: string;
  name: string;
  baseName: string;
  props: string[];
  content: string;
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
        } else if (/\.tsx$/.test(entry.name) && !entry.name.endsWith('.test.tsx')) {
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

function extractComponentName(filePath: string): string {
  const basename = path.basename(filePath, '.tsx');
  return basename;
}

function getBaseName(name: string): string {
  const normalized = name
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .split('-')
    .filter(part => !['button', 'card', 'modal', 'input', 'form', 'list', 'item', 'container', 'wrapper', 'layout', 'page', 'section', 'header', 'footer', 'nav', 'menu', 'dropdown', 'tab', 'panel', 'group'].includes(part))
    .join('-');

  return normalized || name.toLowerCase();
}

function extractProps(content: string): string[] {
  const props: string[] = [];
  const propRegex = /(\w+)(?:\s*:\s*\w+)?(?:\s*=|\s*\?)/g;
  let match;

  while ((match = propRegex.exec(content)) !== null) {
    if (!['function', 'const', 'let', 'var', 'import', 'export', 'return', 'if', 'else', 'for', 'while'].includes(match[1])) {
      props.push(match[1]);
    }
  }

  return [...new Set(props)];
}

function calculateStructureHash(content: string): string {
  const normalized = content
    .replace(/import\s+.*?from\s+['"].*?['"]/g, '')
    .replace(/export\s+(default\s+)?/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const jsxStructure = normalized.match(/<(?!\/)[^>]+>/g)?.join('') || '';
  return jsxStructure;
}

function findDuplicates(components: ComponentInfo[]): ComponentInfo[][] {
  const groups: ComponentInfo[][] = [];
  const used = new Set<number>();

  for (let i = 0; i < components.length; i++) {
    if (used.has(i)) continue;

    const group: ComponentInfo[] = [components[i]];
    used.add(i);

    for (let j = i + 1; j < components.length; j++) {
      if (used.has(j)) continue;

      const a = components[i];
      const b = components[j];

      const sameBase = getBaseName(a.baseName) === getBaseName(b.baseName) && a.baseName !== b.baseName;
      const similarStructure = calculateStructureHash(a.content) === calculateStructureHash(b.content) && a.content.length > 50;

      if (sameBase || similarStructure) {
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

  detect(file: FileContent): Violation[] {
    return [];
  },

  async detectProject(projectPath: string): Promise<Violation[]> {
    const violations: Violation[] = [];

    const componentFiles = findComponentFiles(projectPath);

    const components: ComponentInfo[] = componentFiles.map(file => {
      const content = fs.readFileSync(file, 'utf-8');
      const name = extractComponentName(file);
      return {
        path: file,
        name,
        baseName: name,
        props: extractProps(content),
        content,
      };
    });

    const groups = findDuplicates(components);

    for (const group of groups) {
      const names = group.map(c => c.name);
      const paths = group.map(c => path.relative(projectPath, c.path));

      for (const component of group) {
        const otherNames = names.filter(n => n !== component.name);
        violations.push({
          rule: 'drift',
          file: component.path,
          line: 1,
          column: 1,
          message: `Potential merge candidate: ${component.name} similar to ${otherNames.join(', ')}`,
          severity: 'warning',
          suggestion: `Consider merging ${names.length} components into one`,
        });
      }
    }

    return violations;
  },
};
