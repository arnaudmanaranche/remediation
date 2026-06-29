import { Command } from 'commander';
import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';

function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

function buildConfig(
  ignorePatterns: string[],
  ruleSeverities: Record<string, string>,
  tokenMappings: Record<string, string>,
): string {
  const parts: string[] = [];

  if (ignorePatterns.length > 0) {
    const items = ignorePatterns.map((p) => `    ${JSON.stringify(p)}`).join(',\n');
    parts.push(`  ignore: [\n${items},\n  ]`);
  }

  if (Object.keys(ruleSeverities).length > 0) {
    const items = Object.entries(ruleSeverities)
      .map(([k, v]) => `    ${JSON.stringify(k)}: ${JSON.stringify(v)}`)
      .join(',\n');
    parts.push(`  rules: {\n${items},\n  }`);
  }

  if (Object.keys(tokenMappings).length > 0) {
    const items = Object.entries(tokenMappings)
      .map(([k, v]) => `    ${JSON.stringify(k)}: ${JSON.stringify(v)}`)
      .join(',\n');
    parts.push(`  tokens: {\n${items},\n  }`);
  }

  return `module.exports = {\n${parts.join(',\n')},\n};\n`;
}

export function registerInitCommand(program: Command): void {
  program
    .command('init')
    .description('Generate a remediation.config.js in the current directory')
    .action(async () => {
      const configPath = path.join(process.cwd(), 'remediation.config.js');

      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      try {
        if (fs.existsSync(configPath)) {
          const overwrite = await ask(
            rl,
            'remediation.config.js already exists. Overwrite? (y/N) ',
          );
          if (overwrite.toLowerCase() !== 'y') {
            console.log('Aborted.');
            rl.close();
            return;
          }
        }

        const ignoreAnswer = await ask(
          rl,
          'Ignore patterns? (comma-separated, e.g. *.stories.tsx) ',
        );
        const ignorePatterns = ignoreAnswer
          ? ignoreAnswer.split(',').map((s) => s.trim()).filter(Boolean)
          : [];

        const rulesAnswer = await ask(
          rl,
          'Rule severities to override? (e.g. colors/hardcoded:error,drift:off) ',
        );
        const ruleSeverities: Record<string, string> = {};
        if (rulesAnswer) {
          for (const entry of rulesAnswer.split(',')) {
            const colonIdx = entry.lastIndexOf(':');
            if (colonIdx > 0) {
              const key = entry.slice(0, colonIdx).trim();
              const value = entry.slice(colonIdx + 1).trim();
              if (key && value) {
                ruleSeverities[key] = value;
              }
            }
          }
        }

        const tokensAnswer = await ask(
          rl,
          'Token mappings? (e.g. #1976D2:colors.primary) ',
        );
        const tokenMappings: Record<string, string> = {};
        if (tokensAnswer) {
          for (const entry of tokensAnswer.split(',')) {
            const colonIdx = entry.indexOf(':');
            if (colonIdx > 0) {
              const key = entry.slice(0, colonIdx).trim();
              const value = entry.slice(colonIdx + 1).trim();
              if (key && value) {
                tokenMappings[key] = value;
              }
            }
          }
        }

        const config = buildConfig(ignorePatterns, ruleSeverities, tokenMappings);
        fs.writeFileSync(configPath, config, 'utf-8');
        console.log(`Created ${configPath}`);
      } finally {
        rl.close();
      }
    });
}
