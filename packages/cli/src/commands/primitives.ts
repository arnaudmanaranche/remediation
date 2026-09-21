import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import pc from 'picocolors';
import { runPipeline } from '../core/pipeline';
import { loadConfig } from '../core/config';
import { compilePrimitives } from '../core/primitives/compiler';
import { withTelemetry } from '../telemetry/instrument';

export function registerPrimitivesCommand(program: Command) {
  program
    .command('primitives')
    .description('Compile detected tokens into a constrained React primitives API')
    .option('--output <dir>', 'Output directory', 'primitives')
    .option('--min-confidence <level>', 'Minimum confidence (high, medium, low)', 'low')
    .argument('[path]', 'Path to scan', '.')
    .action(async (scanPath: string, options: { output?: string; minConfidence?: string }, command: Command) => {
      await withTelemetry('primitives', command.parent?.opts().telemetry, async (span) => {
        console.log(pc.cyan('⚡ Compiling primitives from detected tokens...'));

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
        const { files } = compilePrimitives(filteredProposals, { tokensImport: config.tokensImport });
        const outputDir = path.resolve(options.output!);
        fs.mkdirSync(outputDir, { recursive: true });

        for (const [name, content] of Object.entries(files)) {
          fs.writeFileSync(path.join(outputDir, name), content, 'utf-8');
        }

        console.log(pc.cyan(`⚡ Analysis complete in ${pc.bold(elapsed)}s`));
        console.log(pc.green(`✓ Primitives written to ${pc.bold(outputDir)}`));

        const names = Object.keys(files);
        for (const name of names) {
          console.log(pc.dim(`  ${name}`));
        }

        const byType = countByType(filteredProposals);
        const counts = ['color', 'spacing', 'typography']
          .filter(t => byType.has(t))
          .map(t => `${byType.get(t)} ${t === 'spacing' ? 'spacing' : t === 'color' ? 'color' : 'typography'} tokens`)
          .join(', ');
        console.log(pc.dim(`  ${counts} compiled into typed props`));
        console.log(pc.dim('  <Box padding="17px" /> now fails to typecheck'));

        span?.setAttributes({
          'primitives.proposals_count': filteredProposals.length,
          'primitives.tokens_import': config.tokensImport ? true : false,
          'primitives.output_path': outputDir,
        });
      });
    });
}

function countByType(proposals: { cluster: { type: string } }[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const p of proposals) {
    counts.set(p.cluster.type, (counts.get(p.cluster.type) || 0) + 1);
  }
  return counts;
}