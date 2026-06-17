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

  it('suggests token for known colors', () => {
    const result = colorsRule.detect(makeFile('color: "#2563EB"'));
    expect(result[0].suggestion).toContain('colors');
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
