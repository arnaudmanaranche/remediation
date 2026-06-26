import { Rule, FileContent, Violation } from '../../../types';
import { extractStyleValues } from '../../../ast/extractor';
import { detectViaAst, detectViaRegex } from '../../../ast/ruleHelpers';

const PATTERNS = [
  { regex: /(\d+(?:\.\d+)?)px/, label: 'px' },
  { regex: /(\d+(?:\.\d+)?)rem/, label: 'rem' },
  { regex: /(\d+(?:\.\d+)?)em(?!u)/, label: 'em' }, // negative lookahead: avoid 'rem'
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

function suggestToken(value: string, unit: string): string | null {
  const px = unit === 'px' ? value : String(Math.round(parseFloat(value) * 16));
  return SPACING_TOKENS[px] ?? null;
}

export const spacingRule: Rule = {
  name: 'spacing/hardcoded',
  description: 'Detects hardcoded spacing values that should use design tokens',

  detect(file: FileContent): Violation[] {
    const ast = extractStyleValues(file.content, file.path);

    if (ast !== null) {
      return detectViaAst(file, ast, PATTERNS, 'spacing/hardcoded', 'spacing', (match, sv, label) => {
        const numericValue = match[1];
        const suggestion = suggestToken(numericValue, label);
        return {
          rule: 'spacing/hardcoded',
          file: file.path,
          line: sv.line,
          column: sv.column,
          message: `Hardcoded ${label} spacing in \`${sv.cssProperty}\`: ${sv.rawValue}`,
          severity: 'warning',
          suggestion: suggestion ? `Use ${suggestion} instead` : undefined,
        };
      });
    }

    // Fallback: regex on style lines, skip typography lines
    const TYPOGRAPHY_PROPS = ['font-size', 'fontSize', 'font-weight', 'fontWeight', 'line-height', 'lineHeight'];
    return detectViaRegex(
      file,
      PATTERNS,
      'spacing/hardcoded',
      (line) => TYPOGRAPHY_PROPS.some(p => line.includes(p)),
      (match, _line, lineIndex, label) => {
        const suggestion = suggestToken(match[1], label);
        if (!suggestion) return null;
        return {
          rule: 'spacing/hardcoded',
          file: file.path,
          line: lineIndex + 1,
          column: match.index + 1,
          message: `Hardcoded ${label} spacing: ${match[0]}`,
          severity: 'warning',
          suggestion: `Use ${suggestion} instead`,
        };
      },
    );
  },
};
