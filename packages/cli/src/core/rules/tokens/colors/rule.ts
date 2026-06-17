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

  const normalized = hex.toLowerCase();

  const colorMap: Record<string, string> = {
    'ff0000': 'colors.danger',
    'dc2626': 'colors.danger',
    'e11d48': 'colors.danger',
    '00ff00': 'colors.success',
    '16a34a': 'colors.success',
    '22c55e': 'colors.success',
    '0000ff': 'colors.primary',
    '2563eb': 'colors.primary',
    '3b82f6': 'colors.primary',
    'ffff00': 'colors.warning',
    'f59e0b': 'colors.warning',
    'ea580c': 'colors.warning',
    '000000': 'colors.black',
    '09090b': 'colors.black',
    'ffffff': 'colors.white',
    'fafafa': 'colors.white',
    'f4f4f5': 'colors.gray.100',
    'e4e4e7': 'colors.gray.200',
    'd4d4d8': 'colors.gray.300',
    'a1a1aa': 'colors.gray.400',
    '71717a': 'colors.gray.500',
    '52525b': 'colors.gray.600',
    '3f3f46': 'colors.gray.700',
    '27272a': 'colors.gray.800',
    '18181b': 'colors.gray.900',
    '808080': 'colors.gray',
    'eff6ff': 'colors.blue.50',
    'dbeafe': 'colors.blue.100',
    'bfdbfe': 'colors.blue.200',
    '93c5fd': 'colors.blue.300',
    '60a5fa': 'colors.blue.400',
    '1d4ed8': 'colors.blue.700',
    '1e40af': 'colors.blue.800',
    '1e3a8a': 'colors.blue.900',
    'f0fdf4': 'colors.green.50',
    'dcfce7': 'colors.green.100',
    'bbf7d0': 'colors.green.200',
    '86efac': 'colors.green.300',
    '4ade80': 'colors.green.400',
    '15803d': 'colors.green.700',
    '166534': 'colors.green.800',
    '14532d': 'colors.green.900',
    'fffbeb': 'colors.amber.50',
    'fef3c7': 'colors.amber.100',
    'fde68a': 'colors.amber.200',
    'fcd34d': 'colors.amber.300',
    'fbbf24': 'colors.amber.400',
    'd97706': 'colors.amber.600',
    'b45309': 'colors.amber.700',
    '92400e': 'colors.amber.800',
    '78350f': 'colors.amber.900',
    'fff7ed': 'colors.orange.50',
    'ffedd5': 'colors.orange.100',
    'fed7aa': 'colors.orange.200',
    'fdba74': 'colors.orange.300',
    'fb923c': 'colors.orange.400',
    'f97316': 'colors.orange.500',
    'c2410c': 'colors.orange.700',
    '9a3412': 'colors.orange.800',
    '7c2d12': 'colors.orange.900',
    'fff1f2': 'colors.pink.50',
    'ffe4e6': 'colors.pink.100',
    'fecdd3': 'colors.pink.200',
    'fda4af': 'colors.pink.300',
    'fb7185': 'colors.pink.400',
    'f43f5e': 'colors.pink.500',
    'be123c': 'colors.pink.700',
    '9f1239': 'colors.pink.800',
    '881337': 'colors.pink.900',

  };

  return colorMap[normalized] || null;
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
