import * as fs from 'fs';
import * as path from 'path';
import { extractStyleValues } from '../ast/extractor';
import { ALL_STYLE_PROPS, TYPOGRAPHY_PROPS } from '../ast/cssProperties';
import { splitValueTokens } from './valueTokenizer';

export interface ExtractedValue {
  type: 'color' | 'spacing' | 'typography';
  value: string;
  raw: string;
  file: string;
  line: number;
  column: number;
}

// Typography whole-values worth proposing: font sizes ('14px', '0.875rem',
// bare '14') and weights ('600', 'bold', 'normal'). Everything else
// (fontFamily lists, unitless lineHeight, keyword sizes) is skipped.
const TYPO_VALUE_REGEX = /^(?:\d+(?:\.\d+)?(?:px|rem|em)?|bold|normal)$/i;

function isColorToken(token: string): boolean {
  return /^#|^(?:rgba?)\(|^(?:hsla?)\(/.test(token);
}

// Map AST-extracted StyleValues onto pipeline ExtractedValues.
//
// Compound rawValues (e.g. border: '1px solid #e4e4e7') are split into their
// sub-values via the shared tokenizer and classified per sub-token, so one
// declaration can yield both a spacing and a color value. This is the same
// tokenization the codemod uses to rewrite sub-values, keeping extraction and
// rewriting in lockstep.
function extractFromStyleValues(styleValues: NonNullable<ReturnType<typeof extractStyleValues>>, filePath: string): ExtractedValue[] {
  const values: ExtractedValue[] = [];

  for (const sv of styleValues) {
    if (!ALL_STYLE_PROPS.has(sv.cssProperty)) continue;

    if (TYPOGRAPHY_PROPS.has(sv.cssProperty)) {
      const v = sv.rawValue.trim();
      if (TYPO_VALUE_REGEX.test(v)) {
        values.push({ type: 'typography', value: v, raw: v, file: filePath, line: sv.line, column: sv.column });
      }
      continue;
    }

    for (const tok of splitValueTokens(sv.rawValue)) {
      values.push({
        type: isColorToken(tok.text) ? 'color' : 'spacing',
        value: tok.text,
        raw: tok.text,
        file: filePath,
        line: sv.line,
        column: sv.column + tok.start,
      });
    }
  }

  return values;
}

// Fallback for files Babel/postcss cannot parse: the legacy line-based scan.
const COLOR_PATTERNS = [
  { regex: /['"]?(#[0-9a-fA-F]{3,8})['"]?/g, type: 'hex' as const },
  { regex: /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g, type: 'rgb' as const },
  { regex: /hsla?\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%/g, type: 'hsl' as const },
];

const SPACING_PATTERNS = [
  { regex: /(\d+(?:\.\d+)?)px/g, type: 'px' as const },
  { regex: /(\d+(?:\.\d+)?)rem/g, type: 'rem' as const },
  { regex: /(\d+(?:\.\d+)?)em/g, type: 'em' as const },
];

function extractFromFileRegex(filePath: string): ExtractedValue[] {
  const values: ExtractedValue[] = [];

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, lineIndex) => {
      for (const { regex, type } of COLOR_PATTERNS) {
        const r = new RegExp(regex.source, regex.flags);
        let match;
        while ((match = r.exec(line)) !== null) {
          let value = match[0];
          if (type === 'hex') value = match[1];
          if (type === 'rgb') value = `rgb(${match[1]}, ${match[2]}, ${match[3]})`;
          if (type === 'hsl') value = `hsl(${match[1]}, ${match[2]}%, ${match[3]}%)`;
          values.push({ type: 'color', value, raw: match[0], file: filePath, line: lineIndex + 1, column: match.index + 1 });
        }
      }

      for (const { regex } of SPACING_PATTERNS) {
        const r = new RegExp(regex.source, regex.flags);
        let match;
        while ((match = r.exec(line)) !== null) {
          values.push({ type: 'spacing', value: match[0], raw: match[0], file: filePath, line: lineIndex + 1, column: match.index + 1 });
        }
      }
    });
  } catch {
    // skip unreadable files
  }

  return values;
}

function extractFromFile(filePath: string): ExtractedValue[] {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const styleValues = extractStyleValues(content, filePath);
    if (styleValues !== null) {
      return extractFromStyleValues(styleValues, filePath);
    }
  } catch {
    // fall through to the regex fallback
  }
  return extractFromFileRegex(filePath);
}

export function extractFromProject(projectPath: string): ExtractedValue[] {
  const values: ExtractedValue[] = [];

  function traverse(dir: string) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (!entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== 'build') {
            traverse(fullPath);
          }
        } else if (entry.name === 'remediation.config.js') {
          // Never scan (and therefore never codemod) the tool's own config.
          continue;
        } else if (/\.(tsx?|jsx?|css|scss)$/.test(entry.name)) {
          values.push(...extractFromFile(fullPath));
        }
      }
    } catch {
      // skip unreadable dirs
    }
  }

  traverse(projectPath);
  return values;
}
