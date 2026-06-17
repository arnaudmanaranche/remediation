import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadConfig, shouldIgnoreFile } from './config';
import * as fs from 'fs';
import * as path from 'path';

describe('config', () => {
  describe('loadConfig', () => {
    it('returns default ignores when no config file exists', () => {
      const config = loadConfig('/tmp/nonexistent');
      expect(config.ignore).toBeDefined();
      expect(config.ignore).toContain('node_modules');
      expect(config.ignore).toContain('dist');
      expect(config.ignore).toContain('build');
    });

    it('loads config from file', () => {
      const tmpDir = path.join(__dirname, '__test_config__');
      fs.mkdirSync(tmpDir, { recursive: true });
      fs.writeFileSync(path.join(tmpDir, 'remediation.config.js'), `
        module.exports = {
          ignore: ['*.test.ts'],
          rules: { 'colors/hardcoded': 'off' },
        };
      `);

      const config = loadConfig(tmpDir);
      expect(config.ignore).toContain('*.test.ts');
      expect(config.ignore).toContain('node_modules');
      expect(config.rules?.['colors/hardcoded']).toBe('off');

      fs.rmSync(tmpDir, { recursive: true });
    });
  });

  describe('shouldIgnoreFile', () => {
    it('ignores node_modules', () => {
      expect(shouldIgnoreFile('src/node_modules/test.ts', ['node_modules'])).toBe(true);
    });

    it('ignores dist', () => {
      expect(shouldIgnoreFile('dist/bundle.js', ['dist'])).toBe(true);
    });

    it('does not ignore source files', () => {
      expect(shouldIgnoreFile('src/Button.tsx', ['node_modules', 'dist'])).toBe(false);
    });
  });
});
