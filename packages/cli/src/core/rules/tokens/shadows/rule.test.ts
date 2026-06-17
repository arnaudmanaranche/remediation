import { describe, it, expect } from 'vitest';
import { shadowsRule } from './rule';

describe('shadows/hardcoded', () => {
  const makeFile = (content: string) => ({ path: 'test.tsx', content });

  it('detects box-shadow in CSS', () => {
    const result = shadowsRule.detect(makeFile('box-shadow: 0 2px 4px rgba(0,0,0,0.1)'));
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].message).toContain('box-shadow');
  });

  it('detects boxShadow in JS', () => {
    const result = shadowsRule.detect(makeFile("boxShadow: '0 2px 4px rgba(0,0,0,0.1)'"));
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].message).toContain('box-shadow');
  });

  it('has suggestion for shadows', () => {
    const result = shadowsRule.detect(makeFile('box-shadow: 0 2px 4px rgba(0,0,0,0.1)'));
    expect(result[0].suggestion).toBeDefined();
    expect(result[0].suggestion).toContain('shadows');
  });

  it('detects shadows in any file type', () => {
    const result = shadowsRule.detect({ path: 'test.css', content: 'box-shadow: 0 2px 4px' });
    expect(result.length).toBeGreaterThan(0);
  });
});
