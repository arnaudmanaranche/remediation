import { describe, it, expect } from 'vitest';
import { Cluster } from './clusterer';
import { getSuggestedNames } from './clusterer';

function cluster(id: number, type: Cluster['type'], canonical: string): Cluster {
  return { id, type, canonical, values: [], count: 1, files: ['f.tsx'] };
}

describe('getSuggestedNames', () => {
  it('keeps the clean scale name when there is no collision', () => {
    const clusters = [cluster(0, 'spacing', '8px'), cluster(1, 'spacing', '24px')];
    const names = getSuggestedNames(clusters);
    expect(names.get(0)).toBe('sm');
    expect(names.get(1)).toBe('lg');
  });

  it('encodes the value instead of a counter when spacing buckets collide', () => {
    const clusters = [cluster(0, 'spacing', '16px'), cluster(1, 'spacing', '15px')];
    const names = getSuggestedNames(clusters);
    expect(names.get(0)).toBe('md_16');
    expect(names.get(1)).toBe('md_15');
  });

  it('is order-independent for colliding spacing clusters', () => {
    const a = getSuggestedNames([cluster(0, 'spacing', '16px'), cluster(1, 'spacing', '15px')]);
    const b = getSuggestedNames([cluster(9, 'spacing', '15px'), cluster(4, 'spacing', '16px')]);
    expect(a.get(0)).toBe(b.get(4));
    expect(a.get(1)).toBe(b.get(9));
  });

  it('produces valid JS identifiers (no hyphens) so bare refs stay unambiguous', () => {
    const clusters = [cluster(0, 'spacing', '16px'), cluster(1, 'spacing', '12px')];
    for (const name of getSuggestedNames(clusters).values()) {
      expect(name).toMatch(/^[a-z][a-z0-9_]*$/i);
    }
  });

  it('suffixes colliding color hues with their hex value', () => {
    const clusters = [cluster(0, 'color', '#2563eb'), cluster(1, 'color', '#3b82f6')];
    const names = getSuggestedNames(clusters);
    expect(names.get(0)).toBe('blue_2563eb');
    expect(names.get(1)).toBe('blue_3b82f6');
  });

  it('suffixes colliding typography sizes with px', () => {
    const clusters = [cluster(0, 'typography', '14px'), cluster(1, 'typography', '16px')];
    // 14px → sm, 16px → md: distinct; force a collision via rem equivalent
    const collide = [cluster(0, 'typography', '14px'), cluster(1, 'typography', '0.875rem')];
    const names = getSuggestedNames(collide);
    expect(names.get(0)).toBe('sm_14px');
    expect(names.get(1)).toBe('sm_0_875rem');
  });
});
