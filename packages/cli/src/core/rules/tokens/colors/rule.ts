import { Rule, FileContent, Violation } from '../../../types';
import { extractStyleValues } from '../../../ast/extractor';
import { detectViaAst, detectViaRegex } from '../../../ast/ruleHelpers';
import { getStyleLines } from '../../lineFilter';

const PATTERNS = [
  { regex: /['"]?(#[0-9a-fA-F]{3,8})['"]?/, label: 'hex' },
  { regex: /rgb\(/, label: 'rgb' },
  { regex: /rgba\(/, label: 'rgba' },
  { regex: /hsl\(/, label: 'hsl' },
  { regex: /hsla\(/, label: 'hsla' },
];

export const colorsRule: Rule = {
  name: 'colors/hardcoded',
  description: 'Detects hardcoded color values that should use design tokens',

  detect(file: FileContent): Violation[] {
    const ast = extractStyleValues(file.content, file.path);

    if (ast !== null) {
      return detectViaAst(file, ast, PATTERNS, 'colors/hardcoded', 'color', (match, sv, label) => ({
        rule: 'colors/hardcoded',
        file: file.path,
        line: sv.line,
        column: sv.column,
        message: `Hardcoded ${label} color in \`${sv.cssProperty}\`: ${sv.rawValue}`,
        severity: 'warning',
      }));
    }

    // Fallback for CSS/SCSS or unparseable files
    return detectViaRegex(
      file,
      PATTERNS,
      'colors/hardcoded',
      () => false,
      (match, _line, lineIndex, label) => ({
        rule: 'colors/hardcoded',
        file: file.path,
        line: lineIndex + 1,
        column: match.index + 1,
        message: `Hardcoded ${label} color: ${match[0]}`,
        severity: 'warning',
      }),
    );
  },
};
