import * as fs from 'fs';
import * as parser from '@babel/parser';
import { TokenProposal } from './decision';
import { toCanonical } from './normalizer';
import { ALL_STYLE_PROPS } from '../ast/cssProperties';
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
  return tokenName;
}

// canonical value (e.g. '#2563eb', '8px') -> full token reference to emit.
// Every member of a cluster maps to the cluster's token, so near values that
// were snapped together during clustering (e.g. 6px into an 8px cluster) are
// all rewritten to the same token.
function buildLookup(proposals: TokenProposal[]): Map<string, string> {
  const lookup = new Map<string, string>();
  for (const p of proposals) {
    const ref = p.tokenRef ?? generateTokenReference(p.tokenName, p.cluster.type);
    lookup.set(p.cluster.canonical, ref);
    for (const value of p.cluster.values) {
      lookup.set(value.canonical, ref);
    }
  }
  return lookup;
}

// Individual color/length tokens inside a (possibly compound) CSS value string.
const VALUE_TOKEN_REGEX = /#[0-9a-fA-F]{3,8}|rgba?\([^)]*\)|hsla?\([^)]*\)|\d+(?:\.\d+)?(?:px|rem|em)/g;

interface BuiltExpression {
  expr: string;
  refs: string[]; // full references used, e.g. ['colors.primary']
}

// Turn a raw CSS value string into a JS expression that swaps every matched
// sub-value for its token reference. A value that is *entirely* one token
// becomes a bare reference; a compound value becomes a template literal so the
// surrounding text (e.g. "solid", "0 1px 3px") is preserved.
function buildExpression(raw: string, lookup: Map<string, string>): BuiltExpression | null {
  const matches: { start: number; end: number; ref: string }[] = [];
  const re = new RegExp(VALUE_TOKEN_REGEX.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    const canon = toCanonical(m[0]);
    if (!canon) continue;
    const ref = lookup.get(canon.canonical);
    if (!ref) continue;
    matches.push({ start: m.index, end: m.index + m[0].length, ref });
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

function collectFileWork(content: string, lookup: Map<string, string>): FileWork | null {
  let ast: AstNode;
  try {
    ast = parser.parse(content, PARSER_OPTIONS) as unknown as AstNode;
  } catch {
    return null;
  }

  const edits: Edit[] = [];
  const changes: CodemodChange[] = [];
  const roots = new Set<string>();

  walk(ast, (node) => {
    if (node.type !== 'ObjectProperty') return;
    const key = node.key as AstNode;
    const value = node.value as AstNode;
    const propName = getPropertyName(key);
    if (!propName || !ALL_STYLE_PROPS.has(propName)) return;
    if (typeof value.start !== 'number' || typeof value.end !== 'number') return;

    const raw = getLiteralString(value);
    if (raw === null) return;

    const built = buildExpression(raw, lookup);
    if (!built) return;

    edits.push({ start: value.start, end: value.end, text: built.expr });
    for (const ref of built.refs) roots.add(ref.split('.')[0]);

    changes.push({
      file: '', // filled in by caller
      line: value.loc?.start.line ?? 0,
      column: (value.loc?.start.column ?? 0) + 1,
      oldValue: content.slice(value.start, value.end),
      newValue: built.expr,
      tokenName: built.refs.join(', '),
    });
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
  const lookup = buildLookup(proposals);

  const allChanges: CodemodChange[] = [];
  const filesModified = new Set<string>();
  const warnings: string[] = [];

  const files = new Set(proposals.flatMap((p) => p.cluster.values.map((v) => v.file)));

  for (const file of files) {
    if (!fs.existsSync(file)) continue;

    const content = fs.readFileSync(file, 'utf-8');
    const work = collectFileWork(content, lookup);
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
