import { execSync } from 'child_process';
import { Rule, FileContent, Violation } from '../../../types';
import * as fs from 'fs';
import * as path from 'path';

export const duplicatesRule: Rule = {
  name: 'components/duplicates',
  description: 'Detects duplicate code patterns using jscpd',

  detect(file: FileContent): Violation[] {
    return [];
  },

  async detectProject(projectPath: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const reportDir = path.join(projectPath, '.jscpd-cache');
    const reportPath = path.join(reportDir, 'report.json');

    try {
      fs.mkdirSync(reportDir, { recursive: true });

      execSync(
        `npx jscpd --reporters json --output "${reportDir}" --min-lines 5 --min-tokens 50 --ignore "node_modules,dist,.jscpd-cache,**/*.json"`,
        {
          encoding: 'utf-8',
          timeout: 60000,
          cwd: projectPath,
          stdio: ['pipe', 'pipe', 'pipe'],
        }
      );
    } catch (error) {
      // jscpd may exit with non-zero
    }

    try {
      if (fs.existsSync(reportPath)) {
        const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));

        if (report.duplicates && Array.isArray(report.duplicates)) {
          const seen = new Set<string>();

          for (const duplicate of report.duplicates) {
            const firstName = duplicate.firstFile?.name || '';
            const secondName = duplicate.secondFile?.name || '';

            if (firstName.includes('.jscpd-cache') || secondName.includes('.jscpd-cache')) {
              continue;
            }
            if (firstName.includes('report.json') || secondName.includes('report.json')) {
              continue;
            }

            const key = `${firstName}:${duplicate.firstFile?.start}-${secondName}:${duplicate.secondFile?.start}`;
            if (seen.has(key)) continue;
            seen.add(key);

            const filePath = path.join(projectPath, firstName);
            const startLine = duplicate.firstFile?.start?.line || 1;
            const endLine = duplicate.firstFile?.end?.line || startLine;

            for (let i = startLine; i <= endLine; i++) {
              violations.push({
                rule: 'components/duplicates',
                file: filePath,
                line: i,
                column: 1,
                message: `Duplicate code block (lines ${startLine}-${endLine} in ${firstName})`,
                severity: 'warning',
                suggestion: 'Consider extracting this into a shared component',
              });
            }
          }
        }

        fs.rmSync(reportDir, { recursive: true, force: true });
      }
    } catch (error) {
      console.error('jscpd: failed to parse report');
      fs.rmSync(reportDir, { recursive: true, force: true });
    }

    return violations;
  },
};
