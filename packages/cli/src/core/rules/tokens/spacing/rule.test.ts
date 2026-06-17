import { describe, it, expect } from 'vitest';
import { spacingRule } from './rule';

describe('spacing/hardcoded', () => {
  const makeFile = (content: string) => ({ path: 'test.tsx', content });

  it('detects px spacing', () => {
    const result = spacingRule.detect(makeFile('padding: 16px'));
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].message).toContain('px');
  });

  it('detects rem spacing', () => {
    const result = spacingRule.detect(makeFile('margin: 2rem'));
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].message).toContain('rem');
  });

  it('suggests token for known spacing', () => {
    const result = spacingRule.detect(makeFile('padding: 16px'));
    expect(result[0].suggestion).toContain('spacing');
  });

  it('ignores typography properties', () => {
    const result = spacingRule.detect(makeFile('fontSize: 16px'));
    expect(result).toHaveLength(0);
  });

  it('returns empty for files without spacing', () => {
    const result = spacingRule.detect(makeFile('const x = 1;'));
    expect(result).toHaveLength(0);
  });
});
