import * as fs from 'fs';
import { NormalizedValue } from './normalizer';
import { TokenProposal } from './decision';

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
}

function generateTokenReference(tokenName: string, type: string): string {
  if (type === 'color') {
    return `colors.${tokenName}`;
  }
  if (type === 'spacing') {
    return `spacing.${tokenName}`;
  }
  return tokenName;
}

function findFileChanges(
  file: string,
  content: string,
  proposals: TokenProposal[]
): CodemodChange[] {
  const changes: CodemodChange[] = [];
  const lines = content.split('\n');

  for (const proposal of proposals) {
    for (const value of proposal.cluster.values) {
      if (value.file !== file) continue;

      const lineIndex = value.line - 1;
      if (lineIndex >= lines.length) continue;

      const line = lines[lineIndex];
      // Prefer the config-declared reference; otherwise derive one from type.
      const tokenRef = proposal.tokenRef ?? generateTokenReference(proposal.tokenName, proposal.cluster.type);

      // Check if the value exists in this line
      const patterns = [
        value.raw,
        value.canonical,
        value.hex,
        `${value.px}px`,
      ].filter(Boolean);

      for (const pattern of patterns) {
        if (!pattern) continue;

        const columnIndex = line.indexOf(pattern);
        if (columnIndex !== -1) {
          changes.push({
            file,
            line: value.line,
            column: columnIndex + 1,
            oldValue: pattern,
            newValue: tokenRef,
            tokenName: proposal.tokenName,
          });
          break;
        }
      }
    }
  }

  return changes;
}

export function applyCodemod(
  projectPath: string,
  proposals: TokenProposal[],
  dryRun: boolean = true
): CodemodResult {
  const allChanges: CodemodChange[] = [];
  const filesModified = new Set<string>();

  const files = new Set(proposals.flatMap(p => p.cluster.values.map(v => v.file)));

  for (const file of files) {
    if (!fs.existsSync(file)) continue;

    const content = fs.readFileSync(file, 'utf-8');
    const changes = findFileChanges(file, content, proposals);
    allChanges.push(...changes);

    if (!dryRun && changes.length > 0) {
      let modifiedContent = content;

      // Sort changes by position (reverse order to maintain indices)
      const sortedChanges = [...changes].sort((a, b) => {
        if (b.line !== a.line) return b.line - a.line;
        return b.column - a.column;
      });

      for (const change of sortedChanges) {
        const lines = modifiedContent.split('\n');
        const lineIndex = change.line - 1;

        if (lineIndex < lines.length) {
          lines[lineIndex] = lines[lineIndex].replace(change.oldValue, change.newValue);
          modifiedContent = lines.join('\n');
        }
      }

      fs.writeFileSync(file, modifiedContent, 'utf-8');
      filesModified.add(file);
    }
  }

  return {
    changes: allChanges,
    filesModified: [...filesModified],
    dryRun,
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
