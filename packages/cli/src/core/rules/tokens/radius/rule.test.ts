import { describe, it, expect } from 'vitest';
import { radiusRule } from './rule';

describe('radius/hardcoded', () => {
  const makeFile = (content: string) => ({ path: 'test.tsx', content });

  it('detects border-radius in CSS', () => {
    const result = radiusRule.detect(makeFile('border-radius: 8px'));
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].message).toContain('border-radius');
  });

  it('detects borderRadius in JS', () => {
    const result = radiusRule.detect(makeFile("borderRadius: '8px'"));
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].message).toContain('border-radius');
  });

  it('suggests token for known radius', () => {
    const result = radiusRule.detect(makeFile('border-radius: 8px'));
    expect(result[0].suggestion).toContain('radius');
  });

  it('detects radius in any file type', () => {
    const result = radiusRule.detect({ path: 'test.css', content: 'border-radius: 8px' });
    expect(result.length).toBeGreaterThan(0);
  });
});
