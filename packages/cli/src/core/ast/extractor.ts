import * as parser from '@babel/parser';
import { ALL_STYLE_PROPS } from './cssProperties';
import { extractCssStyleValues } from './cssExtractor';

export interface StyleValue {
  cssProperty: string;
  rawValue: string;
  line: number;
  column: number;
}

type AstNode = {
  type: string;
  loc?: { start: { line: number; column: number } };
  [key: string]: unknown;
};

/**
 * Recursively walks a Babel AST node, calling visit() on every node.
 * We avoid @babel/traverse to sidestep CJS/ESM interop issues.
 */
function walk(node: AstNode | null | undefined, visit: (n: AstNode) => void): void {
  if (!node || typeof node !== 'object') return;
  visit(node);
  for (const val of Object.values(node)) {
    if (Array.isArray(val)) {
      for (const child of val) {
        if (child && typeof child === 'object' && 'type' in child) {
          walk(child as AstNode, visit);
        }
      }
    } else if (val && typeof val === 'object' && 'type' in val) {
      walk(val as AstNode, visit);
    }
  }
}

function getPropertyName(key: AstNode): string | null {
  if (key.type === 'Identifier') return key.name as string;
  if (key.type === 'StringLiteral') return key.value as string;
  return null;
}

function getStringValue(value: AstNode): string | null {
  if (value.type === 'StringLiteral') return value.value as string;
  // Template literal with no expressions: `#ff0000`
  if (value.type === 'TemplateLiteral') {
    const quasis = value.quasis as AstNode[];
    if (quasis.length === 1) {
      const cooked = (quasis[0].value as { cooked?: string }).cooked;
      return cooked ?? null;
    }
  }
  return null;
}

function getNumericValue(value: AstNode): string | null {
  if (value.type === 'NumericLiteral') {
    // e.g. fontSize: 14 — emit as "14" so rules can decide
    return String(value.value as number);
  }
  return null;
}

/**
 * Returns style values found inside CSS-in-JS template literals:
 *   styled.div`color: #ff0000; padding: 8px;`
 *   css`background: rgba(0,0,0,0.5);`
 */
function extractFromTemplateLiteral(node: AstNode): StyleValue[] {
  const results: StyleValue[] = [];
  const quasis = node.quasis as AstNode[] | undefined;
  if (!quasis) return results;

  for (const quasi of quasis) {
    const cooked = (quasi.value as { cooked?: string }).cooked;
    if (!cooked) continue;

    const loc = quasi.loc;
    const baseLine = loc?.start.line ?? 1;
    const lines = cooked.split('\n');

    lines.forEach((line, i) => {
      const cssMatch = line.match(/^[\s]*([\w-]+)\s*:\s*(.+?)\s*;?\s*$/);
      if (!cssMatch) return;

      const rawProp = cssMatch[1];
      // Convert kebab-case to camelCase for lookup
      const camelProp = rawProp.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
      const rawValue = cssMatch[2].trim();

      if (ALL_STYLE_PROPS.has(camelProp) || ALL_STYLE_PROPS.has(rawProp)) {
        results.push({
          cssProperty: camelProp,
          rawValue,
          line: baseLine + i,
          column: (loc?.start.column ?? 0) + cssMatch[0].indexOf(rawValue) + 1,
        });
      }
    });
  }

  return results;
}

/**
 * Parse a JS/TS/JSX/TSX file and return all style property values
 * that appear inside CSS property–keyed object properties.
 *
 * Falls back to an empty array on parse error (caller can then use regex).
 */
export function extractStyleValues(content: string, filePath: string): StyleValue[] | null {
  if (/\.(css|scss)$/.test(filePath)) {
    return extractCssStyleValues(content, filePath);
  }
  if (!/\.(tsx?|jsx?)$/.test(filePath)) return null;

  let ast: AstNode;
  try {
    ast = parser.parse(content, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript', 'decorators-legacy'],
      errorRecovery: true,
      strictMode: false,
    }) as unknown as AstNode;
  } catch {
    return null;
  }

  const results: StyleValue[] = [];

  walk(ast, (node) => {
    // --- ObjectProperty: { backgroundColor: '#ff0000' } ---
    if (node.type === 'ObjectProperty') {
      const key = node.key as AstNode;
      const value = node.value as AstNode;
      const propName = getPropertyName(key);
      if (!propName || !ALL_STYLE_PROPS.has(propName)) return;

      const loc = value.loc;

      const strVal = getStringValue(value);
      if (strVal !== null) {
        results.push({
          cssProperty: propName,
          rawValue: strVal,
          line: loc?.start.line ?? 0,
          column: (loc?.start.column ?? 0) + 1,
        });
        return;
      }

      const numVal = getNumericValue(value);
      if (numVal !== null) {
        results.push({
          cssProperty: propName,
          rawValue: numVal,
          line: loc?.start.line ?? 0,
          column: (loc?.start.column ?? 0) + 1,
        });
      }
    }

    // --- Tagged template literals: styled.div`...` or css`...` ---
    if (node.type === 'TaggedTemplateExpression') {
      const tag = node.tag as AstNode;
      const isStyled =
        tag.type === 'MemberExpression' ||
        (tag.type === 'Identifier' && ['css', 'injectGlobal', 'createGlobalStyle'].includes(tag.name as string)) ||
        (tag.type === 'CallExpression');

      if (isStyled) {
        const quasi = node.quasi as AstNode;
        results.push(...extractFromTemplateLiteral(quasi));
      }
    }
  });

  return results;
}
