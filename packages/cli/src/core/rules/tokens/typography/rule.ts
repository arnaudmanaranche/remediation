import { Rule, FileContent, Violation } from '../../../types';

const TYPOGRAPHY_PATTERNS = [
  { pattern: /font-family:\s*['"]([^'"]+)['"]/g, type: 'fontFamily' },
  { pattern: /fontFamily:\s*['"]([^'"]+)['"]/g, type: 'fontFamily' },
  { pattern: /font-size:\s*['"]?(\d+)(px|rem|em)['"]?/g, type: 'fontSize' },
  { pattern: /fontSize:\s*['"]?(\d+)(px|rem|em)['"]?/g, type: 'fontSize' },
  { pattern: /font-weight:\s*['"]?(\d+)['"]?/g, type: 'fontWeight' },
  { pattern: /fontWeight:\s*['"]?(\d+)['"]?/g, type: 'fontWeight' },
  { pattern: /line-height:\s*['"]?(\d+\.?\d*)['"]?/g, type: 'lineHeight' },
  { pattern: /lineHeight:\s*['"]?(\d+\.?\d*)['"]?/g, type: 'lineHeight' },
];

const TYPOGRAPHY_TOKENS: Record<string, Record<string, string>> = {
  fontFamily: {
    'arial': 'typography.fontFamily.sans',
    'helvetica': 'typography.fontFamily.sans',
    'times': 'typography.fontFamily.serif',
    'courier': 'typography.fontFamily.mono',
  },
  fontSize: {
    '12': 'typography.fontSize.sm',
    '14': 'typography.fontSize.md',
    '16': 'typography.fontSize.base',
    '18': 'typography.fontSize.lg',
    '20': 'typography.fontSize.xl',
    '24': 'typography.fontSize.xxl',
  },
  fontWeight: {
    '400': 'typography.fontWeight.normal',
    '500': 'typography.fontWeight.medium',
    '600': 'typography.fontWeight.semibold',
    '700': 'typography.fontWeight.bold',
  },
  lineHeight: {
    '1': 'typography.lineHeight.tight',
    '1.5': 'typography.lineHeight.normal',
    '2': 'typography.lineHeight.relaxed',
  },
};

export const typographyRule: Rule = {
  name: 'typography/hardcoded',
  description: 'Detects hardcoded typography values that should use design tokens',

  detect(file: FileContent): Violation[] {
    const violations: Violation[] = [];
    const lines = file.content.split('\n');

    lines.forEach((line, index) => {
      TYPOGRAPHY_PATTERNS.forEach(({ pattern, type }) => {
        const regex = new RegExp(pattern.source, pattern.flags);
        let match;

        while ((match = regex.exec(line)) !== null) {
          const value = match[0];
          const tokenSuggestion = suggestToken(value, type);

          if (tokenSuggestion) {
            violations.push({
              rule: 'typography/hardcoded',
              file: file.path,
              line: index + 1,
              column: match.index + 1,
              message: `Hardcoded ${type}: ${value}`,
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

function suggestToken(value: string, type: string): string | null {
  const tokens = TYPOGRAPHY_TOKENS[type];
  if (!tokens) return null;

  if (type === 'fontFamily') {
    const fontMatch = value.match(/(?:font-family|fontFamily):\s*['"]([^'"]+)['"]/);
    if (fontMatch) {
      const font = fontMatch[1].toLowerCase();
      return tokens[font] || null;
    }
  }

  if (type === 'fontSize') {
    const sizeMatch = value.match(/(?:font-size|fontSize):\s*['"]?(\d+)/);
    if (sizeMatch) {
      return tokens[sizeMatch[1]] || null;
    }
  }

  if (type === 'fontWeight') {
    const weightMatch = value.match(/(?:font-weight|fontWeight):\s*['"]?(\d+)/);
    if (weightMatch) {
      return tokens[weightMatch[1]] || null;
    }
  }

  if (type === 'lineHeight') {
    const heightMatch = value.match(/(?:line-height|lineHeight):\s*['"]?(\d+\.?\d*)/);
    if (heightMatch) {
      return tokens[heightMatch[1]] || null;
    }
  }

  return null;
}
