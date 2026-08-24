import * as fs from 'fs';
import * as parser from '@babel/parser';
import { TokenProposal } from './decision';
import { toCanonical } from './normalizer';
import { splitValueTokens } from './valueTokenizer';
import { ALL_STYLE_PROPS, TYPOGRAPHY_PROPS } from '../ast/cssProperties';
import { loadConfig } from '../config';

export interface CodemodChange {
  file: string;
  line: number;
  column: number;
  oldValue: string;
  newValue: string;
  tokenName: string;
}

export interface CodemodResult {
  changes: CodemodChange[];
  filesModified: string[];
  dryRun: boolean;
  // Files that were edited but where the token import could not be injected
  // (no `tokensImport` configured, or an import from it already exists).
  warnings: string[];
}

type AstNode = {
  type: string;
  start?: number;
  end?: number;
  loc?: { start: { line: number; column: number } };
  [key: string]: unknown;
};

const PARSER_OPTIONS: parser.ParserOptions = {
  sourceType: 'module',
  plugins: ['jsx', 'typescript', 'decorators-legacy'],
  errorRecovery: true,
  strictMode: false,
};

function walk(node: AstNode | null | undefined, visit: (n: AstNode) => void): void {
  if (!node || typeof node !== 'object') return;
  visit(node);
  for (const val of Object.values(node)) {
    if (Array.isArray(val)) {
      for (const child of val) {
        if (child && typeof child === 'object' && 'type' in child) {
          walk(child as AstNode, visit);
        }
      }
    } else if (val && typeof val === 'object' && 'type' in val) {
      walk(val as AstNode, visit);
    }
  }
}

function getPropertyName(key: AstNode): string | null {
  if (key.type === 'Identifier') return key.name as string;
  if (key.type === 'StringLiteral') return key.value as string;
  return null;
}

// The literal string carried by a StringLiteral or single-quasi TemplateLiteral.
function getLiteralString(value: AstNode): string | null {
  if (value.type === 'StringLiteral') return value.value as string;
  if (value.type === 'TemplateLiteral') {
    const quasis = value.quasis as AstNode[];
    const exprs = value.expressions as unknown[];
    if (quasis.length === 1 && exprs.length === 0) {
      return (quasis[0].value as { cooked?: string }).cooked ?? null;
    }
  }
  return null;
}

function generateTokenReference(tokenName: string, type: string): string {
  if (type === 'color') return `colors.${tokenName}`;
  if (type === 'spacing') return `spacing.${tokenName}`;
  if (type === 'typography') return `typography.${tokenName}`;
  return tokenName;
}

interface Lookups {
  // color/spacing tokens, matched as sub-values inside CSS strings.
  value: Map<string, string>;
  // typography tokens, matched as the whole value of a typography property.
  typography: Map<string, string>;
}

// canonical value (e.g. '#2563eb', '8px', '14px') -> full token reference.
// Every member of a cluster maps to the cluster's token, so near values that
// were snapped together during clustering (e.g. 6px into an 8px cluster) are
// all rewritten to the same token. Typography lives in its own map so a size
// like '14px' never collides with a spacing '14px'.
function buildLookups(proposals: TokenProposal[]): Lookups {
  const value = new Map<string, string>();
  const typography = new Map<string, string>();

  for (const p of proposals) {
    const ref = p.tokenRef ?? generateTokenReference(p.tokenName, p.cluster.type);
    const target = p.cluster.type === 'typography' ? typography : value;
    target.set(p.cluster.canonical, ref);
    for (const v of p.cluster.values) {
      target.set(v.canonical, ref);
    }
  }

  return { value, typography };
}

// Individual color/length tokens inside a (possibly compound) CSS value string
// are located with the shared tokenizer (`valueTokenizer.ts`), also used by the
// analyze extractor so extraction and rewriting stay in lockstep.

interface BuiltExpression {
  expr: string;
  refs: string[]; // full references used, e.g. ['colors.primary']
}

// A translucent color (rgba()/hsla() with alpha < 1) can't be represented by an
// opaque token — rewriting it would silently change the rendered output (e.g.
// a 12%-black shadow becoming solid black), so those sub-values are left as-is.
function isTransparentColor(token: string): boolean {
  const m = token.trim().match(/^(?:rgba|hsla)\(([^)]*)\)$/i);
  if (!m) return false;
  const parts = m[1].split(/[,\s/]+/).filter(Boolean);
  const alpha = parts[parts.length - 1];
  if (!alpha) return false;
  if (alpha.endsWith('%')) return alpha !== '100%';
  return parseFloat(alpha) !== 1;
}

// Turn a raw CSS value string into a JS expression that swaps every matched
// sub-value for its token reference. A value that is *entirely* one token
// becomes a bare reference; a compound value becomes a template literal so the
// surrounding text (e.g. "solid", "0 1px 3px") is preserved.
function buildExpression(raw: string, lookup: Map<string, string>): BuiltExpression | null {
  const matches: { start: number; end: number; ref: string }[] = [];
  for (const tok of splitValueTokens(raw)) {
    if (isTransparentColor(tok.text)) continue;
    const canon = toCanonical(tok.text);
    if (!canon) continue;
    const ref = lookup.get(canon.canonical);
    if (!ref) continue;
    matches.push({ start: tok.start, end: tok.end, ref });
  }

  if (matches.length === 0) return null;

  const refs = matches.map((mm) => mm.ref);

  // Whole string is exactly one token → emit the bare reference.
  if (matches.length === 1 && matches[0].start === 0 && matches[0].end === raw.length) {
    return { expr: matches[0].ref, refs };
  }

  // Compound value → template literal preserving the literal gaps.
  let out = '';
  let cursor = 0;
  for (const mm of matches) {
    out += raw.slice(cursor, mm.start);
    out += `\${${mm.ref}}`;
    cursor = mm.end;
  }
  out += raw.slice(cursor);
  return { expr: '`' + out + '`', refs };
}

interface Edit {
  start: number;
  end: number;
  text: string;
}

interface FileWork {
  edits: Edit[];
  changes: CodemodChange[];
  roots: Set<string>; // token roots used, e.g. 'colors', 'spacing'
  importInsertPos: number;
  importInsertPrefix: string;
  importInsertSuffix: string;
}

// Find the offset just after the last top-level import so a new import can be
// inserted there (falls back to the top of the file).
function importAnchor(ast: AstNode): { pos: number; leadingNewline: boolean } {
  const body = (ast as any).program?.body as AstNode[] | undefined;
  if (!body) return { pos: 0, leadingNewline: false };
  let lastEnd = -1;
  for (const stmt of body) {
    if (stmt.type === 'ImportDeclaration' && typeof stmt.end === 'number') {
      lastEnd = Math.max(lastEnd, stmt.end);
    }
  }
  if (lastEnd >= 0) return { pos: lastEnd, leadingNewline: true };
  return { pos: 0, leadingNewline: false };
}

// Mirrors the styled/css detection in ast/extractor.ts so the codemod rewrites
// exactly what the scan-side extractor reads.
const STYLED_IDENTIFIER_TAGS = new Set(['css', 'injectGlobal', 'createGlobalStyle']);

function isStyledTag(tag: AstNode): boolean {
  return (
    tag.type === 'MemberExpression' ||
    tag.type === 'CallExpression' ||
    (tag.type === 'Identifier' && STYLED_IDENTIFIER_TAGS.has(tag.name as string))
  );
}

function collectFileWork(content: string, lookups: Lookups): FileWork | null {
  let ast: AstNode;
  try {
    ast = parser.parse(content, PARSER_OPTIONS) as unknown as AstNode;
  } catch {
    return null;
  }

  const edits: Edit[] = [];
  const changes: CodemodChange[] = [];
  const roots = new Set<string>();

  // Record an offset edit inside a tagged-template quasi, turning `oldText`
  // into `${ref}`. Offsets are absolute in the file.
  const recordSubValue = (
    absStart: number,
    absEnd: number,
    oldText: string,
    line: number,
    column: number,
    ref: string
  ) => {
    edits.push({ start: absStart, end: absEnd, text: `\${${ref}}` });
    roots.add(ref.split('.')[0]);
    changes.push({
      file: '', // filled in by caller
      line,
      column,
      oldValue: oldText,
      newValue: `\${${ref}}`,
      tokenName: ref,
    });
  };

  const record = (value: AstNode, expr: string, refs: string[]) => {
    edits.push({ start: value.start!, end: value.end!, text: expr });
    for (const ref of refs) roots.add(ref.split('.')[0]);
    changes.push({
      file: '', // filled in by caller
      line: value.loc?.start.line ?? 0,
      column: (value.loc?.start.column ?? 0) + 1,
      oldValue: content.slice(value.start, value.end),
      newValue: expr,
      tokenName: refs.join(', '),
    });
  };

  // Rewrite tokenizable sub-values inside one tagged-template quasi
  // (styled.div`...`, css`...`). Declaration scanning mirrors the scan-side
  // extractFromTemplateLiteral so the codemod rewrites exactly what was
  // extracted. Quasis never contain ${...} expression text (those are separate
  // AST nodes), so absolute offsets computed from quasi.start cannot overlap
  // existing interpolations — but a declaration may be *split* across quasis
  // by one ("color: ${x}; padding: 8px;"), hence the unanchored global scan.
  const DECL_REGEX = /(^|[\s;{])([\w-]+)\s*:\s*([^;{}\n]+)/g;

  const lineAt = (text: string, offset: number) =>
    text.slice(0, offset).split('\n').length;

  const processQuasi = (quasi: AstNode) => {
    const cooked = (quasi.value as { cooked?: string } | undefined)?.cooked;
    if (typeof cooked !== 'string' || typeof quasi.start !== 'number') return;

    const baseLoc = quasi.loc?.start;
    const abs = (offsetInCooked: number) => quasi.start! + offsetInCooked;
    const columnOf = (offsetInCooked: number): number => {
      if (!baseLoc) return offsetInCooked + 1;
      const lastNewline = cooked.lastIndexOf('\n', offsetInCooked - 1);
      return lastNewline === -1
        ? baseLoc.column + offsetInCooked + 1
        : offsetInCooked - lastNewline;
    };

    const re = new RegExp(DECL_REGEX.source, 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(cooked)) !== null) {
      const rawProp = m[2];
      const propName = rawProp.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
      if (!ALL_STYLE_PROPS.has(propName)) continue;

      const valueRaw = m[3];
      const v = valueRaw.trim();
      if (!v) continue;
      // The value group always runs to the end of the match.
      const vOffset = m.index + m[0].length - valueRaw.length;
      const trimLead = valueRaw.length - valueRaw.trimStart().length;
      const vTrimOffset = vOffset + trimLead;

      // Typography declarations are whole-value tokens.
      if (TYPOGRAPHY_PROPS.has(propName)) {
        const ref = lookups.typography.get(v);
        if (!ref) continue;
        recordSubValue(abs(vTrimOffset), abs(vTrimOffset + v.length), v, lineAt(cooked, vTrimOffset), columnOf(vTrimOffset), ref);
        continue;
      }

      for (const tok of splitValueTokens(v)) {
        if (isTransparentColor(tok.text)) continue;
        const canon = toCanonical(tok.text);
        if (!canon) continue;
        const ref = lookups.value.get(canon.canonical);
        if (!ref) continue;
        recordSubValue(
          abs(vTrimOffset + tok.start),
          abs(vTrimOffset + tok.end),
          tok.text,
          lineAt(cooked, vTrimOffset + tok.start),
          columnOf(vTrimOffset + tok.start),
          ref
        );
      }
    }
  };

  walk(ast, (node) => {
    // --- Tagged templates: styled.div`color: #fff;` / css`...` ---
    if (node.type === 'TaggedTemplateExpression') {
      if (!isStyledTag(node.tag as AstNode)) return;
      const quasis = ((node.quasi as AstNode).quasis as AstNode[]) || [];
      for (const q of quasis) processQuasi(q);
      return;
    }

    if (node.type !== 'ObjectProperty') return;
    const key = node.key as AstNode;
    const value = node.value as AstNode;
    const propName = getPropertyName(key);
    if (!propName || !ALL_STYLE_PROPS.has(propName)) return;
    if (typeof value.start !== 'number' || typeof value.end !== 'number') return;

    // Typography values are whole tokens (a font size like '14px' or a numeric
    // weight like 600) — match the entire value against the typography map.
    if (TYPOGRAPHY_PROPS.has(propName)) {
      const rawTypo =
        value.type === 'NumericLiteral' ? String(value.value) : getLiteralString(value);
      if (rawTypo === null) return;
      const ref = lookups.typography.get(rawTypo);
      if (!ref) return;
      record(value, ref, [ref]);
      return;
    }

    const raw = getLiteralString(value);
    if (raw === null) return;

    const built = buildExpression(raw, lookups.value);
    if (!built) return;

    record(value, built.expr, built.refs);
  });

  if (edits.length === 0) return null;

  const anchor = importAnchor(ast);
  return {
    edits,
    changes,
    roots,
    importInsertPos: anchor.pos,
    importInsertPrefix: anchor.leadingNewline ? '\n' : '',
    importInsertSuffix: anchor.leadingNewline ? '' : '\n',
  };
}

function applyEdits(content: string, edits: Edit[]): string {
  // Apply from the end so earlier offsets stay valid.
  const sorted = [...edits].sort((a, b) => b.start - a.start);
  let out = content;
  for (const e of sorted) {
    out = out.slice(0, e.start) + e.text + out.slice(e.end);
  }
  return out;
}

function importAlreadyPresent(content: string, tokensImport: string): boolean {
  const escaped = tokensImport.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`from\\s+['"]${escaped}['"]`).test(content);
}

export function applyCodemod(
  projectPath: string,
  proposals: TokenProposal[],
  dryRun: boolean = true
): CodemodResult {
  const config = loadConfig(projectPath);
  const tokensImport = config.tokensImport;
  const lookups = buildLookups(proposals);

  const allChanges: CodemodChange[] = [];
  const filesModified = new Set<string>();
  const warnings: string[] = [];

  const files = new Set(proposals.flatMap((p) => p.cluster.values.map((v) => v.file)));

  for (const file of files) {
    if (!fs.existsSync(file)) continue;

    const content = fs.readFileSync(file, 'utf-8');
    const work = collectFileWork(content, lookups);
    if (!work) continue;

    for (const c of work.changes) c.file = file;
    allChanges.push(...work.changes);

    if (dryRun) continue;

    const edits = [...work.edits];
    const roots = [...work.roots].sort();

    if (tokensImport) {
      if (importAlreadyPresent(content, tokensImport)) {
        warnings.push(
          `${file}: an import from '${tokensImport}' already exists — ensure it includes: ${roots.join(', ')}`
        );
      } else {
        const importLine = `import { ${roots.join(', ')} } from '${tokensImport}';`;
        edits.push({
          start: work.importInsertPos,
          end: work.importInsertPos,
          text: work.importInsertPrefix + importLine + work.importInsertSuffix,
        });
      }
    } else {
      warnings.push(`${file}: add \`import { ${roots.join(', ')} } from '<your tokens module>'\``);
    }

    fs.writeFileSync(file, applyEdits(content, edits), 'utf-8');
    filesModified.add(file);
  }

  return {
    changes: allChanges,
    filesModified: [...filesModified],
    dryRun,
    warnings,
  };
}

export function generateCodemodPreview(changes: CodemodChange[]): string {
  const lines: string[] = [];

  lines.push('Codemod Preview');
  lines.push('═'.repeat(60));
  lines.push('');

  const byFile = new Map<string, CodemodChange[]>();
  for (const change of changes) {
    const existing = byFile.get(change.file) || [];
    existing.push(change);
    byFile.set(change.file, existing);
  }

  for (const [file, fileChanges] of byFile) {
    lines.push(`📄 ${file}`);
    lines.push('─'.repeat(60));

    for (const change of fileChanges) {
      lines.push(`  L${change.line}:${change.column}  ${change.oldValue} → ${change.newValue}`);
    }

    lines.push('');
  }

  lines.push('═'.repeat(60));
  lines.push(`Total: ${changes.length} changes in ${byFile.size} files`);

  return lines.join('\n');
}
