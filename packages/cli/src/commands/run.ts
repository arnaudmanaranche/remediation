import { Command } from 'commander';
import { scanDirectory, scanProject, allRules, getTransformsMap, componentRules, applyTransforms } from '../core/index';

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
        console.log(`Fixed ${fixes.length} files`);
      } else {
        console.log('No automatic fixes available');
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
        console.log(`Fixed ${fixes.length} files`);
      } else {
        console.log('No automatic fixes available');
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
        console.log(`Fixed ${fixes.length} files`);
      } else {
        console.log('No automatic fixes available');
      }
    }
  });

function printTerminal(result: any) {
  if (result.files.length === 0) {
    console.log('No violations found');
    return;
  }

  for (const file of result.files) {
    console.log(`\n${file.path}`);
    for (const violation of file.violations) {
      const severity = violation.severity.toUpperCase().padEnd(7);
      console.log(`  ${severity} L${violation.line}:${violation.column} ${violation.message}`);
      if (violation.suggestion) {
        console.log(`         ${violation.suggestion}`);
      }
    }
  }

  console.log(`\n${result.summary.total} violations (${result.summary.errors} errors, ${result.summary.warnings} warnings, ${result.summary.infos} infos)`);
  console.log(`Risk score: ${result.riskScore}`);
}

program.parse();
