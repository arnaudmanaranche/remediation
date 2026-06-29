import { describe, it, expect } from 'vitest';
import { extractStyleValues } from './extractor';

const tsx = (content: string) => extractStyleValues(content, 'test.tsx')!;

describe('extractStyleValues', () => {
  it('extracts color from style prop', () => {
    const result = tsx(`const el = <div style={{ backgroundColor: '#ff0000' }} />`);
    expect(result).toHaveLength(1);
    expect(result[0].cssProperty).toBe('backgroundColor');
    expect(result[0].rawValue).toBe('#ff0000');
  });

  it('extracts spacing from style prop', () => {
    const result = tsx(`const el = <div style={{ padding: '16px' }} />`);
    expect(result).toHaveLength(1);
    expect(result[0].cssProperty).toBe('padding');
    expect(result[0].rawValue).toBe('16px');
  });

  it('extracts multiple properties', () => {
    const result = tsx(`const el = <div style={{ color: '#fff', padding: '8px', borderRadius: '4px' }} />`);
    expect(result).toHaveLength(3);
  });

  it('does NOT extract values from comments', () => {
    const result = tsx(`
      // backgroundColor: '#ff0000'
      const el = <div style={{ color: '#00ff00' }} />
    `);
    expect(result).toHaveLength(1);
    expect(result[0].rawValue).toBe('#00ff00');
  });

  it('does NOT extract values from non-CSS properties', () => {
    const result = tsx(`const x = { href: '#ff0000', src: '#abc', name: '#123456' }`);
    expect(result).toHaveLength(0);
  });

  it('does NOT extract values from import paths', () => {
    const result = tsx(`import colors from '#design-system'`);
    expect(result).toHaveLength(0);
  });

  it('extracts from const styles object', () => {
    const result = tsx(`const styles = { color: '#27272a', fontSize: '14px' };`);
    expect(result).toHaveLength(2);
  });

  it('extracts from nested style objects', () => {
    const result = tsx(`
      const styles = {
        container: { backgroundColor: '#ffffff', padding: '24px' },
        text: { color: '#000000' },
      };
    `);
    expect(result).toHaveLength(3);
  });

  it('extracts numeric font size', () => {
    const result = tsx(`const el = <div style={{ fontSize: 14 }} />`);
    expect(result).toHaveLength(1);
    expect(result[0].rawValue).toBe('14');
  });

  it('reports correct line numbers', () => {
    const result = tsx(`
const el = (
  <div
    style={{
      backgroundColor: '#2563eb',
    }}
  />
);`);
    expect(result[0].line).toBe(5);
  });

  it('parses CSS files via postcss (returns StyleValue[], not null)', () => {
    const result = extractStyleValues('color: red;', 'style.css');
    expect(result).not.toBeNull();
    expect(result![0].cssProperty).toBe('color');
    expect(result![0].rawValue).toBe('red');
  });

  it('returns empty array for files with no style values', () => {
    const result = tsx(`const x = { foo: 'bar', count: 42 };`);
    expect(result).toHaveLength(0);
  });

  it('handles syntax errors gracefully (returns null)', () => {
    const result = extractStyleValues('const { = broken', 'test.tsx');
    expect(result).toBeNull();
  });

  it('extracts from CSS-in-JS tagged template literals', () => {
    const result = tsx(`
      const Button = styled.button\`
        background-color: #2563eb;
        padding: 8px;
      \`;
    `);
    expect(result.some(v => v.rawValue === '#2563eb')).toBe(true);
    expect(result.some(v => v.rawValue === '8px')).toBe(true);
  });
});
