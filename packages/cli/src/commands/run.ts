import { Command } from 'commander';
import { scanDirectory, scanProject, allRules, getTransformsMap, componentRules, applyTransforms } from '../core/index';
import pc from 'picocolors';

const program = new Command();

program
  .name('remediation')
  .description('CLI tool that scans React source code and detects design system inconsistencies')
  .version('0.0.1');

program
  .command('scan')
  .description('Run all rules (tokens + components)')
  .option('--dry-run', 'Preview mode, do not apply fixes', false)
  .option('--format <format>', 'Output format (terminal, json)', 'terminal')
  .argument('[path]', 'Path to scan', '.')
  .action(async (path, options) => {
    const result = await scanProject(path, allRules);

    if (options.format === 'json') {
      console.log(JSON.stringify(result, null, 2));
    } else {
      printTerminal(result);
    }

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
  .argument('[path]', 'Path to scan', '.')
  .action(async (path, options) => {
    const tokenRules = allRules.filter(r => r.name.startsWith('tokens/'));
    const result = scanDirectory(path, tokenRules);

    if (options.format === 'json') {
      console.log(JSON.stringify(result, null, 2));
    } else {
      printTerminal(result);
    }

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
  .argument('[path]', 'Path to scan', '.')
  .action(async (path, options) => {
    const result = await scanProject(path, componentRules);

    if (options.format === 'json') {
      console.log(JSON.stringify(result, null, 2));
    } else {
      printTerminal(result);
    }

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

function printTerminal(result: any) {
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

program.parse();
