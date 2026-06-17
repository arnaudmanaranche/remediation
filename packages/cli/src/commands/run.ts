import { Command } from 'commander';
import { scanDirectory, scanProject, allRules, getTransformsMap, componentRules, applyTransforms } from '../core/index';
import { ScanProgress } from '../core/scanner';
import pc from 'picocolors';
import * as fs from 'fs';
import * as path from 'path';

const program = new Command();

program
  .name('remediation')
  .description('CLI tool that scans React source code and detects design system inconsistencies')
  .version('0.0.1');

function createProgress(): ScanProgress {
  let startTime = Date.now();
  let fileCount = 0;

  return {
    onFile: (file: string, current: number, total: number) => {
      if (current === 1) {
        startTime = Date.now();
        process.stdout.write(pc.cyan('⚡ Scanning...'));
      }
      fileCount = current;

      if (current % 50 === 0 || current === total) {
        process.stdout.write(pc.dim(` ${current}/${total}`));
      }
    },
    onProjectRule: (rule: string) => {
      process.stdout.write(pc.dim(` [${rule}]`));
    },
  };
}

function printScanComplete(fileCount: number, startTime: number) {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  process.stdout.write('\r' + ' '.repeat(80) + '\r');
  console.log(pc.cyan(`⚡ Scanned ${pc.bold(fileCount.toString())} files in ${pc.bold(elapsed)}s`));
}

function handleOutput(result: any, options: { format?: string; verbose?: boolean; output?: string }) {
  if (options.format === 'json') {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (options.output) {
    const report = generateReport(result);
    const outputPath = path.resolve(options.output);
    fs.writeFileSync(outputPath, report, 'utf-8');
    console.log(pc.cyan(`📄 Report written to ${pc.bold(outputPath)}`));
    printSummaryCompact(result);
    return;
  }

  if (options.verbose) {
    printTerminalVerbose(result);
  } else {
    printTerminalCompact(result);
  }
}

program
  .command('scan')
  .description('Run all rules (tokens + components)')
  .option('--dry-run', 'Preview mode, do not apply fixes', false)
  .option('--format <format>', 'Output format (terminal, json)', 'terminal')
  .option('--verbose', 'Show all violations in terminal', false)
  .option('--output <file>', 'Write report to file')
  .argument('[path]', 'Path to scan', '.')
  .action(async (path, options) => {
    const progress = options.format === 'terminal' ? createProgress() : undefined;
    const startTime = Date.now();

    const result = await scanProject(path, allRules, undefined, progress);

    if (options.format === 'terminal') {
      printScanComplete(result.files.length, startTime);
    }

    handleOutput(result, options);

    if (!options.dryRun && result.summary.total > 0) {
      console.log('\nApplying fixes...');
      const transforms = getTransformsMap();
      const fixes = applyTransforms(
        result.files.flatMap(f => f.violations),
        transforms
      );

      if (fixes.length > 0) {
        console.log(pc.green(`Fixed ${fixes.length} files`));
      } else {
        console.log(pc.yellow('No automatic fixes available'));
      }
    }
  });

program
  .command('tokens')
  .description('Check for token inconsistencies')
  .option('--dry-run', 'Preview mode, do not apply fixes', false)
  .option('--format <format>', 'Output format (terminal, json)', 'terminal')
  .option('--verbose', 'Show all violations in terminal', false)
  .option('--output <file>', 'Write report to file')
  .argument('[path]', 'Path to scan', '.')
  .action(async (path, options) => {
    const tokenRules = allRules.filter(r => 
      r.name.includes('colors/') || 
      r.name.includes('spacing/') || 
      r.name.includes('typography/') ||
      r.name.includes('radius/') ||
      r.name.includes('shadows/')
    );

    const progress = options.format === 'terminal' ? createProgress() : undefined;
    const startTime = Date.now();

    const result = scanDirectory(path, tokenRules, undefined, progress);

    if (options.format === 'terminal') {
      printScanComplete(result.files.length, startTime);
    }

    handleOutput(result, options);

    if (!options.dryRun && result.summary.total > 0) {
      console.log('\nApplying fixes...');
      const transforms = getTransformsMap();
      const fixes = applyTransforms(
        result.files.flatMap(f => f.violations),
        transforms
      );

      if (fixes.length > 0) {
        console.log(pc.green(`Fixed ${fixes.length} files`));
      } else {
        console.log(pc.yellow('No automatic fixes available'));
      }
    }
  });

program
  .command('components')
  .description('Check for component issues (duplicates, dead components)')
  .option('--dry-run', 'Preview mode, do not apply fixes', false)
  .option('--format <format>', 'Output format (terminal, json)', 'terminal')
  .option('--verbose', 'Show all violations in terminal', false)
  .option('--output <file>', 'Write report to file')
  .argument('[path]', 'Path to scan', '.')
  .action(async (path, options) => {
    const progress = options.format === 'terminal' ? createProgress() : undefined;
    const startTime = Date.now();

    const result = await scanProject(path, componentRules, undefined, progress);

    if (options.format === 'terminal') {
      printScanComplete(result.files.length, startTime);
    }

    handleOutput(result, options);

    if (!options.dryRun && result.summary.total > 0) {
      console.log('\nApplying fixes...');
      const transforms = getTransformsMap();
      const fixes = applyTransforms(
        result.files.flatMap(f => f.violations),
        transforms
      );

      if (fixes.length > 0) {
        console.log(pc.green(`Fixed ${fixes.length} files`));
      } else {
        console.log(pc.yellow('No automatic fixes available'));
      }
    }
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

function printTerminalVerbose(result: any) {
  if (result.files.length === 0) {
    console.log(pc.green('✓ No violations found'));
    return;
  }

  for (const file of result.files) {
    console.log(pc.bold(`\n${file.path}`));
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
  printRiskScore(result.riskScore);
}

function printTerminalCompact(result: any) {
  if (result.files.length === 0) {
    console.log(pc.green('✓ No violations found'));
    return;
  }

  console.log(pc.bold('\nViolations by file:'));
  for (const file of result.files) {
    const errors = file.violations.filter((v: any) => v.severity === 'error').length;
    const warnings = file.violations.filter((v: any) => v.severity === 'warning').length;
    const infos = file.violations.filter((v: any) => v.severity === 'info').length;

    let badge = '';
    if (errors > 0) badge += pc.red(`${errors}E `);
    if (warnings > 0) badge += pc.yellow(`${warnings}W `);
    if (infos > 0) badge += pc.blue(`${infos}I`);

    console.log(`  ${pc.dim(file.path)} ${badge.trim()}`);
  }

  printSummary(result);
  printRiskScore(result.riskScore);
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

  console.log(pc.bold('└────────────────────────────────────────┘'));
}

function getProgressBar(value: number, total: number, color: 'red' | 'yellow' | 'blue'): string {
  const width = 15;
  const filled = Math.round((value / total) * width);
  const empty = width - filled;
  const colorFn = pc[color];

  return colorFn('█'.repeat(filled)) + pc.dim('░'.repeat(empty));
}

function printRiskScore(score: number) {
  const maxScore = 100;
  const percentage = Math.min(score, maxScore);
  const width = 30;
  const filled = Math.round((percentage / maxScore) * width);
  const empty = width - filled;

  let color: 'green' | 'yellow' | 'red';
  if (percentage < 30) color = 'green';
  else if (percentage < 70) color = 'yellow';
  else color = 'red';

  console.log(pc.bold('\n┌─ Risk Score ───────────────────────────┐'));
  console.log(`│  ${pc[color]('█'.repeat(filled))}${pc.dim('░'.repeat(empty))}  ${pc.bold(percentage.toString())}/${maxScore}`);
  console.log(`│  ${pc.dim(getRiskLabel(percentage))}`);
  console.log(pc.bold('└────────────────────────────────────────┘'));
}

function getRiskLabel(score: number): string {
  if (score < 30) return 'Low risk';
  if (score < 70) return 'Medium risk';
  if (score < 90) return 'High risk';
  return 'Critical risk';
}

function generateReport(result: any): string {
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
    lines.push(`📁 ${file.path}`);
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

  lines.push('RISK SCORE');
  lines.push('─'.repeat(60));

  const score = result.riskScore;
  const percentage = Math.min(score, 100);
  const width = 40;
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;

  lines.push(`  ${'█'.repeat(filled)}${'░'.repeat(empty)}  ${percentage}/100`);
  lines.push(`  ${getRiskLabel(percentage)}`);

  return lines.join('\n');
}

program.parse();
