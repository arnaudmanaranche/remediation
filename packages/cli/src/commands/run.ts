import { Command } from 'commander';
import { scanProject, allRules } from '../core/index';
import { ScanProgress } from '../core/scanner';
import pc from 'picocolors';
import * as fs from 'fs';
import * as path from 'path';
import { version } from '../../package.json';

const program = new Command();

program
  .name('remediation')
  .description('CLI tool that scans React source code and detects design system inconsistencies')
  .version(version);

function createProgress(): ScanProgress {
  const BAR_WIDTH = 24;

  return {
    onFile: (_file: string, current: number, total: number) => {
      const pct = current / total;
      const filled = Math.round(pct * BAR_WIDTH);
      const bar = pc.cyan('█'.repeat(filled)) + pc.dim('░'.repeat(BAR_WIDTH - filled));
      const counter = pc.dim(`${current}/${total}`);
      process.stdout.write(`\r${pc.cyan('⚡')} ${bar}  ${counter}   `);
    },
    onProjectRule: (rule: string) => {
      const blank = ' '.repeat(50);
      process.stdout.write(`\r${pc.cyan('⚡')} ${pc.dim(`Running ${rule}...`)}${blank}`);
    },
  };
}

function printScanComplete(fileCount: number, startTime: number) {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  process.stdout.write('\r' + ' '.repeat(80) + '\r');
  console.log(pc.cyan(`⚡ Scanned ${pc.bold(fileCount.toString())} files in ${pc.bold(elapsed)}s`));
}

function toRelativePath(filePath: string, basePath: string): string {
  const normalizedBase = path.resolve(basePath);
  const normalizedFile = path.resolve(filePath);

  if (normalizedFile.startsWith(normalizedBase)) {
    return path.relative(normalizedBase, normalizedFile);
  }

  return path.relative(process.cwd(), normalizedFile);
}

function filterByRule(result: any, ruleFilter?: string): any {
  if (!ruleFilter) return result;

  const filteredFiles = result.files
    .map((file: any) => ({
      ...file,
      violations: file.violations.filter((v: any) =>
        v.rule.includes(ruleFilter)
      ),
    }))
    .filter((file: any) => file.violations.length > 0);

  const total = filteredFiles.reduce((sum: number, f: any) => sum + f.violations.length, 0);
  const errors = filteredFiles.reduce((sum: number, f: any) =>
    sum + f.violations.filter((v: any) => v.severity === 'error').length, 0);
  const warnings = filteredFiles.reduce((sum: number, f: any) =>
    sum + f.violations.filter((v: any) => v.severity === 'warning').length, 0);
  const infos = filteredFiles.reduce((sum: number, f: any) =>
    sum + f.violations.filter((v: any) => v.severity === 'info').length, 0);

  return {
    ...result,
    files: filteredFiles,
    summary: { total, errors, warnings, infos },
  };
}

function handleOutput(result: any, options: { format?: string; verbose?: boolean; output?: string; rule?: string }, basePath: string) {
  const filtered = filterByRule(result, options.rule);

  if (options.format === 'json') {
    console.log(JSON.stringify(filtered, null, 2));
    return;
  }

  if (options.output) {
    const report = generateReport(filtered, basePath);
    const outputPath = path.resolve(options.output);
    fs.writeFileSync(outputPath, report, 'utf-8');
    console.log(pc.cyan(`📄 Report written to ${pc.bold(outputPath)}`));
    printSummaryCompact(filtered);
    return;
  }

  if (options.verbose) {
    printTerminalVerbose(filtered, basePath);
  } else {
    printTerminalCompact(filtered, basePath);
  }
}

program
  .command('scan')
  .description('Scan codebase for design system violations')
  .option('--format <format>', 'Output format (terminal, json)', 'terminal')
  .option('--verbose', 'Show all violations in terminal', false)
  .option('--output <file>', 'Write report to file')
  .option('--rule <pattern>', 'Filter by rule name (e.g., colors, spacing)')
  .argument('[path]', 'Path to scan', '.')
  .action(async (scanPath, options) => {
    const progress = options.format === 'terminal' ? createProgress() : undefined;
    const startTime = Date.now();

    const result = await scanProject(scanPath, allRules, undefined, progress);

    if (options.format === 'terminal') {
      printScanComplete(result.files.length, startTime);
    }

    handleOutput(result, options, scanPath);
  });

program
  .command('tokens')
  .description('Shorthand for: scan --rule colors/,spacing/,typography/,radius/,shadows/')
  .option('--format <format>', 'Output format (terminal, json)', 'terminal')
  .option('--verbose', 'Show all violations in terminal', false)
  .option('--output <file>', 'Write report to file')
  .argument('[path]', 'Path to scan', '.')
  .action(async (scanPath, options) => {
    const tokenRules = allRules.filter(r =>
      r.name.startsWith('colors/') ||
      r.name.startsWith('spacing/') ||
      r.name.startsWith('typography/') ||
      r.name.startsWith('radius/') ||
      r.name.startsWith('shadows/')
    );

    const progress = options.format === 'terminal' ? createProgress() : undefined;
    const startTime = Date.now();

    const result = await scanProject(scanPath, tokenRules, undefined, progress);

    if (options.format === 'terminal') {
      printScanComplete(result.files.length, startTime);
    }

    handleOutput(result, options, scanPath);
  });

function getSeverityIcon(severity: string): string {
  switch (severity) {
    case 'error': return pc.red('✖');
    case 'warning': return pc.yellow('⚠');
    case 'info': return pc.blue('ℹ');
    default: return '•';
  }
}

function getSeverityColor(severity: string): (text: string) => string {
  switch (severity) {
    case 'error': return pc.red;
    case 'warning': return pc.yellow;
    case 'info': return pc.blue;
    default: return pc.white;
  }
}

function printTerminalVerbose(result: any, basePath: string) {
  if (result.files.length === 0) {
    console.log(pc.green('✓ No violations found'));
    return;
  }

  for (const file of result.files) {
    const relativePath = toRelativePath(file.path, basePath);
    console.log(pc.bold(`\n${relativePath}`));
    for (const violation of file.violations) {
      const icon = getSeverityIcon(violation.severity);
      const color = getSeverityColor(violation.severity);
      const line = pc.dim(`L${violation.line}:${violation.column}`);

      console.log(`  ${icon} ${color(violation.severity.toUpperCase().padEnd(7))} ${line} ${violation.message}`);
      if (violation.suggestion) {
        console.log(`         ${pc.dim(violation.suggestion)}`);
      }
    }
  }

  printSummary(result);
  const { current, potential } = calculateHealthScore(result);
  printHealthScore(current, potential);
}

function printTerminalCompact(result: any, basePath: string) {
  if (result.files.length === 0) {
    console.log(pc.green('✓ No violations found'));
    return;
  }

  // Group violations by rule
  const byRule = new Map<string, { count: number; files: Set<string>; severity: string }>();
  for (const file of result.files) {
    for (const v of file.violations) {
      const entry = byRule.get(v.rule) ?? { count: 0, files: new Set(), severity: v.severity };
      entry.count++;
      entry.files.add(file.path);
      // escalate severity: error > warning > info
      if (v.severity === 'error') entry.severity = 'error';
      else if (v.severity === 'warning' && entry.severity !== 'error') entry.severity = 'warning';
      byRule.set(v.rule, entry);
    }
  }

  const sortedRules = [...byRule.entries()].sort((a, b) => b[1].count - a[1].count);
  const maxCount = sortedRules[0][1].count;
  const BAR_WIDTH = 16;

  console.log(pc.bold('\nViolations by rule:'));
  for (const [rule, { count, files, severity }] of sortedRules) {
    const filled = Math.max(1, Math.round((count / maxCount) * BAR_WIDTH));
    const empty = BAR_WIDTH - filled;
    const colorFn = severity === 'error' ? pc.red : severity === 'warning' ? pc.yellow : pc.blue;
    const bar = colorFn('█'.repeat(filled)) + pc.dim('░'.repeat(empty));
    const countStr = count.toString().padStart(4);
    const fileStr = pc.dim(`${files.size} file${files.size > 1 ? 's' : ''}`);
    console.log(`  ${pc.bold(rule.padEnd(28))} ${colorFn(countStr)}  ${bar}  ${fileStr}`);
  }

  // Top affected files (capped at 5)
  const TOP_N = 5;
  const sortedFiles = [...result.files].sort((a: any, b: any) => b.violations.length - a.violations.length);

  console.log(pc.bold('\nTop affected files:'));
  for (const file of sortedFiles.slice(0, TOP_N)) {
    const relativePath = toRelativePath(file.path, basePath);
    const count = file.violations.length;
    const errors = file.violations.filter((v: any) => v.severity === 'error').length;
    const colorFn = errors > 0 ? pc.red : pc.yellow;
    console.log(`  ${colorFn(count.toString().padStart(3))}  ${pc.dim(relativePath)}`);
  }
  if (sortedFiles.length > TOP_N) {
    console.log(`  ${pc.dim(`... and ${sortedFiles.length - TOP_N} more files`)}`);
  }
  console.log(pc.dim(`\n  Run with ${pc.bold('--verbose')} to see all violations, ${pc.bold('--rule <name>')} to filter by rule.`));

  printSummary(result);
  const { current, potential } = calculateHealthScore(result);
  printHealthScore(current, potential);
}

function printSummaryCompact(result: any) {
  const { errors, warnings, infos, total } = result.summary;
  console.log(pc.bold('\n┌─ Summary ─────────────────────────────┐'));

  if (errors > 0) {
    console.log(`│  ${pc.red('✖')} ${pc.red(errors.toString().padStart(3))} errors    ${getProgressBar(errors, total, 'red')}`);
  }
  if (warnings > 0) {
    console.log(`│  ${pc.yellow('⚠')} ${pc.yellow(warnings.toString().padStart(3))} warnings  ${getProgressBar(warnings, total, 'yellow')}`);
  }
  if (infos > 0) {
    console.log(`│  ${pc.blue('ℹ')} ${pc.blue(infos.toString().padStart(3))} infos     ${getProgressBar(infos, total, 'blue')}`);
  }

  console.log(`│  ${pc.dim('─'.repeat(36))}`);
  console.log(`│  ${pc.bold(total.toString().padStart(3))} total violations`);
  console.log(`│  ${pc.dim(result.files.length.toString().padStart(3))} files affected`);
  console.log(pc.bold('└────────────────────────────────────────┘'));
}

function printSummary(result: any) {
  const { errors, warnings, infos, total } = result.summary;

  console.log(pc.bold('\n┌─ Summary ─────────────────────────────┐'));

  if (errors > 0) {
    console.log(`│  ${pc.red('✖')} ${pc.red(errors.toString().padStart(3))} errors    ${getProgressBar(errors, total, 'red')}`);
  }
  if (warnings > 0) {
    console.log(`│  ${pc.yellow('⚠')} ${pc.yellow(warnings.toString().padStart(3))} warnings  ${getProgressBar(warnings, total, 'yellow')}`);
  }
  if (infos > 0) {
    console.log(`│  ${pc.blue('ℹ')} ${pc.blue(infos.toString().padStart(3))} infos     ${getProgressBar(infos, total, 'blue')}`);
  }

  console.log(`│  ${pc.dim('─'.repeat(36))}`);
  console.log(`│  ${pc.bold(total.toString().padStart(3))} total violations`);
  console.log(`│  ${pc.dim(result.files.length.toString().padStart(3))} files affected`);
  console.log(pc.bold('└────────────────────────────────────────┘'));
}

function getProgressBar(value: number, total: number, color: 'red' | 'yellow' | 'blue'): string {
  const width = 15;
  const filled = Math.round((value / total) * width);
  const empty = width - filled;
  const colorFn = pc[color];

  return colorFn('█'.repeat(filled)) + pc.dim('░'.repeat(empty));
}

function calculateHealthScore(result: any): { current: number; potential: number } {
  const { errors, warnings, infos } = result.summary;

  const raw = (errors * 10) + (warnings * 2) + (infos * 0.5);
  const risk = Math.min(Math.round(Math.log(raw + 1) * 15), 100);
  const current = Math.max(0, 100 - risk);

  // Potential assumes ~70% of violations are fixable
  const fixableRaw = (errors * 10) + (warnings * 1.5) + (infos * 0.3);
  const potentialRisk = Math.min(Math.round(Math.log(fixableRaw * 0.3 + 1) * 15), 100);
  const potential = Math.max(current, Math.max(0, 100 - potentialRisk));

  return { current, potential };
}

function printHealthScore(score: number, potentialScore?: number) {
  const width = 30;
  const filled = Math.round((score / 100) * width);
  const empty = width - filled;

  let color: 'green' | 'yellow' | 'red';
  if (score >= 70) color = 'green';
  else if (score >= 40) color = 'yellow';
  else color = 'red';

  console.log(pc.bold('\n┌─ Health Score ─────────────────────────┐'));
  console.log(`│  ${pc[color]('█'.repeat(filled))}${pc.dim('░'.repeat(empty))}  ${pc.bold(score.toString())}/100`);
  console.log(`│  ${pc.dim(getHealthLabel(score))}`);

  if (potentialScore !== undefined && potentialScore > score) {
    const potentialFilled = Math.round((potentialScore / 100) * width);
    const potentialEmpty = width - potentialFilled;
    console.log(`│`);
    console.log(`│  ${pc.green('█'.repeat(potentialFilled))}${pc.dim('░'.repeat(potentialEmpty))}  ${pc.bold(potentialScore.toString())}/100`);
    console.log(`│  ${pc.dim('Potential after fixes')}`);
  }

  console.log(pc.bold('└────────────────────────────────────────┘'));
}

function getHealthLabel(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 40) return 'Needs work';
  if (score >= 20) return 'Poor';
  return 'Critical';
}

function generateReport(result: any, basePath: string): string {
  const lines: string[] = [];

  lines.push('╔══════════════════════════════════════════════════════════════╗');
  lines.push('║                    REMEDIATION REPORT                       ║');
  lines.push('╚══════════════════════════════════════════════════════════════╝');
  lines.push('');

  if (result.files.length === 0) {
    lines.push('✓ No violations found');
    return lines.join('\n');
  }

  for (const file of result.files) {
    const relativePath = toRelativePath(file.path, basePath);
    lines.push(`📁 ${relativePath}`);
    lines.push('─'.repeat(60));

    for (const violation of file.violations) {
      const icon = violation.severity === 'error' ? '✖' : violation.severity === 'warning' ? '⚠' : 'ℹ';
      lines.push(`  ${icon} ${violation.severity.toUpperCase().padEnd(7)} L${violation.line}:${violation.column} ${violation.message}`);
      if (violation.suggestion) {
        lines.push(`         → ${violation.suggestion}`);
      }
    }

    lines.push('');
  }

  lines.push('═'.repeat(60));
  lines.push('SUMMARY');
  lines.push('═'.repeat(60));
  lines.push('');

  const { errors, warnings, infos, total } = result.summary;

  if (errors > 0) lines.push(`  ✖ ${errors} error${errors > 1 ? 's' : ''}`);
  if (warnings > 0) lines.push(`  ⚠ ${warnings} warning${warnings > 1 ? 's' : ''}`);
  if (infos > 0) lines.push(`  ℹ ${infos} info${infos > 1 ? 's' : ''}`);
  lines.push(`  ─────────────────`);
  lines.push(`  ${total} total violations`);
  lines.push(`  ${result.files.length} files affected`);
  lines.push('');

  lines.push('HEALTH SCORE');
  lines.push('─'.repeat(60));

  const { current, potential } = calculateHealthScore(result);
  const width = 40;
  const filled = Math.round((current / 100) * width);
  const empty = width - filled;

  lines.push(`  ${'█'.repeat(filled)}${'░'.repeat(empty)}  ${current}/100`);
  lines.push(`  ${getHealthLabel(current)}`);

  if (potential > current) {
    const potentialFilled = Math.round((potential / 100) * width);
    const potentialEmpty = width - potentialFilled;
    lines.push('');
    lines.push(`  ${'█'.repeat(potentialFilled)}${'░'.repeat(potentialEmpty)}  ${potential}/100`);
    lines.push(`  Potential after fixes`);
  }

  return lines.join('\n');
}

export { program };
