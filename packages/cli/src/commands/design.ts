import { Command } from 'commander';
import { runPipeline } from '../core/pipeline';
import { generateDesignMd } from '../core/pipeline/designMd';
import { withTelemetry } from '../telemetry/instrument';
import pc from 'picocolors';
import * as fs from 'fs';
import * as path from 'path';

export function registerDesignCommand(program: Command) {
  program
    .command('design')
    .description('Generate a DESIGN.md describing your project\'s design system')
    .option('--output <file>', 'Output file path', 'DESIGN.md')
    .option('--min-confidence <level>', 'Minimum confidence (high, medium, low)', 'low')
    .argument('[path]', 'Path to scan', '.')
    .action(async (scanPath: string, options: { output?: string; minConfidence?: string }, command: Command) => {
      await withTelemetry('design', command.parent?.opts().telemetry, async (span) => {
        console.log(pc.cyan('⚡ Generating DESIGN.md...'));

        const startTime = Date.now();
        const result = runPipeline(scanPath);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

        const filteredProposals = result.decision.proposals.filter(p => {
          const order = { high: 0, medium: 1, low: 2 };
          return order[p.confidence] <= order[options.minConfidence as keyof typeof order];
        });

        const filteredDecision = {
          ...result.decision,
          proposals: filteredProposals,
          summary: {
            ...result.decision.summary,
            proposedTokens: filteredProposals.length,
          },
        };

        const content = generateDesignMd(filteredDecision, scanPath);
        const outputPath = path.resolve(options.output!);
        fs.writeFileSync(outputPath, content, 'utf-8');

        console.log(pc.cyan(`⚡ Analysis complete in ${pc.bold(elapsed)}s`));
        console.log(pc.green(`✓ DESIGN.md written to ${pc.bold(outputPath)}`));
        console.log(pc.dim(`  ${filteredProposals.length} tokens documented`));

        span?.setAttributes({
          'design.proposals_count': filteredProposals.length,
          'design.output_path': outputPath,
        });
      });
    });
}
