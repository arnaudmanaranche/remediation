import { Rule, FileContent, Violation } from '../../../types';

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
    const lines = file.content.split('\n');

    lines.forEach((line, index) => {
      COLOR_PATTERNS.forEach(({ pattern, type }) => {
        const regex = new RegExp(pattern.source, pattern.flags);
        let match;

        while ((match = regex.exec(line)) !== null) {
          const value = match[0];
          const tokenSuggestion = suggestToken(value, type);

          violations.push({
            rule: 'colors/hardcoded',
            file: file.path,
            line: index + 1,
            column: match.index + 1,
            message: `Hardcoded ${type} color: ${value}`,
            severity: 'warning',
            suggestion: tokenSuggestion ? `Use ${tokenSuggestion} instead` : undefined,
          });
        }
      });
    });

    return violations;
  },
};

function suggestToken(value: string, type: string): string | null {
  const hex = extractHex(value, type);
  if (!hex) return null;

  const colorMap: Record<string, string> = {
    'ff0000': 'colors.danger',
    'ff000000': 'colors.danger',
    'ff000080': 'colors.danger',
    '00ff00': 'colors.success',
    '00ff0000': 'colors.success',
    '00ff0080': 'colors.success',
    '0000ff': 'colors.primary',
    '0000ff00': 'colors.primary',
    '0000ff80': 'colors.primary',
    'ffff00': 'colors.warning',
    'ffff0000': 'colors.warning',
    'ffff0080': 'colors.warning',
    '000000': 'colors.black',
    '00000000': 'colors.black',
    '00000080': 'colors.black',
    'ffffff': 'colors.white',
    'ffffff00': 'colors.white',
    'ffffff80': 'colors.white',
    '808080': 'colors.gray',
    '80808000': 'colors.gray',
    '80808080': 'colors.gray',
  };

  return colorMap[hex.toLowerCase()] || null;
}

function extractHex(value: string, type: string): string | null {
  if (type === 'hex') {
    const match = value.match(/#([0-9a-fA-F]{3,8})/);
    return match ? match[1] : null;
  }

  const rgbMatch = value.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]).toString(16).padStart(2, '0');
    const g = parseInt(rgbMatch[2]).toString(16).padStart(2, '0');
    const b = parseInt(rgbMatch[3]).toString(16).padStart(2, '0');
    return `${r}${g}${b}`;
  }

  return null;
}
