import { describe, it, expect } from 'vitest';
import { compileComponents } from './compiler';
import { detectComponentsInSource, DetectedComponent } from './detector';
import { TokenProposal } from '../pipeline/decision';
import { NormalizedValue } from '../pipeline/normalizer';

function value(canonical: string, file: string, type: NormalizedValue['type']): NormalizedValue {
  return { type, canonical, raw: canonical, file, line: 1, column: 1 };
}

function proposal(
  type: NormalizedValue['type'],
  canonical: string,
  file: string,
  tokenName?: string
): TokenProposal {
  return {
    cluster: { id: 0, type: type as any, canonical, values: [value(canonical, file, type)], count: 1, files: [file] },
    tokenName: tokenName ?? canonical,
    frequency: 1,
    filesCount: 1,
    confidence: 'high',
  };
}

function detect(src: string, file: string): DetectedComponent[] {
  return detectComponentsInSource(src, file);
}

const tokens = [
  proposal('color', '#2563eb', 'button.tsx', 'primary'),
  proposal('color', '#ffffff', 'button.tsx', 'white'),
  proposal('color', '#f4f4f5', 'badge.tsx', 'gray200'),
  proposal('color', '#18181b', 'badge.tsx', 'gray900'),
  proposal('color', '#27272a', 'card.tsx', 'gray900'),
  proposal('spacing', '8px', 'button.tsx', 'sm'),
  proposal('spacing', '12px', 'alert.tsx', 'md_12'),
  proposal('spacing', '16px', 'button.tsx', 'md_16'),
  proposal('typography', '14px', 'button.tsx', 'sm'),
  proposal('typography', '12px', 'badge.tsx', 'xs'),
  proposal('typography', '600', 'button.tsx', 'semibold'),
];

const fixtureComponents = [
  ...detect(
    `export function Button({ children }: { children: React.ReactNode }) {
  return (
    <button type="button" style={{ backgroundColor: '#2563eb', color: '#ffffff', padding: '8px 16px', borderRadius: '6px', fontSize: '14px', fontWeight: '600' }}>
      {children}
    </button>
  );
}
`,
    'Button.tsx'
  ),
  ...detect(
    `export function ButtonPrimary({ children }: { children: React.ReactNode }) {
  return (
    <button type="button" style={{ backgroundColor: '#2563eb', color: '#ffffff', padding: '8px', borderRadius: '6px', fontSize: '14px' }}>
      {children}
    </button>
  );
}
`,
    'ButtonPrimary.tsx'
  ),
  ...detect(
    `export function Badge({ label }: { label: string }) {
  return (
    <span style={{ backgroundColor: '#f4f4f5', color: '#18181b', padding: '2px 8px', borderRadius: '9999px', fontSize: '12px', fontWeight: 500 }}>{label}</span>
  );
}
`,
    'Badge.tsx'
  ),
  ...detect(
    `export function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ backgroundColor: '#ffffff', color: '#27272a', padding: '24px', borderRadius: '8px', border: '1px solid #e4e4e7' }}>
      {children}
    </div>
  );
}
`,
    'Card.tsx'
  ),
  ...detect(
    `export function Heading() {
  return (
    <h2 style={{ fontSize: '24px' }}>Title</h2>
  );
}
`,
    'Heading.tsx'
  ),
];

describe('compileComponents', () => {
  it('returns no files when no tokens are proposed', () => {
    expect(compileComponents([], fixtureComponents).files).toEqual({});
  });

  it('emits a token-constrained components library from detected components', () => {
    const { files, report } = compileComponents(tokens, fixtureComponents);
    const src = files['components.tsx'];

    expect(src).toContain("import { colors, typography } from './tokens';");
    expect(src).toContain("import { ColorName, Spacing, resolveSpacing, FontSizeName, FontWeightName } from './primitives';");
    expect(src).toContain('export type ButtonProps');
    expect(src).toContain('export function Button(');
    expect(src).toContain('export function Badge(');
    expect(src).toContain('export function Card(');

    expect(report).toEqual(
      expect.arrayContaining([
        { type: 'merged', component: 'ButtonPrimary', into: 'Button' },
        { type: 'unmatched', component: 'Heading', file: 'Heading.tsx' },
        expect.objectContaining({ type: 'unmapped' }),
      ])
    );
  });

  it('maps detected style values onto archetype slot defaults', () => {
    const { files } = compileComponents(tokens, fixtureComponents);
    const src = files['components.tsx'];

    const buttonBlock = src.slice(src.indexOf('export type ButtonProps'));
    expect(buttonBlock).toContain('backgroundColor = "primary"');
    expect(buttonBlock).toContain('color = "white"');
    expect(buttonBlock).toContain('padding = ["sm","md_16"]');
    expect(buttonBlock).toContain('fontSize = "sm"');
    expect(buttonBlock).toContain('fontWeight = "semibold"');

    expect(buttonBlock).toContain('backgroundColor: colors[backgroundColor]');
    expect(buttonBlock).toContain('padding: resolveSpacing(padding)');
    expect(buttonBlock).toContain('fontSize: typography[fontSize]');
  });

  it('merges near-duplicate components into a single canonical component', () => {
    const { files, report } = compileComponents(tokens, fixtureComponents);
    const src = files['components.tsx'];

    expect(src).not.toContain('ButtonPrimary');
    expect(src).toContain('export function Button(');
    expect(report).toContainEqual({ type: 'merged', component: 'ButtonPrimary', into: 'Button' });
  });

  it('keeps unmapped style values literal in LOOK and reports them', () => {
    const { files, report } = compileComponents(tokens, fixtureComponents);
    const src = files['components.tsx'];

    const badgeBlock = src.slice(src.indexOf('export function Badge'));
    expect(badgeBlock).toContain('borderRadius: "9999px"');
    expect(report).toContainEqual(expect.objectContaining({ type: 'unmapped', component: 'Badge' }));
  });

  it('skips non-archetype components (text semantics) with an unmatched report', () => {
    const { files, report } = compileComponents(tokens, fixtureComponents);
    expect(files['components.tsx']).not.toContain('export function Heading');
    expect(report).toContainEqual({ type: 'unmatched', component: 'Heading', file: 'Heading.tsx' });
  });

  it('imports token records from tokensImport when configured', () => {
    const { files } = compileComponents(tokens, fixtureComponents, { tokensImport: '@/design/tokens' });
    const src = files['components.tsx'];
    expect(src).not.toContain("from './tokens'");
    expect(src).toContain("import { colors, typography } from '@/design/tokens';");
  });

  it('forces catalog archetypes included via config selection', () => {
    const { files, report } = compileComponents(tokens, fixtureComponents, { include: ['divider'] });
    const src = files['components.tsx'];
    expect(src).toContain('export function Divider(');
    expect(src).not.toContain('export function Button(');
    expect(report).toContainEqual({ type: 'forced', archetype: 'divider' });
  });

  it('restricts emission to the selected archetypes when matched', () => {
    const { files } = compileComponents(tokens, fixtureComponents, { include: ['button'] });
    const src = files['components.tsx'];
    expect(src).toContain('export function Button(');
    expect(src).not.toContain('export function Card(');
  });
});