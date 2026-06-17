import { NormalizedValue } from './normalizer';

export interface Cluster {
  id: number;
  type: 'color' | 'spacing' | 'typography';
  canonical: string;
  values: NormalizedValue[];
  count: number;
  files: string[];
}

function colorDistance(hex1: string, hex2: string): number {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);

  if (!rgb1 || !rgb2) return Infinity;

  const rmean = (rgb1.r + rgb2.r) / 2;
  const dr = rgb1.r - rgb2.r;
  const dg = rgb1.g - rgb2.g;
  const db = rgb1.b - rgb2.b;

  return Math.sqrt(
    (2 + rmean / 256) * dr * dr +
    4 * dg * dg +
    (2 + (255 - rmean) / 256) * db * db
  );
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleaned = hex.replace('#', '');
  if (cleaned.length !== 6) return null;

  return {
    r: parseInt(cleaned.substring(0, 2), 16),
    g: parseInt(cleaned.substring(2, 4), 16),
    b: parseInt(cleaned.substring(4, 6), 16),
  };
}

function spacingDistance(px1: number, px2: number): number {
  return Math.abs(px1 - px2);
}

function getDominantValue(values: NormalizedValue[]): string {
  const counts = new Map<string, number>();
  for (const v of values) {
    counts.set(v.canonical, (counts.get(v.canonical) || 0) + 1);
  }

  let maxCount = 0;
  let dominant = values[0]?.canonical || '';

  for (const [value, count] of counts) {
    if (count > maxCount) {
      maxCount = count;
      dominant = value;
    }
  }

  return dominant;
}

function suggestName(cluster: Cluster): string {
  if (cluster.type === 'color') {
    const hex = cluster.canonical;
    const rgb = hexToRgb(hex);
    if (!rgb) return 'unknown';

    const { r, g, b } = rgb;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const lightness = (max + min) / 2;

    if (max - min < 20) {
      if (lightness < 50) return 'black';
      if (lightness > 200) return 'white';
      return 'gray';
    }

    let hue: number;
    if (max === r) hue = ((g - b) / (max - min)) * 60;
    else if (max === g) hue = 120 + ((b - r) / (max - min)) * 60;
    else hue = 240 + ((r - g) / (max - min)) * 60;

    if (hue < 0) hue += 360;

    if (hue < 30) return 'red';
    if (hue < 60) return 'orange';
    if (hue < 90) return 'yellow';
    if (hue < 150) return 'green';
    if (hue < 210) return 'cyan';
    if (hue < 270) return 'blue';
    if (hue < 330) return 'purple';
    return 'red';
  }

  if (cluster.type === 'spacing') {
    const px = parseFloat(cluster.canonical);
    if (px <= 4) return 'xs';
    if (px <= 8) return 'sm';
    if (px <= 16) return 'md';
    if (px <= 24) return 'lg';
    if (px <= 32) return 'xl';
    return 'xxl';
  }

  return 'unknown';
}

export function clusterValues(values: NormalizedValue[]): Cluster[] {
  const clusters: Cluster[] = [];
  const used = new Set<number>();

  const colorValues = values.filter(v => v.type === 'color' && v.hex);
  const spacingValues = values.filter(v => v.type === 'spacing' && v.px !== undefined);
  const otherValues = values.filter(v => v.type !== 'color' && v.type !== 'spacing');

  // Cluster colors
  for (let i = 0; i < colorValues.length; i++) {
    if (used.has(i)) continue;

    const cluster: NormalizedValue[] = [colorValues[i]];
    used.add(i);

    for (let j = i + 1; j < colorValues.length; j++) {
      if (used.has(j)) continue;

      const dist = colorDistance(colorValues[i].hex!, colorValues[j].hex!);
      if (dist < 30) {
        cluster.push(colorValues[j]);
        used.add(j);
      }
    }

    if (cluster.length >= 1) {
      const canonical = getDominantValue(cluster);
      const files = [...new Set(cluster.map(v => v.file))];
      const suggestedName = suggestName({ id: 0, type: 'color', canonical, values: cluster, count: cluster.length, files });

      clusters.push({
        id: clusters.length,
        type: 'color',
        canonical,
        values: cluster,
        count: cluster.length,
        files,
      });
    }
  }

  // Reset used for spacing
  used.clear();

  // Cluster spacing
  for (let i = 0; i < spacingValues.length; i++) {
    if (used.has(i)) continue;

    const cluster: NormalizedValue[] = [spacingValues[i]];
    used.add(i);

    for (let j = i + 1; j < spacingValues.length; j++) {
      if (used.has(j)) continue;

      const dist = spacingDistance(spacingValues[i].px!, spacingValues[j].px!);
      if (dist <= 2) {
        cluster.push(spacingValues[j]);
        used.add(j);
      }
    }

    if (cluster.length >= 1) {
      const canonical = getDominantValue(cluster);
      const files = [...new Set(cluster.map(v => v.file))];

      clusters.push({
        id: clusters.length,
        type: 'spacing',
        canonical,
        values: cluster,
        count: cluster.length,
        files,
      });
    }
  }

  // Add other values as individual clusters
  for (const value of otherValues) {
    clusters.push({
      id: clusters.length,
      type: value.type,
      canonical: value.canonical,
      values: [value],
      count: 1,
      files: [value.file],
    });
  }

  return clusters;
}

export function getSuggestedNames(clusters: Cluster[]): Map<number, string> {
  const names = new Map<number, string>();

  const colorCounts = new Map<string, number>();
  const spacingCounts = new Map<string, number>();

  for (const cluster of clusters) {
    if (cluster.type === 'color') {
      const name = suggestName(cluster);
      const count = colorCounts.get(name) || 0;
      colorCounts.set(name, count + 1);
      names.set(cluster.id, count > 0 ? `${name}${count + 1}` : name);
    } else if (cluster.type === 'spacing') {
      const name = suggestName(cluster);
      const count = spacingCounts.get(name) || 0;
      spacingCounts.set(name, count + 1);
      names.set(cluster.id, count > 0 ? `${name}${count + 1}` : name);
    } else {
      names.set(cluster.id, 'unknown');
    }
  }

  return names;
}
