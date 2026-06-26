import { Rule, FileContent, Violation } from '../../../types';
import { getStyleLines } from '../../lineFilter';

const SPACING_PATTERNS = [
  { pattern: /(\d+)px/g, type: 'px' },
  { pattern: /(\d+)rem/g, type: 'rem' },
  { pattern: /(\d+)em/g, type: 'em' },
];

const TYPOGRAPHY_PROPERTIES = [
  'font-size',
  'fontSize',
  'font-weight',
  'fontWeight',
  'line-height',
  'lineHeight',
];

const SPACING_TOKENS: Record<string, string> = {
  '0': 'spacing.none',
  '2': 'spacing.xs',
  '4': 'spacing.sm',
  '8': 'spacing.md',
  '12': 'spacing.lg',
  '16': 'spacing.xl',
  '24': 'spacing.xxl',
  '32': 'spacing.xxxl',
};

export const spacingRule: Rule = {
  name: 'spacing/hardcoded',
  description: 'Detects hardcoded spacing values that should use design tokens',

  detect(file: FileContent): Violation[] {
    const violations: Violation[] = [];
    const lines = getStyleLines(file.content);

    for (const { content: line, index } of lines) {
      if (TYPOGRAPHY_PROPERTIES.some(prop => line.includes(prop))) continue;

      SPACING_PATTERNS.forEach(({ pattern, type }) => {
        const regex = new RegExp(pattern.source, pattern.flags);
        let match;

        while ((match = regex.exec(line)) !== null) {
          const value = match[0];
          const numericValue = match[1];
          const tokenSuggestion = suggestToken(numericValue, type);

          if (tokenSuggestion) {
            violations.push({
              rule: 'spacing/hardcoded',
              file: file.path,
              line: index + 1,
              column: match.index + 1,
              message: `Hardcoded ${type} spacing: ${value}`,
              severity: 'warning',
              suggestion: `Use ${tokenSuggestion} instead`,
            });
          }
        }
      });
    }

    return violations;
  },
};

function suggestToken(value: string, type: string): string | null {
  if (type === 'px') {
    return SPACING_TOKENS[value] || null;
  }

  if (type === 'rem') {
    const pxValue = Math.round(parseFloat(value) * 16);
    return SPACING_TOKENS[pxValue.toString()] || null;
  }

  if (type === 'em') {
    const pxValue = Math.round(parseFloat(value) * 16);
    return SPACING_TOKENS[pxValue.toString()] || null;
  }

  return null;
}
