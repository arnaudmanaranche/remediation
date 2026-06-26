import { Rule, FileContent, Violation } from '../../../types';
import { extractStyleValues } from '../../../ast/extractor';
import { detectViaAst, detectViaRegex } from '../../../ast/ruleHelpers';

const PATTERNS = [
  { regex: /(\d+(?:\.\d+)?)(px|rem|em)/, label: 'radius' },
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

function suggestToken(value: string, unit: string): string | null {
  const px = unit === 'px' ? value : String(Math.round(parseFloat(value) * 16));
  return RADIUS_TOKENS[px] ?? null;
}

export const radiusRule: Rule = {
  name: 'radius/hardcoded',
  description: 'Detects hardcoded border-radius values that should use design tokens',

  detect(file: FileContent): Violation[] {
    if (!file.path.match(/\.(tsx?|jsx?|css|scss)$/)) return [];

    const ast = extractStyleValues(file.content, file.path);

    if (ast !== null) {
      return detectViaAst(file, ast, PATTERNS, 'radius/hardcoded', 'radius', (match, sv) => {
        const suggestion = suggestToken(match[1], match[2]);
        if (!suggestion) return null;
        return {
          rule: 'radius/hardcoded',
          file: file.path,
          line: sv.line,
          column: sv.column,
          message: `Hardcoded border-radius in \`${sv.cssProperty}\`: ${sv.rawValue}`,
          severity: 'warning',
          suggestion: `Use ${suggestion} instead`,
        };
      });
    }

    // Fallback: match CSS property syntax in style lines
    const CSS_PATTERNS = [
      { regex: /border-radius\s*:\s*(\d+(?:\.\d+)?)(px|rem|em)/, label: 'css' },
      { regex: /borderRadius\s*:\s*['"]?(\d+(?:\.\d+)?)(px|rem|em)['"]?/, label: 'js' },
    ];

    return detectViaRegex(
      file,
      CSS_PATTERNS,
      'radius/hardcoded',
      () => false,
      (match, _line, lineIndex) => {
        const suggestion = suggestToken(match[1], match[2]);
        if (!suggestion) return null;
        return {
          rule: 'radius/hardcoded',
          file: file.path,
          line: lineIndex + 1,
          column: match.index + 1,
          message: `Hardcoded border-radius: ${match[0]}`,
          severity: 'warning',
          suggestion: `Use ${suggestion} instead`,
        };
      },
    );
  },
};
