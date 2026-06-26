import { describe, it, expect } from 'vitest';
import { getStyleLines } from './lineFilter';

describe('getStyleLines', () => {
  it('keeps normal style lines', () => {
    const result = getStyleLines('color: "#ff0000"\npadding: 8px');
    expect(result).toHaveLength(2);
    expect(result[0].index).toBe(0);
    expect(result[1].index).toBe(1);
  });

  it('filters single-line comments', () => {
    const result = getStyleLines('// color: "#ff0000"');
    expect(result).toHaveLength(0);
  });

  it('filters block comment lines', () => {
    const input = '/* color: "#ff0000" */\npadding: 8px';
    const result = getStyleLines(input);
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe('padding: 8px');
  });

  it('filters multi-line block comments', () => {
    const input = ['/*', 'color: "#ff0000"', '*/', 'padding: 8px'].join('\n');
    const result = getStyleLines(input);
    expect(result).toHaveLength(1);
    expect(result[0].index).toBe(3);
  });

  it('filters import statements', () => {
    const result = getStyleLines("import colors from './tokens'");
    expect(result).toHaveLength(0);
  });

  it('preserves original line indices', () => {
    const input = '// skip\nconst x = 1;\n// skip\npadding: 8px';
    const result = getStyleLines(input);
    expect(result).toHaveLength(2);
    expect(result[0].index).toBe(1);
    expect(result[1].index).toBe(3);
  });
});
