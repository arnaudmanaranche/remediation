import { Command } from 'commander';
import { runPipeline, generateTokensFile } from '../core/pipeline';
import { applyCodemod, generateCodemodPreview } from '../core/pipeline/codemod';
import pc from 'picocolors';
import * as fs from 'fs';
import * as path from 'path';

export function registerAnalyzeCommand(program: Command) {
  program
    .command('analyze')
    .description('Analyze design system usage and propose tokens')
    .option('--output <file>', 'Generate tokens.ts file')
    .option('--min-confidence <level>', 'Minimum confidence (high, medium, low)', 'low')
    .option('--codemod', 'Apply codemod to replace hardcoded values with tokens', false)
    .option('--no-dry-run', 'Write codemod changes to files (default: preview only)')
    .argument('[path]', 'Path to scan', '.')
    .action((scanPath: string, options: { output?: string; minConfidence?: string; codemod?: boolean; dryRun?: boolean }) => {
      console.log(pc.cyan('⚡ Analyzing design system...'));

      const startTime = Date.now();
      const result = runPipeline(scanPath);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

      console.log(pc.cyan(`⚡ Analysis complete in ${pc.bold(elapsed)}s`));
      printAnalysis(result);

      if (options.output) {
        const filteredProposals = result.decision.proposals.filter(p => {
          const order = { high: 0, medium: 1, low: 2 };
          return order[p.confidence] <= order[options.minConfidence as keyof typeof order];
        });

        const tokensContent = generateTokensFile(filteredProposals);
        const outputPath = path.resolve(options.output);
        fs.writeFileSync(outputPath, tokensContent, 'utf-8');
        console.log(pc.cyan(`📄 Tokens written to ${pc.bold(outputPath)}`));
      }

      if (options.codemod) {
        const filteredProposals = result.decision.proposals.filter(p => {
          const order = { high: 0, medium: 1, low: 2 };
          return order[p.confidence] <= order[options.minConfidence as keyof typeof order];
        });

        const codemodResult = applyCodemod(scanPath, filteredProposals, options.dryRun);

        if (codemodResult.changes.length === 0) {
          console.log(pc.yellow('No changes to apply'));
          return;
        }

        const preview = generateCodemodPreview(codemodResult.changes);
        console.log(preview);

        if (options.dryRun) {
          console.log(pc.dim('\nDRY RUN — no changes applied'));
          console.log(pc.dim('Run with --codemod --no-dry-run to apply changes'));
        } else {
          console.log(pc.green(`\n✓ Applied ${codemodResult.changes.length} changes to ${codemodResult.filesModified.length} files`));
        }
      }
    });
}

function printAnalysis(result: any) {
  const { extraction, clustering, decision } = result;

  console.log(pc.bold('\n┌─ Extraction ──────────────────────────┐'));
  console.log(`│  ${extraction.length} design values found`);

  const byType = new Map<string, number>();
  for (const v of extraction) {
    byType.set(v.type, (byType.get(v.type) || 0) + 1);
  }

  for (const [type, count] of byType) {
    console.log(`│  ${pc.dim(type.padEnd(12))} ${count}`);
  }
  console.log(pc.bold('└────────────────────────────────────────┘'));

  const colors = clustering.filter((c: any) => c.type === 'color');
  const spacing = clustering.filter((c: any) => c.type === 'spacing');

  if (colors.length > 0) {
    console.log(pc.bold('\n┌─ Color Clusters ──────────────────────┐'));
    for (const cluster of colors.slice(0, 10)) {
      console.log(`│  ${pc.bold(cluster.canonical)} ${cluster.count}x ${pc.dim(`(${cluster.files.length} files)`)}`);
    }
    if (colors.length > 10) {
      console.log(`│  ${pc.dim(`... and ${colors.length - 10} more`)}`);
    }
    console.log(pc.bold('└────────────────────────────────────────┘'));
  }

  if (spacing.length > 0) {
    console.log(pc.bold('\n┌─ Spacing Clusters ────────────────────┐'));
    for (const cluster of spacing.slice(0, 10)) {
      console.log(`│  ${pc.bold(cluster.canonical.padEnd(8))} ${cluster.count}x ${pc.dim(`(${cluster.files.length} files)`)}`);
    }
    if (spacing.length > 10) {
      console.log(`│  ${pc.dim(`... and ${spacing.length - 10} more`)}`);
    }
    console.log(pc.bold('└────────────────────────────────────────┘'));
  }

  console.log(pc.bold('\n┌─ Token Proposals ─────────────────────┐'));
  console.log(`│  ${decision.proposals.length} tokens proposed`);

  const highConf = decision.proposals.filter((p: any) => p.confidence === 'high').length;
  const medConf = decision.proposals.filter((p: any) => p.confidence === 'medium').length;
  const lowConf = decision.proposals.filter((p: any) => p.confidence === 'low').length;

  if (highConf > 0) console.log(`│  ${pc.green('●')} ${highConf} high confidence`);
  if (medConf > 0) console.log(`│  ${pc.yellow('●')} ${medConf} medium confidence`);
  if (lowConf > 0) console.log(`│  ${pc.dim('●')} ${lowConf} low confidence`);

  console.log(`│`);
  console.log(`│  ${pc.dim('Top proposals:')}`);
  for (const proposal of decision.proposals.slice(0, 5)) {
    const confColor = proposal.confidence === 'high' ? pc.green : proposal.confidence === 'medium' ? pc.yellow : pc.dim;
    console.log(`│    ${confColor('●')} ${pc.bold(proposal.tokenName)} = ${proposal.cluster.canonical} ${pc.dim(`(${proposal.frequency}x)`)}`);
  }
  if (decision.proposals.length > 5) {
    console.log(`│    ${pc.dim(`... and ${decision.proposals.length - 5} more`)}`);
  }

  console.log(pc.bold('└────────────────────────────────────────┘'));
}
