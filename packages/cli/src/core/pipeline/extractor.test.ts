import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { extractFromProject } from './extractor';

let tmpDir: string;

beforeEach(() => {
  tmpDir = path.join(__dirname, '__test_extract__');
  fs.mkdirSync(tmpDir, { recursive: true });
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function writeFile(name: string, content: string): string {
  const p = path.join(tmpDir, name);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
  return p;
}

describe('extractFromProject (AST-backed)', () => {
  it('extracts every value on a mixed-prop line (no more silent drops)', () => {
    writeFile(
      'Card.tsx',
      `<h2 style={{ color: '#27272a', fontSize: '18px', marginBottom: '12px' }}>x</h2>`
    );

    const values = extractFromProject(tmpDir);
    const found = (type: string, value: string) =>
      values.some((v) => v.type === type && v.value === value);

    expect(found('color', '#27272a')).toBe(true);
    expect(found('typography', '18px')).toBe(true);
    expect(found('spacing', '12px')).toBe(true);
  });

  it('splits a shorthand border into a spacing and a color value', () => {
    writeFile('B.tsx', `const s = { border: '1px solid #e4e4e7' };`);

    const values = extractFromProject(tmpDir);
    expect(values.some(v => v.type === 'spacing' && v.value === '1px')).toBe(true);
    expect(values.some(v => v.type === 'color' && v.value === '#e4e4e7')).toBe(true);
  });

  it('extracts each length of a multi-value spacing prop', () => {
    writeFile('P.tsx', `const s = { padding: '8px 16px' };`);
    const values = extractFromProject(tmpDir);
    expect(values.filter(v => v.type === 'spacing').map(v => v.value).sort()).toEqual(['16px', '8px']);
  });

  it('emits numeric fontWeight as a typography value', () => {
    writeFile('W.tsx', `const s = { fontWeight: 600 };`);
    const values = extractFromProject(tmpDir);
    expect(values.some(v => v.type === 'typography' && v.value === '600')).toBe(true);
  });

  it('skips non-tokenizable typography values like fontFamily', () => {
    writeFile('F.tsx', `const s = { fontFamily: 'Inter, sans-serif' };`);
    expect(extractFromProject(tmpDir)).toHaveLength(0);
  });

  it('ignores non-style properties and comments', () => {
    writeFile('N.tsx', `// color: '#ff0000'\nconst x = { href: '#123456' };`);
    expect(extractFromProject(tmpDir)).toHaveLength(0);
  });

  it('never extracts from remediation.config.js', () => {
    writeFile('remediation.config.js', `module.exports = { tokensImport: 'x' };`);
    writeFile('C.tsx', `const s = { backgroundColor: '#2563eb' };`);
    const values = extractFromProject(tmpDir);
    expect(values).toHaveLength(1);
    expect(values[0].value).toBe('#2563eb');
  });

  it('falls back to the regex scan when parsing fails', () => {
    writeFile('broken.tsx', `const { = broken #ff0000 8px`);
    const values = extractFromProject(tmpDir);
    expect(values.some(v => v.value === '#ff0000')).toBe(true);
    expect(values.some(v => v.value === '8px')).toBe(true);
  });
});
