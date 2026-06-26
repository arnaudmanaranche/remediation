import { describe, it, expect } from 'vitest';
import { shadowsRule } from './rule';

describe('shadows/hardcoded', () => {
  const tsx = (content: string) => ({ path: 'test.tsx', content });
  const css = (content: string) => ({ path: 'test.css', content });

  it('detects boxShadow in a JS style object', () => {
    const result = shadowsRule.detect(tsx("const s = { boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }"));
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].message).toContain('boxShadow');
  });

  it('detects box-shadow in a CSS file', () => {
    const result = shadowsRule.detect(css('box-shadow: 0 2px 4px rgba(0,0,0,0.1)'));
    expect(result.length).toBeGreaterThan(0);
  });

  it('has suggestion for shadows', () => {
    const result = shadowsRule.detect(tsx("const s = { boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }"));
    expect(result[0].suggestion).toBeDefined();
    expect(result[0].suggestion).toContain('shadows');
  });

  it('does not flag a shadow without px values', () => {
    const result = shadowsRule.detect(css('box-shadow: none'));
    expect(result).toHaveLength(0);
  });
});
