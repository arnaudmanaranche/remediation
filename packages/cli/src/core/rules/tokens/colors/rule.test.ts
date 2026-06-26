import { describe, it, expect } from 'vitest';
import { colorsRule } from './rule';

describe('colors/hardcoded', () => {
  const tsx = (content: string) => ({ path: 'test.tsx', content });
  const css = (content: string) => ({ path: 'test.css', content });

  it('detects hex color in style object', () => {
    const result = colorsRule.detect(tsx('const s = { color: "#FF0000" }'));
    expect(result).toHaveLength(1);
    expect(result[0].message).toContain('#FF0000');
  });

  it('detects rgb color in style prop', () => {
    const result = colorsRule.detect(tsx('const el = <div style={{ color: "rgb(255, 0, 0)" }} />'));
    expect(result).toHaveLength(1);
    expect(result[0].message).toContain('rgb');
  });

  it('detects rgba color in style prop', () => {
    const result = colorsRule.detect(tsx('const s = { backgroundColor: "rgba(255, 0, 0, 0.5)" }'));
    expect(result).toHaveLength(1);
    expect(result[0].message).toContain('rgba');
  });

  it('does NOT flag colors in comments', () => {
    const result = colorsRule.detect(tsx('// color: "#FF0000"'));
    expect(result).toHaveLength(0);
  });

  it('does NOT flag colors in import statements', () => {
    const result = colorsRule.detect(tsx("import colors from './tokens' // #FF0000"));
    expect(result).toHaveLength(0);
  });

  it('does NOT flag colors in non-CSS object keys', () => {
    // 'href' and 'src' are not CSS properties
    const result = colorsRule.detect(tsx("const x = { href: '#ff0000', src: '#abc123' }"));
    expect(result).toHaveLength(0);
  });

  it('detects colors in CSS file via regex fallback', () => {
    const result = colorsRule.detect(css('color: #FF0000;'));
    expect(result).toHaveLength(1);
  });

  it('returns empty for files without colors', () => {
    const result = colorsRule.detect(tsx('const x = 1;'));
    expect(result).toHaveLength(0);
  });
});
