import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { applyCodemod } from './codemod';
import { TokenProposal } from './decision';
import { NormalizedValue } from './normalizer';

let tmpDir: string;

beforeEach(() => {
  tmpDir = path.join(__dirname, '__test_codemod__');
  fs.mkdirSync(tmpDir, { recursive: true });
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function writeFile(name: string, content: string): string {
  const p = path.join(tmpDir, name);
  fs.writeFileSync(p, content);
  return p;
}

function writeConfig(body: string) {
  fs.writeFileSync(path.join(tmpDir, 'remediation.config.js'), `module.exports = ${body};`);
}

function value(canonical: string, file: string, type: NormalizedValue['type']): NormalizedValue {
  return { type, canonical, raw: canonical, file, line: 1, column: 1 };
}

// Build a proposal whose cluster covers the given member canonicals.
function proposal(
  type: NormalizedValue['type'],
  canonical: string,
  file: string,
  opts: { tokenName?: string; tokenRef?: string; members?: string[] } = {}
): TokenProposal {
  const members = (opts.members ?? [canonical]).map((c) => value(c, file, type));
  return {
    cluster: { id: 0, type: type as any, canonical, values: members, count: members.length, files: [file] },
    tokenName: opts.tokenName ?? 'x',
    tokenRef: opts.tokenRef,
    frequency: members.length,
    filesCount: 1,
    confidence: 'high',
  };
}

describe('applyCodemod', () => {
  it('does not write files in dry-run', () => {
    const file = writeFile('C.tsx', `const el = <div style={{ backgroundColor: '#2563eb' }} />;`);
    const p = proposal('color', '#2563eb', file, { tokenRef: 'colors.primary' });

    const result = applyCodemod(tmpDir, [p], true);

    expect(result.changes).toHaveLength(1);
    expect(result.filesModified).toHaveLength(0);
    expect(fs.readFileSync(file, 'utf-8')).toContain(`'#2563eb'`);
  });

  it('replaces a whole-value literal with a bare reference and respects config tokens', () => {
    const file = writeFile('C.tsx', `const el = <div style={{ backgroundColor: '#2563eb' }} />;`);
    const p = proposal('color', '#2563eb', file, { tokenRef: 'colors.primary' });

    applyCodemod(tmpDir, [p], false);

    const out = fs.readFileSync(file, 'utf-8');
    expect(out).toContain('backgroundColor: colors.primary');
    expect(out).not.toContain(`'#2563eb'`);
  });

  it('rewrites a shorthand value as a template literal', () => {
    const file = writeFile('C.tsx', `const el = <div style={{ padding: '8px 16px' }} />;`);
    const sm = proposal('spacing', '8px', file, { tokenRef: 'spacing.sm' });
    const md = proposal('spacing', '16px', file, { tokenRef: 'spacing.md' });

    applyCodemod(tmpDir, [sm, md], false);

    const out = fs.readFileSync(file, 'utf-8');
    expect(out).toContain('padding: `${spacing.sm} ${spacing.md}`');
  });

  it('preserves surrounding text in a compound value', () => {
    const file = writeFile('C.tsx', `const el = <div style={{ boxShadow: '0 2px 4px #000000' }} />;`);
    const black = proposal('color', '#000000', file, { tokenRef: 'colors.black' });

    applyCodemod(tmpDir, [black], false);

    const out = fs.readFileSync(file, 'utf-8');
    expect(out).toContain('boxShadow: `0 2px 4px ${colors.black}`');
  });

  it('maps every clustered member value to the cluster token', () => {
    const file = writeFile('C.tsx', `const el = <div style={{ borderRadius: '6px' }} />;`);
    // 6px is a non-canonical member snapped into the 8px cluster
    const p = proposal('spacing', '8px', file, { tokenRef: 'spacing.sm', members: ['8px', '6px'] });

    applyCodemod(tmpDir, [p], false);

    expect(fs.readFileSync(file, 'utf-8')).toContain('borderRadius: spacing.sm');
  });

  it('rewrites a string typography value (fontSize)', () => {
    const file = writeFile('C.tsx', `const el = <div style={{ fontSize: '14px' }} />;`);
    const p = proposal('typography', '14px', file, { tokenName: 'sm' });

    applyCodemod(tmpDir, [p], false);

    expect(fs.readFileSync(file, 'utf-8')).toContain('fontSize: typography.sm');
  });

  it('rewrites a numeric typography value (fontWeight)', () => {
    const file = writeFile('C.tsx', `const el = <div style={{ fontWeight: 600 }} />;`);
    const p = proposal('typography', '600', file, { tokenName: 'semibold' });

    applyCodemod(tmpDir, [p], false);

    expect(fs.readFileSync(file, 'utf-8')).toContain('fontWeight: typography.semibold');
  });

  it('does not confuse a spacing 14px with a typography 14px', () => {
    const file = writeFile('C.tsx', `const el = <div style={{ padding: '14px', fontSize: '14px' }} />;`);
    const space = proposal('spacing', '14px', file, { tokenRef: 'spacing.md' });
    const type = proposal('typography', '14px', file, { tokenName: 'sm' });

    applyCodemod(tmpDir, [space, type], false);

    const out = fs.readFileSync(file, 'utf-8');
    expect(out).toContain('padding: spacing.md');
    expect(out).toContain('fontSize: typography.sm');
  });

  it('injects the token import when tokensImport is configured', () => {
    writeConfig(`{ tokensImport: '@/design/tokens' }`);
    const file = writeFile(
      'C.tsx',
      `import React from 'react';\nconst el = <div style={{ backgroundColor: '#2563eb' }} />;`
    );
    const p = proposal('color', '#2563eb', file, { tokenRef: 'colors.primary' });

    const result = applyCodemod(tmpDir, [p], false);

    const out = fs.readFileSync(file, 'utf-8');
    expect(out).toContain(`import { colors } from '@/design/tokens';`);
    // inserted after the existing import, not before it
    expect(out.indexOf(`import React`)).toBeLessThan(out.indexOf(`@/design/tokens`));
    expect(result.warnings).toHaveLength(0);
  });

  it('warns instead of injecting when tokensImport is absent', () => {
    const file = writeFile('C.tsx', `const el = <div style={{ backgroundColor: '#2563eb' }} />;`);
    const p = proposal('color', '#2563eb', file, { tokenRef: 'colors.primary' });

    const result = applyCodemod(tmpDir, [p], false);

    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('colors');
    expect(fs.readFileSync(file, 'utf-8')).not.toContain('import {');
  });

  it('warns when an import from tokensImport already exists', () => {
    writeConfig(`{ tokensImport: '@/design/tokens' }`);
    const file = writeFile(
      'C.tsx',
      `import { spacing } from '@/design/tokens';\nconst el = <div style={{ backgroundColor: '#2563eb' }} />;`
    );
    const p = proposal('color', '#2563eb', file, { tokenRef: 'colors.primary' });

    const result = applyCodemod(tmpDir, [p], false);

    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('already exists');
  });
});
