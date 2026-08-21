import { describe, it, expect } from 'vitest';
import { toCanonical } from './normalizer';
import { Cluster } from './clusterer';
import { decideTokens } from './decision';

describe('toCanonical', () => {
  it('maps colors and lengths as before', () => {
    expect(toCanonical('#2563EB')).toEqual({ canonical: '#2563eb', type: 'color' });
    expect(toCanonical('8px')).toEqual({ canonical: '8px', type: 'spacing' });
    expect(toCanonical('0.5rem')).toEqual({ canonical: '8px', type: 'spacing' });
  });

  it('accepts bare numeric font-weight keys', () => {
    expect(toCanonical('600')).toEqual({ canonical: '600', type: 'typography' });
    expect(toCanonical('400')).toEqual({ canonical: '400', type: 'typography' });
  });

  it('accepts keyword font-weight keys (case-insensitive)', () => {
    expect(toCanonical('bold')).toEqual({ canonical: 'bold', type: 'typography' });
    expect(toCanonical('Normal')).toEqual({ canonical: 'normal', type: 'typography' });
  });

  it('still rejects non-numeric, unit-less junk', () => {
    expect(toCanonical('solid black')).toBeNull();
    expect(toCanonical('flex')).toBeNull();
  });

  it('does not treat a length as a bare number', () => {
    // '600px' must stay spacing, never become a weight
    expect(toCanonical('600px')!.type).toBe('spacing');
  });
});

function cluster(
  id: number,
  type: Cluster['type'],
  canonical: string,
  count = 5
): Cluster {
  return {
    id,
    type,
    canonical,
    values: Array.from({ length: count }, (_, i) => ({
      type,
      canonical,
      raw: canonical,
      file: `f${i % 2}.tsx`,
      line: i + 1,
      column: 1,
    })),
    count,
    files: ['f0.tsx', 'f1.tsx'],
  };
}

describe('decideTokens with config maps', () => {
  it('routes numeric weight config entries through the typography map', () => {
    const c = cluster(0, 'typography', '600');
    const result = decideTokens([c], new Map([[0, 'semibold']]), new Map(), new Map([['600', 'typography.semibold']]));

    expect(result.proposals).toHaveLength(1);
    expect(result.proposals[0].fromConfig).toBe(true);
    expect(result.proposals[0].tokenRef).toBe('typography.semibold');
  });

  it('keeps color/spacing config entries on the value map', () => {
    const c = cluster(0, 'color', '#2563eb');
    const result = decideTokens([c], new Map(), new Map([['#2563eb', 'colors.primary']]));

    expect(result.proposals[0].tokenRef).toBe('colors.primary');
  });
});
