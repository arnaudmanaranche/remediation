export interface NormalizedValue {
  type: 'color' | 'spacing' | 'typography';
  canonical: string;
  hex?: string;
  px?: number;
  raw: string;
  file: string;
  line: number;
  column: number;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleaned = hex.replace('#', '');
  let r, g, b;

  if (cleaned.length === 3) {
    r = parseInt(cleaned[0] + cleaned[0], 16);
    g = parseInt(cleaned[1] + cleaned[1], 16);
    b = parseInt(cleaned[2] + cleaned[2], 16);
  } else if (cleaned.length === 6) {
    r = parseInt(cleaned.substring(0, 2), 16);
    g = parseInt(cleaned.substring(2, 4), 16);
    b = parseInt(cleaned.substring(4, 6), 16);
  } else {
    return null;
  }

  return { r, g, b };
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;

  let r = 0, g = 0, b = 0;

  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

function normalizeColor(value: string): { canonical: string; hex: string } | null {
  // Hex
  const hexMatch = value.match(/#([0-9a-fA-F]{3,8})/);
  if (hexMatch) {
    const hex = hexMatch[1];
    const rgb = hexToRgb(hex);
    if (rgb) {
      const normalized = rgbToHex(rgb.r, rgb.g, rgb.b);
      return { canonical: normalized.toLowerCase(), hex: normalized.toLowerCase() };
    }
  }

  // RGB
  const rgbMatch = value.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbMatch) {
    const hex = rgbToHex(parseInt(rgbMatch[1]), parseInt(rgbMatch[2]), parseInt(rgbMatch[3]));
    return { canonical: hex.toLowerCase(), hex: hex.toLowerCase() };
  }

  // HSL
  const hslMatch = value.match(/hsla?\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%/);
  if (hslMatch) {
    const rgb = hslToRgb(parseInt(hslMatch[1]), parseInt(hslMatch[2]), parseInt(hslMatch[3]));
    const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
    return { canonical: hex.toLowerCase(), hex: hex.toLowerCase() };
  }

  return null;
}

function normalizeSpacing(value: string): { canonical: string; px: number } | null {
  const pxMatch = value.match(/(\d+(?:\.\d+)?)px/);
  if (pxMatch) {
    const px = parseFloat(pxMatch[1]);
    return { canonical: `${px}px`, px };
  }

  const remMatch = value.match(/(\d+(?:\.\d+)?)rem/);
  if (remMatch) {
    const px = parseFloat(remMatch[1]) * 16;
    return { canonical: `${px}px`, px };
  }

  const emMatch = value.match(/(\d+(?:\.\d+)?)em/);
  if (emMatch) {
    const px = parseFloat(emMatch[1]) * 16;
    return { canonical: `${px}px`, px };
  }

  return null;
}

function normalizeValue(value: any): NormalizedValue | null {
  const base = {
    type: value.type,
    raw: value.raw,
    file: value.file,
    line: value.line,
    column: value.column,
  };

  if (value.type === 'color') {
    const result = normalizeColor(value.value);
    if (result) {
      return { ...base, canonical: result.canonical, hex: result.hex };
    }
  }

  if (value.type === 'spacing') {
    const result = normalizeSpacing(value.value);
    if (result) {
      return { ...base, canonical: result.canonical, px: result.px };
    }
  }

  if (value.type === 'typography') {
    return { ...base, canonical: value.value };
  }

  return null;
}

export function normalizeAll(values: any[]): NormalizedValue[] {
  return values.map(normalizeValue).filter((v): v is NormalizedValue => v !== null);
}
