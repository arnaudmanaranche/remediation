import * as fs from 'fs';
import * as path from 'path';

export interface ExtractedValue {
  type: 'color' | 'spacing' | 'typography';
  value: string;
  raw: string;
  file: string;
  line: number;
  column: number;
}

const COLOR_PATTERNS = [
  { regex: /['"]?(#[0-9a-fA-F]{3,8})['"]?/g, type: 'hex' as const },
  { regex: /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g, type: 'rgb' as const },
  { regex: /hsla?\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%/g, type: 'hsl' as const },
];

const SPACING_PATTERNS = [
  { regex: /(\d+(?:\.\d+)?)px/g, type: 'px' as const },
  { regex: /(\d+(?:\.\d+)?)rem/g, type: 'rem' as const },
  { regex: /(\d+(?:\.\d+)?)em/g, type: 'em' as const },
];

const TYPOGRAPHY_PROPERTIES = ['font-size', 'fontSize', 'font-weight', 'fontWeight', 'line-height', 'lineHeight'];

export function extractFromFile(filePath: string): ExtractedValue[] {
  const values: ExtractedValue[] = [];

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, lineIndex) => {
      // Extract colors
      for (const { regex, type } of COLOR_PATTERNS) {
        const r = new RegExp(regex.source, regex.flags);
        let match;
        while ((match = r.exec(line)) !== null) {
          let value = match[0];
          if (type === 'hex') value = match[1];
          if (type === 'rgb') value = `rgb(${match[1]}, ${match[2]}, ${match[3]})`;
          if (type === 'hsl') value = `hsl(${match[1]}, ${match[2]}%, ${match[3]}%)`;

          values.push({
            type: 'color',
            value,
            raw: match[0],
            file: filePath,
            line: lineIndex + 1,
            column: match.index + 1,
          });
        }
      }

      // Extract spacing
      const isTypography = TYPOGRAPHY_PROPERTIES.some(prop => line.includes(prop));
      if (!isTypography) {
        for (const { regex } of SPACING_PATTERNS) {
          const r = new RegExp(regex.source, regex.flags);
          let match;
          while ((match = r.exec(line)) !== null) {
            values.push({
              type: 'spacing',
              value: match[0],
              raw: match[0],
              file: filePath,
              line: lineIndex + 1,
              column: match.index + 1,
            });
          }
        }
      }

      // Extract typography
      if (isTypography) {
        const fontSizeMatch = line.match(/(\d+(?:\.\d+)?)(px|rem|em)/);
        if (fontSizeMatch) {
          values.push({
            type: 'typography',
            value: fontSizeMatch[0],
            raw: fontSizeMatch[0],
            file: filePath,
            line: lineIndex + 1,
            column: fontSizeMatch.index! + 1,
          });
        }

        const fontWeightMatch = line.match(/font-weight:\s*(\d+|bold|normal)/);
        if (fontWeightMatch) {
          values.push({
            type: 'typography',
            value: fontWeightMatch[1],
            raw: fontWeightMatch[0],
            file: filePath,
            line: lineIndex + 1,
            column: fontWeightMatch.index! + 1,
          });
        }
      }
    });
  } catch {
    // skip unreadable files
  }

  return values;
}

export function extractFromProject(projectPath: string): ExtractedValue[] {
  const values: ExtractedValue[] = [];

  function traverse(dir: string) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (!entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== 'build') {
            traverse(fullPath);
          }
        } else if (/\.(tsx?|jsx?|css|scss)$/.test(entry.name)) {
          values.push(...extractFromFile(fullPath));
        }
      }
    } catch {
      // skip unreadable dirs
    }
  }

  traverse(projectPath);
  return values;
}
