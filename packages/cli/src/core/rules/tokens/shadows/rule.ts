import { Rule, FileContent, Violation } from '../../../types';
import { getStyleLines } from '../../lineFilter';

const SHADOW_PATTERNS = [
  { pattern: /box-shadow\s*:\s*([^;]+)/g, type: 'css' },
  { pattern: /boxShadow\s*:\s*['"]([^'"]+)['"]/g, type: 'js' },
];

const HARDCODED_SHADOW_REGEX = /\d+px/g;

export const shadowsRule: Rule = {
  name: 'shadows/hardcoded',
  description: 'Detects hardcoded box-shadow values that should use design tokens',

  detect(file: FileContent): Violation[] {
    const violations: Violation[] = [];

    if (!file.path.match(/\.(tsx?|jsx?|css|scss)$/)) {
      return violations;
    }

    const lines = getStyleLines(file.content);

    for (const { content: line, index } of lines) {
      SHADOW_PATTERNS.forEach(({ pattern }) => {
        const regex = new RegExp(pattern.source, pattern.flags);
        let match;

        while ((match = regex.exec(line)) !== null) {
          const shadowValue = match[1];

          if (/\d+px/.test(shadowValue)) {
            violations.push({
              rule: 'shadows/hardcoded',
              file: file.path,
              line: index + 1,
              column: match.index + 1,
              message: `Hardcoded box-shadow: ${shadowValue.trim()}`,
              severity: 'warning',
              suggestion: 'Use a design token for shadows (e.g., shadows.sm, shadows.md, shadows.lg)',
            });
          }
        }
      });
    }

    return violations;
  },
};
