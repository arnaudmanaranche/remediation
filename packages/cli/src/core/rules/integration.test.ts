import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { scanProject } from '../scanner';
import { allRules } from '../rules';

const FIXTURE = path.resolve(__dirname, '../../../../../fixtures/bad-ds');

describe('bad-ds fixture — integration', () => {
  it('detects hardcoded colors across all fixture components', async () => {
    const result = await scanProject(FIXTURE, allRules);
    const colorViolations = result.files.flatMap(f =>
      f.violations.filter(v => v.rule === 'colors/hardcoded')
    );
    // AST mode is precise: only flags values in CSS-property–keyed positions
    expect(colorViolations.length).toBeGreaterThan(5);
  });

  it('does NOT flag colors in non-CSS object keys (Badge variant map)', async () => {
    const result = await scanProject(FIXTURE, allRules);
    const badgeViolations = result.files
      .filter(f => f.path.includes('Badge.tsx'))
      .flatMap(f => f.violations.filter(v => v.rule === 'colors/hardcoded'));
    // Badge uses { bg: '#...', text: '#...' } keys — not CSS properties, so not flagged
    expect(badgeViolations).toHaveLength(0);
  });

  it('detects hardcoded spacing', async () => {
    const result = await scanProject(FIXTURE, allRules);
    const spacingViolations = result.files.flatMap(f =>
      f.violations.filter(v => v.rule === 'spacing/hardcoded')
    );
    expect(spacingViolations.length).toBeGreaterThan(0);
  });

  it('detects token-bypass violations when tokens are configured', async () => {
    const result = await scanProject(FIXTURE, allRules);
    const bypassViolations = result.files.flatMap(f =>
      f.violations.filter(v => v.rule === 'token-bypass')
    );
    expect(bypassViolations.length).toBeGreaterThan(5);
  });

  it('detects drift candidates (Button/ButtonPrimary)', async () => {
    const result = await scanProject(FIXTURE, allRules);
    const driftViolations = result.files.flatMap(f =>
      f.violations.filter(v => v.rule === 'drift')
    );
    expect(driftViolations.length).toBeGreaterThan(0);

    const names = driftViolations.map(v =>
      path.basename(v.file, '.tsx')
    );
    expect(names).toContain('Button');
    expect(names).toContain('ButtonPrimary');
  });

  it('does not flag colors inside comments in fixture files', async () => {
    const result = await scanProject(FIXTURE, allRules);
    const colorViolations = result.files.flatMap(f =>
      f.violations.filter(v => v.rule === 'colors/hardcoded')
    );
    // Comments like "// token-bypass: should be colors.primary" must not be flagged
    const commentFalsePositives = colorViolations.filter(v =>
      v.message.includes('colors.primary') ||
      v.message.includes('colors.white')
    );
    expect(commentFalsePositives).toHaveLength(0);
  });

  it('health score is below 50 for a badly inconsistent codebase', async () => {
    const result = await scanProject(FIXTURE, allRules);
    const { errors, warnings, infos } = result.summary;
    const raw = (errors * 10) + (warnings * 2) + (infos * 0.5);
    const risk = Math.min(Math.round(Math.log(raw + 1) * 15), 100);
    const health = Math.max(0, 100 - risk);
    expect(health).toBeLessThan(50);
  });
});
