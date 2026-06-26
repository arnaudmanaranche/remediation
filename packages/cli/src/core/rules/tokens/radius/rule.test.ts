import { describe, it, expect } from 'vitest';
import { radiusRule } from './rule';

describe('radius/hardcoded', () => {
  const tsx = (content: string) => ({ path: 'test.tsx', content });
  const css = (content: string) => ({ path: 'test.css', content });

  it('detects borderRadius in a JS style object', () => {
    const result = radiusRule.detect(tsx("const s = { borderRadius: '8px' }"));
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].message).toContain('borderRadius');
  });

  it('detects border-radius in a CSS file', () => {
    const result = radiusRule.detect(css('border-radius: 8px'));
    expect(result.length).toBeGreaterThan(0);
  });

  it('suggests token for known radius', () => {
    const result = radiusRule.detect(tsx("const s = { borderRadius: '8px' }"));
    expect(result[0].suggestion).toContain('radius');
  });

  it('detects radius in JSX style prop', () => {
    const result = radiusRule.detect(tsx("<div style={{ borderRadius: '4px' }} />"));
    expect(result.length).toBeGreaterThan(0);
  });
});
