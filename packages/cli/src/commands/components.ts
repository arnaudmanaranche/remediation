import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import pc from 'picocolors';
import { runPipeline } from '../core/pipeline';
import { loadConfig } from '../core/config';
import { compileComponents, ComponentReportItem } from '../core/components/compiler';
import { collectSourceFiles, detectComponents } from '../core/components/detector';
import { withTelemetry } from '../telemetry/instrument';

export function registerComponentsCommand(program: Command) {
  program
    .command('components')
    .description('Compile a token-constrained library from the components found in the codebase')
    .option('--output <dir>', 'Output directory', 'components')
    .option('--min-confidence <level>', 'Minimum confidence (high, medium, low)', 'low')
    .argument('[path]', 'Path to scan', '.')
    .action(async (scanPath: string, options: { output?: string; minConfidence?: string }, command: Command) => {
      await withTelemetry('components', command.parent?.opts().telemetry, async (span) => {
        console.log(pc.cyan('⚡ Compiling component library from found components...'));

        const startTime = Date.now();
        const result = runPipeline(scanPath);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

        const filteredProposals = result.decision.proposals.filter(p => {
          const order = { high: 0, medium: 1, low: 2 };
          return order[p.confidence] <= order[options.minConfidence as keyof typeof order];
        });

        if (filteredProposals.length === 0) {
          console.log(pc.yellow('No design tokens detected — nothing to compile.'));
          return;
        }

        const config = loadConfig(scanPath);
        const sourceFiles = collectSourceFiles(scanPath, config.ignore);
        const detected = detectComponents(sourceFiles);

        const { files, report } = compileComponents(filteredProposals, detected, {
          tokensImport: config.tokensImport,
        });

        if (Object.keys(files).length === 0) {
          console.log(pc.yellow('No components found with tokenizable styles — nothing to write.'));
          printReport(report);
          return;
        }

        const outputDir = path.resolve(options.output!);
        fs.mkdirSync(outputDir, { recursive: true });

        for (const [name, content] of Object.entries(files)) {
          fs.writeFileSync(path.join(outputDir, name), content, 'utf-8');
        }

        console.log(pc.cyan(`⚡ Analysis complete in ${pc.bold(elapsed)}s`));
        console.log(pc.green(`✓ Component library written to ${pc.bold(outputDir)}`));

        for (const name of Object.keys(files)) {
          console.log(pc.dim(`  ${name}`));
        }

        printReport(report);

        span?.setAttributes({
          'components.detected_count': detected.length,
          'components.emitted_count': countEmitted(report),
          'components.merged_count': countMerged(report),
          'components.unmapped_count': report.filter(r => r.type === 'unmapped').length,
          'components.proposals_count': filteredProposals.length,
          'components.output_path': outputDir,
        });
      });
    });
}

function printReport(report: ComponentReportItem[]): void {
  const emitted = report.filter(r => r.type === 'emitted');
  if (emitted.length > 0) {
    console.log(pc.cyan(`  ${emitted.length} ${plural(emitted.length, 'component')} found and emitted`));
    for (const item of emitted as Extract<ComponentReportItem, { type: 'emitted' }>[]) {
      console.log(pc.dim(`    ${item.component}`));
    }
  }

  const merged = report.filter(r => r.type === 'merged');
  if (merged.length > 0) {
    console.log(pc.yellow(`  ${merged.length} near-duplicate${merged.length === 1 ? '' : 's'} merged`));
    for (const item of merged as Extract<ComponentReportItem, { type: 'merged' }>[]) {
      console.log(pc.dim(`    ${item.component} → ${item.into}`));
    }
  }

  const unmapped = report.filter(r => r.type === 'unmapped');
  for (const item of unmapped as Extract<ComponentReportItem, { type: 'unmapped' }>[]) {
    console.log(pc.yellow(`  ⚠ ${item.component}: style values not mapped to a token (kept literal):`));
    console.log(pc.dim(`    ${item.values.join(', ')}`));
  }
}

function countEmitted(report: ComponentReportItem[]): number {
  return report.filter(r => r.type === 'emitted').length;
}

function countMerged(report: ComponentReportItem[]): number {
  return report.filter(r => r.type === 'merged').length;
}

function plural(count: number, word: string): string {
  return count === 1 ? word : `${word}s`;
}