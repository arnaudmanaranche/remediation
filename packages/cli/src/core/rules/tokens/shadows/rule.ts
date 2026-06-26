import { Rule, FileContent, Violation } from '../../../types';
import { extractStyleValues } from '../../../ast/extractor';
import { detectViaAst, detectViaRegex } from '../../../ast/ruleHelpers';

const PATTERNS = [
  { regex: /\d+px/, label: 'shadow' },
];

export const shadowsRule: Rule = {
  name: 'shadows/hardcoded',
  description: 'Detects hardcoded box-shadow values that should use design tokens',

  detect(file: FileContent): Violation[] {
    if (!file.path.match(/\.(tsx?|jsx?|css|scss)$/)) return [];

    const ast = extractStyleValues(file.content, file.path);

    if (ast !== null) {
      return detectViaAst(file, ast, PATTERNS, 'shadows/hardcoded', 'shadow', (match, sv) => ({
        rule: 'shadows/hardcoded',
        file: file.path,
        line: sv.line,
        column: sv.column,
        message: `Hardcoded shadow in \`${sv.cssProperty}\`: ${sv.rawValue}`,
        severity: 'warning',
        suggestion: 'Use a design token (e.g., shadows.sm, shadows.md, shadows.lg)',
      }));
    }

    // Fallback: CSS property syntax
    const CSS_PATTERNS = [
      { regex: /box-shadow\s*:\s*([^;]+)/, label: 'css' },
      { regex: /boxShadow\s*:\s*['"]([^'"]+)['"]/, label: 'js' },
    ];

    return detectViaRegex(
      file,
      CSS_PATTERNS,
      'shadows/hardcoded',
      () => false,
      (match, _line, lineIndex) => {
        if (!/\d+px/.test(match[1])) return null;
        return {
          rule: 'shadows/hardcoded',
          file: file.path,
          line: lineIndex + 1,
          column: match.index + 1,
          message: `Hardcoded box-shadow: ${match[1].trim()}`,
          severity: 'warning',
          suggestion: 'Use a design token (e.g., shadows.sm, shadows.md, shadows.lg)',
        };
      },
    );
  },
};
