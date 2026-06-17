import { Rule, FileContent, Violation } from '../../../types';

const RADIUS_PATTERNS = [
  { pattern: /border-radius\s*:\s*(\d+(?:\.\d+)?)(px|rem|em)/g, type: 'css' },
  { pattern: /borderRadius\s*:\s*['"]?(\d+(?:\.\d+)?)(px|rem|em)['"]?/g, type: 'js' },
];

const RADIUS_TOKENS: Record<string, string> = {
  '0': 'radius.none',
  '2': 'radius.sm',
  '4': 'radius.md',
  '8': 'radius.lg',
  '12': 'radius.xl',
  '16': 'radius.xxl',
  '9999': 'radius.full',
};

export const radiusRule: Rule = {
  name: 'radius/hardcoded',
  description: 'Detects hardcoded border-radius values that should use design tokens',

  detect(file: FileContent): Violation[] {
    const violations: Violation[] = [];

    if (!file.path.match(/\.(tsx?|jsx?|css|scss)$/)) {
      return violations;
    }

    const lines = file.content.split('\n');

    lines.forEach((line, index) => {
      RADIUS_PATTERNS.forEach(({ pattern, type }) => {
        const regex = new RegExp(pattern.source, pattern.flags);
        let match;

        while ((match = regex.exec(line)) !== null) {
          const value = match[0];
          const numericValue = match[1];
          const unit = match[2];
          const tokenSuggestion = suggestToken(numericValue, unit);

          if (tokenSuggestion) {
            violations.push({
              rule: 'radius/hardcoded',
              file: file.path,
              line: index + 1,
              column: match.index + 1,
              message: `Hardcoded border-radius: ${value}`,
              severity: 'warning',
              suggestion: `Use ${tokenSuggestion} instead`,
            });
          }
        }
      });
    });

    return violations;
  },
};

function suggestToken(value: string, unit: string): string | null {
  if (unit === 'px') {
    return RADIUS_TOKENS[value] || null;
  }

  if (unit === 'rem' || unit === 'em') {
    const pxValue = Math.round(parseFloat(value) * 16);
    return RADIUS_TOKENS[pxValue.toString()] || null;
  }

  return null;
}
