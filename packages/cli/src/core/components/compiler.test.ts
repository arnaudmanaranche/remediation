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
  proposal('color', '#27272a', 'card.tsx', 'gray900'),
  proposal('spacing', '8px', 'button.tsx', 'sm'),
  proposal('spacing', '12px', 'card.tsx', 'md_12'),
  proposal('spacing', '16px', 'button.tsx', 'md_16'),
  proposal('spacing', '24px', 'card.tsx', 'lg'),
  proposal('typography', '14px', 'button.tsx', 'sm'),
  proposal('typography', '600', 'button.tsx', 'semibold'),
];

const fixtureComponents = [
  ...detect(
    `export function Button({ children }: { children: React.ReactNode }) {
  return (
    <button type="button" style={{ backgroundColor: '#2563eb', color: '#ffffff', padding: '8px 16px', fontSize: '14px', fontWeight: '600' }}>
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
    <button type="button" style={{ backgroundColor: '#2563eb', color: '#ffffff', padding: '8px', fontSize: '14px' }}>
      {children}
    </button>
  );
}
`,
    'ButtonPrimary.tsx'
  ),
  ...detect(
    `export function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ backgroundColor: '#ffffff', color: '#27272a', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)' }}>
      <span style={{ color: '#ffffff' }}>{children}</span>
    </div>
  );
}
`,
    'Card.tsx'
  ),
];

describe('compileComponents', () => {
  it('returns no files when no tokens are proposed', () => {
    expect(compileComponents([], fixtureComponents).files).toEqual({});
  });

  it('emits one constrained component per detected component', () => {
    const { files, report } = compileComponents(tokens, fixtureComponents);
    const src = files['components.tsx'];

    expect(src).toContain("import { colors, typography } from './tokens';");
    expect(src).toContain("import { ColorName, Spacing, resolveSpacing, FontSizeName, FontWeightName } from './primitives';");
    expect(src).toContain('export type ButtonProps');
    expect(src).toContain('export function Button(');
    expect(src).toContain('export function Card(');

    expect(report).toEqual(
      expect.arrayContaining([
        { type: 'merged', component: 'ButtonPrimary', into: 'Button' },
        { type: 'emitted', component: 'Button' },
        { type: 'emitted', component: 'Card' },
      ])
    );
  });

  it('maps each component’s own style values onto its props and defaults', () => {
    const { files } = compileComponents(tokens, fixtureComponents);
    const src = files['components.tsx'];

    const buttonBlock = src.slice(src.indexOf('export type ButtonProps'));
    expect(buttonBlock).toContain('backgroundColor?: ColorName;');
    expect(buttonBlock).toContain('color?: ColorName;');
    expect(buttonBlock).toContain('padding?: Spacing | [Spacing, Spacing]');
    expect(buttonBlock).toContain('fontSize?: FontSizeName;');
    expect(buttonBlock).toContain('fontWeight?: FontWeightName;');
    expect(buttonBlock).toContain('backgroundColor = "primary"');
    expect(buttonBlock).toContain('color = "white"');
    expect(buttonBlock).toContain('padding = ["sm","md_16"]');
    expect(buttonBlock).toContain('fontSize = "sm"');
    expect(buttonBlock).toContain('fontWeight = "semibold"');
    expect(buttonBlock).toContain('backgroundColor: colors[backgroundColor]');
    expect(buttonBlock).toContain('padding: resolveSpacing(padding)');
    expect(buttonBlock).toContain('fontSize: typography[fontSize]');
  });

  it('keeps the detected element type and static attributes', () => {
    const { files } = compileComponents(tokens, fixtureComponents);
    const src = files['components.tsx'];
    const buttonBlock = src.slice(src.indexOf('export function Button'));
    expect(buttonBlock).toMatch(/<button type="button" \{\.\.\.rest\}/);
    expect(src).toMatch(/React\.ButtonHTMLAttributes<HTMLButtonElement>/);
    expect(src).toMatch(/React\.HTMLAttributes<HTMLElement>/);
  });

  it('keeps non-token style values literal in LOOK and reports unmapped ones', () => {
    const { files, report } = compileComponents(tokens, fixtureComponents);
    const src = files['components.tsx'];
    const cardBlock = src.slice(src.indexOf('export function Card'));
    expect(cardBlock).toContain('borderRadius: "8px"');
    expect(cardBlock).toContain('boxShadow: "0 1px 3px rgba(0, 0, 0, 0.12)"');
    expect(report).toContainEqual(expect.objectContaining({ type: 'unmapped', component: 'Card' }));
  });

  it('emits a component even when only non-token styles are detected', () => {
    const comps = detect(
      `export function Divider() {
  return <hr style={{ border: 'none', borderTop: '1px solid #e4e4e7' }} />;
}
`,
      'Divider.tsx'
    );
    const { files, report } = compileComponents(tokens, comps);
    const src = files['components.tsx'];
    expect(src).toContain('export function Divider(');
    expect(src).toContain('borderTop: "1px solid #e4e4e7"');
    expect(report).toContainEqual({ type: 'emitted', component: 'Divider' });
  });

  it('re-emits static JSX children (svgs, badges) verbatim', () => {
    const comps = detect(
      `export const CloseIcon = () => (
  <svg viewBox="0 0 24 24" style={{ width: '16px', height: '16px' }}>
    <path d="M0 0h24v24H0z" />
    <path d="M18.3 5.7L5.7 18.3" stroke="currentColor" />
  </svg>
);
`,
      'CloseIcon.tsx'
    );
    const { files } = compileComponents(tokens, comps);
    const src = files['components.tsx'];
    expect(src).toContain('export function CloseIcon(');
    expect(src).toContain('<path d="M0 0h24v24H0z" />');
    expect(src).toContain('width?: Spacing');
    expect(src).toMatch(/React\.SVGProps<SVGSVGElement>/);
  });

  it('emits a void element without children', () => {
    const comps = detect(
      `export function Checkbox() {
  return <input type="checkbox" style={{ width: '16px', height: '16px' }} />;
}
`,
      'Checkbox.tsx'
    );
    const { files } = compileComponents(tokens, comps);
    const src = files['components.tsx'];
    expect(src).toContain('export function Checkbox(');
    expect(src).toContain('React.InputHTMLAttributes<HTMLInputElement>');
    expect(src).toMatch(/<input type="checkbox" \{\.\.\.rest\} style=\{.*\} \/>/);
  });

  it('uses children props instead of raw children for dynamic bodies', () => {
    const { files } = compileComponents(
      tokens,
      detect(
        `export function List({ items }: { items: string[] }) {
  return <ul style={{ gap: '8px' }}>{items.map(i => <li key={i}>{i}</li>)}</ul>;
}
`,
        'List.tsx'
      )
    );
    const src = files['components.tsx'];
    expect(src).toContain('  children,');
    expect(src).toContain('{children}');
  });

  it('does not collapse a compound color value into a bare token', () => {
    const comps = detect(
      `export function Card2({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ backgroundColor: '#ffffff', border: '1px solid #e4e4e7', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)' }}>
      {children}
    </div>
  );
}
`,
      'Card2.tsx'
    );
    const { files, report } = compileComponents(tokens, comps);
    const src = files['components.tsx'];
    expect(src).not.toContain('border?:');
    const block = src.slice(src.indexOf('export function Card2'));
    expect(block).toContain('border: "1px solid #e4e4e7"');
    expect(block).toContain('boxShadow: "0 1px 3px rgba(0, 0, 0, 0.12)"');
    expect(src).toContain('backgroundColor?: ColorName');
    expect(report).toContainEqual(expect.objectContaining({ type: 'unmapped', component: 'Card2' }));
  });

  it('imports token records from tokensImport when configured', () => {
    const { files } = compileComponents(tokens, fixtureComponents, { tokensImport: '@/design/tokens' });
    const src = files['components.tsx'];
    expect(src).not.toContain("from './tokens'");
    expect(src).toContain("import { colors, typography } from '@/design/tokens';");
  });
});