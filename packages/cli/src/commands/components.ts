import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import pc from 'picocolors';
import { runPipeline } from '../core/pipeline';
import { loadConfig } from '../core/config';
import { compileComponents, ComponentReportItem } from '../core/components/compiler';
import { collectSourceFiles, detectComponents } from '../core/components/detector';
import { CATALOG_ORDER, ArchetypeId } from '../core/components/archetypes';
import { withTelemetry } from '../telemetry/instrument';

export function registerComponentsCommand(program: Command) {
  program
    .command('components')
    .description('Compile a token-constrained component library from the detected components')
    .option('--output <dir>', 'Output directory', 'components')
    .option('--min-confidence <level>', 'Minimum confidence (high, medium, low)', 'low')
    .argument('[path]', 'Path to scan', '.')
    .action(async (scanPath: string, options: { output?: string; minConfidence?: string }, command: Command) => {
      await withTelemetry('components', command.parent?.opts().telemetry, async (span) => {
        console.log(pc.cyan('⚡ Compiling component library from detected components...'));

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
        const include = resolveComponentSelection(config.components);

        const { files, report } = compileComponents(filteredProposals, detected, {
          tokensImport: config.tokensImport,
          include,
        });

        if (Object.keys(files).length === 0) {
          console.log(pc.yellow('No components matched a catalog archetype — nothing to write.'));
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

        const names = Object.keys(files);
        for (const name of names) {
          console.log(pc.dim(`  ${name}`));
        }

        printReport(report);

        const capped = filteredProposals.length;
        span?.setAttributes({
          'components.detected_count': detected.length,
          'components.emitted_count': countMatched(report),
          'components.merged_count': countMerged(report),
          'components.unmatched_count': countUnmatched(report),
          'components.proposals_count': capped,
          'components.output_path': outputDir,
        });
      });
    });
}

function resolveComponentSelection(config: unknown): ArchetypeId[] | undefined {
  if (!Array.isArray(config)) return undefined;
  return (config as string[]).filter((id): id is ArchetypeId => CATALOG_ORDER.includes(id as ArchetypeId));
}

function printReport(report: ComponentReportItem[]): void {
  const matched = report.filter(r => r.type === 'matched');
  if (matched.length > 0) {
    console.log(pc.cyan(`  ${matched.length} ${plural(matched.length, 'component')} matched to catalog archetypes`));
    for (const item of matched as Extract<ComponentReportItem, { type: 'matched' }>[]) {
      console.log(pc.dim(`    ${item.component} → ${item.archetype}`));
    }
  }

  const merged = report.filter(r => r.type === 'merged');
  if (merged.length > 0) {
    console.log(pc.yellow(`  ${merged.length} near-duplicate${merged.length === 1 ? '' : 's'} merged`));
    for (const item of merged as Extract<ComponentReportItem, { type: 'merged' }>[]) {
      console.log(pc.dim(`    ${item.component} → ${item.into}`));
    }
  }

  const forced = report.filter(r => r.type === 'forced');
  if (forced.length > 0) {
    console.log(pc.dim(`  ${forced.length} archetype${forced.length === 1 ? '' : 's'} forced (config)`));
    for (const item of forced as Extract<ComponentReportItem, { type: 'forced' }>[]) {
      console.log(pc.dim(`    ${item.archetype}`));
    }
  }

  const unmapped = report.filter(r => r.type === 'unmapped');
  for (const item of unmapped as Extract<ComponentReportItem, { type: 'unmapped' }>[]) {
    console.log(pc.yellow(`  ⚠ ${item.component}: style values not mapped to a token (kept literal):`));
    console.log(pc.dim(`    ${item.values.join(', ')}`));
  }

  const unmatched = report.filter(r => r.type === 'unmatched');
  if (unmatched.length > 0) {
    console.log(pc.dim(`  ${unmatched.length} component${unmatched.length === 1 ? '' : 's'} not matched to an archetype`));
    for (const item of unmatched as Extract<ComponentReportItem, { type: 'unmatched' }>[]) {
      console.log(pc.dim(`    ${item.component} (${path.basename(item.file)})`));
    }
  }
}

function countMatched(report: ComponentReportItem[]): number {
  return report.filter(r => r.type === 'matched').length;
}

function countMerged(report: ComponentReportItem[]): number {
  return report.filter(r => r.type === 'merged').length;
}

function countUnmatched(report: ComponentReportItem[]): number {
  return report.filter(r => r.type === 'unmatched').length;
}

function plural(count: number, word: string): string {
  return count === 1 ? word : `${word}s`;
}