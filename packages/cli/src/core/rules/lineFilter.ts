export interface ProcessedLine {
  content: string;
  index: number;
}

/**
 * Returns only lines that can realistically contain hardcoded style values,
 * filtering out comments and import statements to reduce false positives.
 */
export function getStyleLines(fileContent: string): ProcessedLine[] {
  const raw = fileContent.split('\n');
  const result: ProcessedLine[] = [];
  let inBlockComment = false;

  for (let i = 0; i < raw.length; i++) {
    const line = raw[i];
    const trimmed = line.trim();

    if (inBlockComment) {
      if (trimmed.includes('*/')) {
        inBlockComment = false;
      }
      continue;
    }

    if (trimmed.startsWith('/*')) {
      if (!trimmed.includes('*/')) {
        inBlockComment = true;
      }
      continue;
    }

    if (trimmed.startsWith('//')) continue;
    if (/^import\s/.test(trimmed)) continue;
    if (/^export\s*\{/.test(trimmed)) continue;

    result.push({ content: line, index: i });
  }

  return result;
}
