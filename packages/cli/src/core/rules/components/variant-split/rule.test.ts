import { describe, it, expect } from 'vitest';
import { variantSplitRule } from './rule';

describe('components/variant-split', () => {
  const makeFile = (content: string, path = 'test.tsx') => ({ path, content });

  it('detects ternary on variant prop', () => {
    const content = `
      function Button({ variant }) {
        return variant === 'primary' ? <div /> : <span />;
      }
    `;
    const result = variantSplitRule.detect(makeFile(content));
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].message).toContain('variant');
  });

  it('detects ternary on size prop', () => {
    const content = `
      const Card = ({ size }) => {
        return size === 'large' ? <div /> : <span />;
      };
    `;
    const result = variantSplitRule.detect(makeFile(content));
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].message).toContain('size');
  });

  it('detects switch statement', () => {
    const content = `
      function Badge({ type }) {
        switch (type) {
          case 'success': return <span />;
          default: return <div />;
        }
      }
    `;
    const result = variantSplitRule.detect(makeFile(content));
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].message).toContain('Switch');
  });

  it('detects ternary in .ts files too', () => {
    const content = `
      function Button({ variant }) {
        return variant === 'primary' ? 'primary' : 'secondary';
      }
    `;
    const result = variantSplitRule.detect(makeFile(content, 'test.ts'));
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns empty for files without variant props', () => {
    const content = `
      function Button({ children }) {
        return <button>{children}</button>;
      }
    `;
    const result = variantSplitRule.detect(makeFile(content));
    expect(result).toHaveLength(0);
  });
});
