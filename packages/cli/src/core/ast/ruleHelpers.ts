import { FileContent, Violation } from '../types';
import { extractStyleValues, StyleValue } from './extractor';
import { getStyleLines } from '../rules/lineFilter';
import { COLOR_PROPS, SPACING_PROPS, TYPOGRAPHY_PROPS, RADIUS_PROPS, SHADOW_PROPS } from './cssProperties';

export type PropCategory = 'color' | 'spacing' | 'typography' | 'radius' | 'shadow';

const PROP_CATEGORY_MAP: Map<string, PropCategory> = new Map([
  ...Array.from(COLOR_PROPS).map((p): [string, PropCategory] => [p, 'color']),
  ...Array.from(SPACING_PROPS).map((p): [string, PropCategory] => [p, 'spacing']),
  ...Array.from(TYPOGRAPHY_PROPS).map((p): [string, PropCategory] => [p, 'typography']),
  ...Array.from(RADIUS_PROPS).map((p): [string, PropCategory] => [p, 'radius']),
  ...Array.from(SHADOW_PROPS).map((p): [string, PropCategory] => [p, 'shadow']),
]);

function categoryOf(cssProperty: string): PropCategory | null {
  return PROP_CATEGORY_MAP.get(cssProperty) ?? null;
}

export interface RulePattern {
  regex: RegExp;
  label: string;
}

/**
 * Run patterns against AST-extracted style values (JS/TS files).
 * Each match is guaranteed to be inside a real CSS property value.
 */
export function detectViaAst(
  file: FileContent,
  astValues: StyleValue[],
  patterns: RulePattern[],
  ruleName: string,
  categoryFilter: PropCategory,
  buildViolation: (match: RegExpExecArray, value: StyleValue, label: string) => Violation | null,
): Violation[] {
  const violations: Violation[] = [];

  for (const sv of astValues) {
    if (categoryOf(sv.cssProperty) !== categoryFilter) continue;

    for (const { regex, label } of patterns) {
      const r = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g');
      let match: RegExpExecArray | null;
      while ((match = r.exec(sv.rawValue)) !== null) {
        const v = buildViolation(match, sv, label);
        if (v) violations.push(v);
      }
    }
  }

  return violations;
}

/**
 * Run patterns against getStyleLines() output (CSS/SCSS files, or AST fallback).
 */
export function detectViaRegex(
  file: FileContent,
  patterns: RulePattern[],
  ruleName: string,
  skipLine: (line: string) => boolean,
  buildViolation: (match: RegExpExecArray, line: string, lineIndex: number, label: string) => Violation | null,
): Violation[] {
  const violations: Violation[] = [];
  const lines = getStyleLines(file.content);

  for (const { content: line, index } of lines) {
    if (skipLine(line)) continue;

    for (const { regex, label } of patterns) {
      const r = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g');
      let match: RegExpExecArray | null;
      while ((match = r.exec(line)) !== null) {
        const v = buildViolation(match, line, index, label);
        if (v) violations.push(v);
      }
    }
  }

  return violations;
}
