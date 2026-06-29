import postcss from 'postcss';
import postcssScss from 'postcss-scss';
import type { StyleValue } from './extractor';

/**
 * Parse a .css or .scss file using postcss and return all Declaration nodes
 * as StyleValue[]. Returns null on parse error so the caller can fall back
 * to regex.
 */
function kebabToCamel(prop: string): string {
  return prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

export function extractCssStyleValues(content: string, filePath: string): StyleValue[] | null {
  const isScss = /\.scss$/.test(filePath);
  const results: StyleValue[] = [];

  try {
    const root = postcss.parse(content, {
      ...(isScss ? { syntax: postcssScss } : {}),
      from: filePath,
    });

    root.walkDecls((decl) => {
      const line = decl.source?.start?.line ?? 0;
      const column = decl.source?.start?.column ?? 0;

      results.push({
        cssProperty: kebabToCamel(decl.prop),
        rawValue: decl.value,
        line,
        column,
      });
    });
  } catch {
    return null;
  }

  return results;
}
