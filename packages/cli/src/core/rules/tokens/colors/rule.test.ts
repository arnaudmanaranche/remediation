import { describe, it, expect } from 'vitest';
import { colorsRule } from './rule';

describe('colors/hardcoded', () => {
  const makeFile = (content: string) => ({ path: 'test.tsx', content });

  it('detects hex colors', () => {
    const result = colorsRule.detect(makeFile('color: "#FF0000"'));
    expect(result).toHaveLength(1);
    expect(result[0].message).toContain('#FF0000');
  });

  it('detects rgb colors', () => {
    const result = colorsRule.detect(makeFile('color: rgb(255, 0, 0)'));
    expect(result).toHaveLength(1);
    expect(result[0].message).toContain('rgb');
  });

  it('detects rgba colors', () => {
    const result = colorsRule.detect(makeFile('color: rgba(255, 0, 0, 0.5)'));
    expect(result).toHaveLength(1);
    expect(result[0].message).toContain('rgba');
  });

  it('does not flag colors in comments', () => {
    const result = colorsRule.detect(makeFile('// color: "#FF0000"'));
    expect(result).toHaveLength(0);
  });

  it('does not flag colors in import statements', () => {
    const result = colorsRule.detect(makeFile("import { colors } from './tokens' // contains #FF0000"));
    expect(result).toHaveLength(0);
  });

  it('does not flag colors inside block comments', () => {
    const input = ['/* brand color: "#FF0000" */', 'color: "#2563eb"'].join('\n');
    const result = colorsRule.detect(makeFile(input));
    expect(result).toHaveLength(1);
    expect(result[0].line).toBe(2);
  });

  it('detects colors in any file type', () => {
    const result = colorsRule.detect({ path: 'test.json', content: '"color": "#FF0000"' });
    expect(result).toHaveLength(1);
  });

  it('returns empty for files without colors', () => {
    const result = colorsRule.detect(makeFile('const x = 1;'));
    expect(result).toHaveLength(0);
  });
});
