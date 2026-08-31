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

  it('rewrites the color inside a shorthand border value', () => {
    const file = writeFile('C.tsx', `const el = <div style={{ border: '1px solid #e4e4e7' }} />;`);
    const gray = proposal('color', '#e4e4e7', file, { tokenRef: 'colors.gray200' });

    applyCodemod(tmpDir, [gray], false);

    expect(fs.readFileSync(file, 'utf-8')).toContain('border: `1px solid ${colors.gray200}`');
  });

  it('rewrites a length embedded in flex shorthand as a template literal', () => {
    const file = writeFile('C.tsx', `const el = <div style={{ flex: '1 0 8px' }} />;`);
    const sp = proposal('spacing', '8px', file, { tokenRef: 'spacing.sm' });

    applyCodemod(tmpDir, [sp], false);

    expect(fs.readFileSync(file, 'utf-8')).toContain('flex: `1 0 ${spacing.sm}`');
  });

  it('never rewrites a translucent rgba() to an opaque token', () => {
    const file = writeFile(
      'C.tsx',
      `const el = <div style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)' }} />;`
    );
    const black = proposal('color', '#000000', file, { tokenRef: 'colors.black' });

    const result = applyCodemod(tmpDir, [black], false);

    expect(result.changes).toHaveLength(0);
    expect(fs.readFileSync(file, 'utf-8')).toContain('rgba(0, 0, 0, 0.12)');
  });

  it('still rewrites fully opaque rgba()/rgb() values', () => {
    const file = writeFile('C.tsx', `const el = <div style={{ backgroundColor: 'rgba(37, 99, 235, 1)' }} />;`);
    const primary = proposal('color', '#2563eb', file, { tokenRef: 'colors.primary' });

    applyCodemod(tmpDir, [primary], false);

    expect(fs.readFileSync(file, 'utf-8')).toContain('backgroundColor: colors.primary');
  });

  it('leaves translucent values inside tagged templates untouched', () => {
    const file = writeFile(
      'S.tsx',
      'const S = styled.div`box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);`;'
    );
    const black = proposal('color', '#000000', file, { tokenRef: 'colors.black' });

    const result = applyCodemod(tmpDir, [black], false);

    expect(result.changes).toHaveLength(0);
    expect(fs.readFileSync(file, 'utf-8')).toContain('rgba(0, 0, 0, 0.5)');
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

    expect(applyCodemod(tmpDir, [p], false).warnings[0]).toContain('already exists');
  });

  describe('CSS-in-JS tagged templates', () => {
    it('rewrites a whole-value color inside a styled template', () => {
      const file = writeFile(
        'S.tsx',
        "const Btn = styled.div`color: #2563eb; padding: 8px;`;"
      );
      const color = proposal('color', '#2563eb', file, { tokenRef: 'colors.primary' });
      const pad = proposal('spacing', '8px', file, { tokenRef: 'spacing.sm' });

      applyCodemod(tmpDir, [color, pad], false);

      expect(fs.readFileSync(file, 'utf-8')).toContain(
        'styled.div`color: ${colors.primary}; padding: ${spacing.sm};`'
      );
    });

    it('rewrites a compound value as an interpolation, preserving surrounding text', () => {
      const file = writeFile('S.tsx', "const C = styled.div`border: 1px solid #e4e4e7;`;");
      const gray = proposal('color', '#e4e4e7', file, { tokenRef: 'colors.gray200' });
      const px = proposal('spacing', '1px', file, { tokenRef: 'spacing.px1' });

      applyCodemod(tmpDir, [gray], false);

      expect(fs.readFileSync(file, 'utf-8')).toContain(
        'border: 1px solid ${colors.gray200};'
      );
    });

    it('rewrites a typography declaration inside a template', () => {
      const file = writeFile('S.tsx', "const T = styled.span`font-size: 14px;`;");
      const typo = proposal('typography', '14px', file, { tokenName: 'sm' });

      applyCodemod(tmpDir, [typo], false);

      expect(fs.readFileSync(file, 'utf-8')).toContain('font-size: ${typography.sm};');
    });

    it('leaves existing interpolations untouched', () => {
      const file = writeFile(
        'S.tsx',
        'const B = styled.div`color: ${props.theme}; padding: 8px;`;'
      );
      const pad = proposal('spacing', '8px', file, { tokenRef: 'spacing.sm' });

      applyCodemod(tmpDir, [pad], false);

      const out = fs.readFileSync(file, 'utf-8');
      expect(out).toContain('color: ${props.theme};');
      expect(out).toContain('padding: ${spacing.sm};');
    });

    it('does not touch non-styled tagged templates', () => {
      const file = writeFile('S.tsx', 'const html = html`<b>8px</b>`;');
      const pad = proposal('spacing', '8px', file, { tokenRef: 'spacing.sm' });

      const result = applyCodemod(tmpDir, [pad], false);

      expect(result.changes).toHaveLength(0);
      expect(fs.readFileSync(file, 'utf-8')).toContain('<b>8px</b>');
    });

    it('handles multi-line templates with correct line numbers', () => {
      const file = writeFile(
        'S.tsx',
        'const M = styled.div`\n  color: #2563eb;\n  padding: 8px;\n`;'
      );
      const color = proposal('color', '#2563eb', file, { tokenRef: 'colors.primary' });

      const result = applyCodemod(tmpDir, [color], false);

      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].line).toBe(2);
      expect(fs.readFileSync(file, 'utf-8')).toContain('color: ${colors.primary};');
    });
  });
});
