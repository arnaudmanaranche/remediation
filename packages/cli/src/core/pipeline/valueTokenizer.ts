// Individual color/length tokens inside a (possibly compound) CSS value string.
// Shared by the codemod (rewriting sub-values) and the analyze extractor
// (splitting compound rawValues into classifiable sub-values).
const VALUE_TOKEN_REGEX = /#[0-9a-fA-F]{3,8}|rgba?\([^)]*\)|hsla?\([^)]*\)|\d+(?:\.\d+)?(?:px|rem|em)/g;

export interface ValueToken {
  start: number;
  end: number;
  text: string;
}

export function splitValueTokens(raw: string): ValueToken[] {
  const tokens: ValueToken[] = [];
  const re = new RegExp(VALUE_TOKEN_REGEX.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    tokens.push({ start: m.index, end: m.index + m[0].length, text: m[0] });
  }
  return tokens;
}
