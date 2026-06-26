import { Rule, FileContent, Violation } from '../../../types';
import { extractStyleValues } from '../../../ast/extractor';
import { detectViaAst, detectViaRegex } from '../../../ast/ruleHelpers';

const PATTERNS = [
  { regex: /(\d+(?:\.\d+)?)(px|rem|em)/, label: 'size' },
  { regex: /^(\d+)$/, label: 'weight' },
  { regex: /^(\d+(?:\.\d+)?)$/, label: 'lineHeight' },
];

const FONT_SIZE_TOKENS: Record<string, string> = {
  '12': 'typography.fontSize.sm',
  '14': 'typography.fontSize.md',
  '16': 'typography.fontSize.base',
  '18': 'typography.fontSize.lg',
  '20': 'typography.fontSize.xl',
  '24': 'typography.fontSize.xxl',
};

const FONT_WEIGHT_TOKENS: Record<string, string> = {
  '400': 'typography.fontWeight.normal',
  '500': 'typography.fontWeight.medium',
  '600': 'typography.fontWeight.semibold',
  '700': 'typography.fontWeight.bold',
};

function suggestToken(cssProperty: string, value: string): string | null {
  if (cssProperty === 'fontSize') {
    const pxMatch = value.match(/^(\d+)(px|rem|em)?$/);
    if (!pxMatch) return null;
    const px = pxMatch[2] && pxMatch[2] !== 'px'
      ? String(Math.round(parseFloat(pxMatch[1]) * 16))
      : pxMatch[1];
    return FONT_SIZE_TOKENS[px] ?? null;
  }
  if (cssProperty === 'fontWeight') {
    return FONT_WEIGHT_TOKENS[value.trim()] ?? null;
  }
  return null;
}

export const typographyRule: Rule = {
  name: 'typography/hardcoded',
  description: 'Detects hardcoded typography values that should use design tokens',

  detect(file: FileContent): Violation[] {
    const ast = extractStyleValues(file.content, file.path);

    if (ast !== null) {
      const violations: Violation[] = [];
      for (const sv of ast) {
        if (!['fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'fontFamily'].includes(sv.cssProperty)) continue;
        const suggestion = suggestToken(sv.cssProperty, sv.rawValue);
        violations.push({
          rule: 'typography/hardcoded',
          file: file.path,
          line: sv.line,
          column: sv.column,
          message: `Hardcoded ${sv.cssProperty}: ${sv.rawValue}`,
          severity: 'warning',
          suggestion: suggestion ? `Use ${suggestion} instead` : undefined,
        });
      }
      return violations;
    }

    // Fallback: CSS property syntax
    const CSS_PATTERNS = [
      { regex: /(?:font-size|fontSize)\s*:\s*['"]?(\d+(?:\.\d+)?)(px|rem|em)['"]?/, label: 'fontSize' },
      { regex: /(?:font-weight|fontWeight)\s*:\s*['"]?(\d+)['"]?/, label: 'fontWeight' },
    ];

    return detectViaRegex(
      file,
      CSS_PATTERNS,
      'typography/hardcoded',
      () => false,
      (match, _line, lineIndex, label) => {
        const suggestion = suggestToken(label, match[1]);
        if (!suggestion) return null;
        return {
          rule: 'typography/hardcoded',
          file: file.path,
          line: lineIndex + 1,
          column: match.index + 1,
          message: `Hardcoded ${label}: ${match[0]}`,
          severity: 'warning',
          suggestion: `Use ${suggestion} instead`,
        };
      },
    );
  },
};
