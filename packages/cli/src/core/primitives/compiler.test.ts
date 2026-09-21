import { describe, it, expect } from 'vitest';
import { compilePrimitives } from './compiler';
import { TokenProposal } from '../pipeline/decision';
import { NormalizedValue } from '../pipeline/normalizer';

function value(canonical: string, file: string, type: NormalizedValue['type']): NormalizedValue {
  return { type, canonical, raw: canonical, file, line: 1, column: 1 };
}

function proposal(
  type: NormalizedValue['type'],
  canonical: string,
  file: string,
  opts: { tokenName?: string; tokenRef?: string; count?: number } = {}
): TokenProposal {
  const count = opts.count ?? 1;
  const members = Array.from({ length: count }, () => value(canonical, file, type));
  return {
    cluster: { id: 0, type: type as any, canonical, values: members, count, files: [file] },
    tokenName: opts.tokenName ?? canonical,
    tokenRef: opts.tokenRef,
    frequency: count,
    filesCount: 1,
    confidence: 'high',
  };
}

describe('compilePrimitives', () => {
  it('returns no files when no tokens are proposed', () => {
    expect(compilePrimitives([]).files).toEqual({});
  });

  it('writes a tokens.ts when no tokensImport is configured', () => {
    const props = [proposal('color', '#2563eb', 'a.tsx', { tokenName: 'primary' })];
    const { files } = compilePrimitives(props);
    expect(files['tokens.ts']).toContain('export const colors');
    expect(files['tokens.ts']).toContain("'primary': '#2563eb'");
    expect(files['tokens.ts']).toContain('Run `remediation primitives` to regenerate');
  });

  it('omits tokens.ts and imports from tokensImport when configured', () => {
    const props = [proposal('color', '#2563eb', 'a.tsx', { tokenName: 'primary' })];
    const { files } = compilePrimitives(props, { tokensImport: '@/design/tokens' });
    expect(files['tokens.ts']).toBeUndefined();
    expect(files['primitives.tsx']).toContain("import { colors } from '@/design/tokens';");
  });

  it('emits union types keyed to the generated token records', () => {
    const props = [
      proposal('color', '#2563eb', 'a.tsx', { tokenName: 'primary' }),
      proposal('spacing', '8px', 'a.tsx', { tokenName: 'sm' }),
      proposal('spacing', '16px', 'a.tsx', { tokenName: 'md' }),
      proposal('typography', '14px', 'a.tsx', { tokenName: 'body' }),
    ];
    const { files } = compilePrimitives(props);
    const src = files['primitives.tsx'];
    expect(src).toContain('export type ColorName = keyof typeof colors;');
    expect(src).toContain('export type Spacing = keyof typeof spacing;');
  });

  it('splits typography into size and weight prop unions', () => {
    const props = [
      proposal('typography', '14px', 'a.tsx', { tokenName: 'body' }),
      proposal('typography', '12px', 'b.tsx', { tokenName: 'small' }),
      proposal('typography', '600', 'a.tsx', { tokenName: 'semibold' }),
    ];
    const src = compilePrimitives(props).files['primitives.tsx'];
    expect(src).toContain('export type FontSizeName = "body" | "small";');
    expect(src).toContain('export type FontWeightName = "semibold";');
    expect(src).toContain('fontSize?: FontSizeName;');
    expect(src).toContain('fontWeight?: FontWeightName;');
    expect(src).not.toContain('TypeScale');
  });

  it('keys Box visual props to spacing and color tokens only', () => {
    const props = [
      proposal('color', '#2563eb', 'a.tsx', { tokenName: 'primary' }),
      proposal('spacing', '8px', 'a.tsx', { tokenName: 'sm' }),
    ];
    const src = compilePrimitives(props).files['primitives.tsx'];
    expect(src).toContain('padding?: Spacing | [Spacing, Spacing] | [Spacing, Spacing, Spacing] | [Spacing, Spacing, Spacing, Spacing];');
    expect(src).toContain('margin?: Spacing | [Spacing, Spacing] | [Spacing, Spacing, Spacing] | [Spacing, Spacing, Spacing, Spacing];');
    expect(src).toContain('gap?: Spacing;');
    expect(src).toContain('backgroundColor?: ColorName;');
    expect(src).toContain('borderColor?: ColorName;');
    expect(src).toContain('padding: resolveSpacing(padding)');
    expect(src).toContain('backgroundColor: colors[backgroundColor]');
  });

  it('keys Text props to typography and color tokens only', () => {
    const props = [
      proposal('color', '#2563eb', 'a.tsx', { tokenName: 'primary' }),
      proposal('typography', '14px', 'a.tsx', { tokenName: 'body' }),
      proposal('typography', '600', 'a.tsx', { tokenName: 'semibold' }),
    ];
    const src = compilePrimitives(props).files['primitives.tsx'];
    expect(src).toContain('color?: ColorName;');
    expect(src).toContain('fontSize?: FontSizeName;');
    expect(src).toContain('fontWeight?: FontWeightName;');
    expect(src).toContain('color: colors[color]');
    expect(src).toContain('fontSize: typography[fontSize]');
  });

  it('omits Text when only spacing tokens exist', () => {
    const props = [proposal('spacing', '8px', 'a.tsx', { tokenName: 'sm' })];
    const src = compilePrimitives(props).files['primitives.tsx'];
    expect(src).toContain('export function Box(');
    expect(src).not.toContain('export function Text(');
    expect(src).not.toContain('backgroundColor');
  });

  it('omits spacing props when no spacing tokens exist', () => {
    const props = [proposal('color', '#2563eb', 'a.tsx', { tokenName: 'primary' })];
    const src = compilePrimitives(props).files['primitives.tsx'];
    expect(src).not.toContain('padding?');
    expect(src).toContain('backgroundColor?: ColorName;');
  });

  it('resolves compact spacing tuples into joined CSS values', () => {
    const props = [
      proposal('spacing', '8px', 'a.tsx', { tokenName: 'sm' }),
      proposal('spacing', '16px', 'b.tsx', { tokenName: 'md' }),
    ];
    const src = compilePrimitives(props).files['primitives.tsx'];
    expect(src).toContain('value.map((v) => spacing[v]).join(\' \')');
  });

  it('includes the generation header', () => {
    const props = [proposal('spacing', '8px', 'a.tsx', { tokenName: 'sm' })];
    const src = compilePrimitives(props).files['primitives.tsx'];
    expect(src.startsWith('// Auto-generated by remediation')).toBe(true);
    expect(src).toContain('<Box padding="17px" />');
  });
});