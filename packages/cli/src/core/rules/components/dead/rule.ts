import { execSync } from 'child_process';
import { Rule, FileContent, Violation } from '../../../types';
import * as path from 'path';

export const deadComponentsRule: Rule = {
  name: 'components/dead',
  description: 'Detects unused React components using knip',

  detect(file: FileContent): Violation[] {
    return [];
  },

  async detectProject(projectPath: string): Promise<Violation[]> {
    const violations: Violation[] = [];

    try {
      const stdout = execSync('npx knip --reporter json --no-exit-code', {
        encoding: 'utf-8',
        timeout: 60000,
        cwd: projectPath,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      const knipResult = JSON.parse(stdout);

      if (knipResult.files && Array.isArray(knipResult.files)) {
        for (const filePath of knipResult.files) {
          const ext = path.extname(filePath);
          if (['.tsx', '.jsx'].includes(ext)) {
            violations.push({
              rule: 'components/dead',
              file: path.join(projectPath, filePath),
              line: 1,
              column: 1,
              message: `Unused file: ${filePath}`,
              severity: 'warning',
              suggestion: 'Consider removing this file',
            });
          }
        }
      }

      if (knipResult.issues && Array.isArray(knipResult.issues)) {
        for (const issue of knipResult.issues) {
          if (issue.exports && Array.isArray(issue.exports) && issue.exports.length > 0) {
            for (const exp of issue.exports) {
              const ext = path.extname(issue.file || '');
              if (['.tsx', '.jsx'].includes(ext)) {
                violations.push({
                  rule: 'components/dead',
                  file: path.join(projectPath, issue.file),
                  line: exp.line || 1,
                  column: exp.col || 1,
                  message: `Unused export: ${exp.name}`,
                  severity: 'warning',
                  suggestion: `Consider removing ${exp.name}`,
                });
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Knip error:', error);
    }

    return violations;
  },
};
