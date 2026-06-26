import { Rule, FileContent, Violation } from '../../../types';
import { getStyleLines } from '../../lineFilter';

const COLOR_PATTERNS = [
  { pattern: /['"]#([0-9a-fA-F]{3,8})['"]/g, type: 'hex' },
  { pattern: /rgb\(/g, type: 'rgb' },
  { pattern: /rgba\(/g, type: 'rgba' },
  { pattern: /hsl\(/g, type: 'hsl' },
  { pattern: /hsla\(/g, type: 'hsla' },
];

export const colorsRule: Rule = {
  name: 'colors/hardcoded',
  description: 'Detects hardcoded color values that should use design tokens',

  detect(file: FileContent): Violation[] {
    const violations: Violation[] = [];
    const lines = getStyleLines(file.content);

    for (const { content: line, index } of lines) {
      COLOR_PATTERNS.forEach(({ pattern, type }) => {
        const regex = new RegExp(pattern.source, pattern.flags);
        let match;

        while ((match = regex.exec(line)) !== null) {
          const value = match[0];

          violations.push({
            rule: 'colors/hardcoded',
            file: file.path,
            line: index + 1,
            column: match.index + 1,
            message: `Hardcoded ${type} color: ${value}`,
            severity: 'warning',
          });
        }
      });
    }

    return violations;
  },
};

