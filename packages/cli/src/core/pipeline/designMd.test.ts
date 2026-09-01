import { describe, it, expect } from 'vitest';
import { generateDesignMd } from './designMd';
import { DecisionResult, TokenProposal } from './decision';
import { NormalizedValue } from './normalizer';

function value(canonical: string, file: string, type: NormalizedValue['type']): NormalizedValue {
  return { type, canonical, raw: canonical, file, line: 1, column: 1 };
}

function proposal(
  type: NormalizedValue['type'],
  canonical: string,
  file: string,
  opts: { tokenName?: string; tokenRef?: string; count?: number; filesCount?: number } = {}
): TokenProposal {
  const count = opts.count ?? 1;
  const members = Array.from({ length: count }, () => value(canonical, file, type));
  const files = Array.from({ length: opts.filesCount ?? 1 }, (_, i) => `${file}${i > 0 ? i : ''}`);
  return {
    cluster: { id: 0, type: type as any, canonical, values: members, count, files },
    tokenName: opts.tokenName ?? canonical,
    tokenRef: opts.tokenRef,
    frequency: count,
    filesCount: opts.filesCount ?? 1,
    confidence: 'high',
  };
}

function decision(proposals: TokenProposal[]): DecisionResult {
  return {
    proposals,
    summary: {
      totalValues: proposals.reduce((s, p) => s + p.frequency, 0),
      totalClusters: proposals.length,
      proposedTokens: proposals.length,
      skippedClusters: 0,
    },
  };
}

describe('generateDesignMd', () => {
  it('returns a message when no tokens are detected', () => {
    const result = generateDesignMd(decision([]));
    expect(result).toContain('No design tokens detected');
  });

  it('emits a spec-compliant YAML frontmatter with version and name', () => {
    const props = [proposal('color', '#2563eb', 'a.tsx')];
    const result = generateDesignMd(decision(props));
    expect(result.startsWith('---')).toBe(true);
    expect(result).toContain('version: alpha');
    expect(result).toContain('name:');
  });

  it('emits the colors map in frontmatter', () => {
    const props = [
      proposal('color', '#2563eb', 'a.tsx', { tokenName: 'primary', tokenRef: 'colors.primary' }),
    ];
    const result = generateDesignMd(decision(props));
    expect(result).toContain('colors:');
    expect(result).toContain(`  primary: "#2563eb"`);
  });

  it('emits the spacing map in frontmatter', () => {
    const props = [
      proposal('spacing', '8px', 'a.tsx', { tokenName: 'sm' }),
    ];
    const result = generateDesignMd(decision(props));
    expect(result).toContain('spacing:');
    expect(result).toContain(`  sm: "8px"`);
  });

  it('emits typography tokens as objects with fontSize/fontWeight', () => {
    const props = [
      proposal('typography', '14px', 'a.tsx', { tokenName: 'body' }),
      proposal('typography', '600', 'a.tsx', { tokenName: 'semibold' }),
    ];
    const result = generateDesignMd(decision(props));
    expect(result).toContain('typography:');
    expect(result).toContain('  body:');
    expect(result).toContain('    fontSize: 14px');
    expect(result).toContain('  semibold:');
    expect(result).toContain('    fontWeight: 600');
  });

  it('omits empty token groups from frontmatter', () => {
    const props = [proposal('color', '#000', 'a.tsx')];
    const result = generateDesignMd(decision(props));
    expect(result).not.toContain('spacing:');
    expect(result).not.toContain('typography:');
  });

  it('uses tokenRef as display name when available', () => {
    const props = [
      proposal('color', '#2563eb', 'a.tsx', { tokenRef: 'colors.primary' }),
    ];
    const result = generateDesignMd(decision(props));
    expect(result).toContain(`  primary: "#2563eb"`);
  });

  it('includes the canonical section order', () => {
    const props = [proposal('color', '#000', 'a.tsx')];
    const result = generateDesignMd(decision(props));
    const overview = result.indexOf('## Overview');
    const colors = result.indexOf('## Colors');
    const typography = result.indexOf('## Typography');
    const layout = result.indexOf('## Layout');
    const elevation = result.indexOf('## Elevation & Depth');
    const shapes = result.indexOf('## Shapes');
    expect(overview).toBeGreaterThan(-1);
    expect(colors).toBeGreaterThan(overview);
    expect(typography).toBeGreaterThan(colors);
    expect(layout).toBeGreaterThan(typography);
    expect(elevation).toBeGreaterThan(layout);
    expect(shapes).toBeGreaterThan(elevation);
  });

  it('names the most frequently used color in prose', () => {
    const props = [
      proposal('color', '#2563eb', 'a.tsx', { tokenName: 'primary', count: 5, filesCount: 3 }),
    ];
    const result = generateDesignMd(decision(props));
    expect(result).toContain('most frequently used color');
    expect(result).toContain('`primary`');
    expect(result).toContain('(#2563eb)');
  });

  it('names the dominant spacing unit in prose', () => {
    const props = [
      proposal('spacing', '8px', 'a.tsx', { tokenName: 'sm', count: 7, filesCount: 5 }),
    ];
    const result = generateDesignMd(decision(props));
    expect(result).toContain('dominant spacing unit');
    expect(result).toContain('`sm`');
    expect(result).toContain('(8px)');
  });

  it('emits a Do\'s and Don\'ts section driven by detected tokens', () => {
    const props = [
      proposal('color', '#000', 'a.tsx', { tokenName: 'black', count: 3 }),
      proposal('spacing', '8px', 'b.tsx', { tokenName: 'sm', count: 2 }),
    ];
    const result = generateDesignMd(decision(props));
    expect(result).toContain('## Do\'s and Don\'ts');
    expect(result).toContain('Do reuse **`black`**');
    expect(result).toContain('scale spacing from **`sm`**');
  });

  it('lists detected typography sizes and weights', () => {
    const props = [
      proposal('typography', '14px', 'a.tsx', { tokenName: 'sm' }),
      proposal('typography', '600', 'a.tsx', { tokenName: 'semibold' }),
    ];
    const result = generateDesignMd(decision(props));
    expect(result).toContain('size level');
    expect(result).toContain('`sm`');
    expect(result).toContain('Weight detected: `semibold`');
  });
});
