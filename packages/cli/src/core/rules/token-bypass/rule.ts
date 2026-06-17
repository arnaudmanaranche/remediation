import { Rule, FileContent, Violation } from '../../types';
import * as fs from 'fs';
import * as path from 'path';

interface TokenMap {
  [value: string]: string;
}

const TOKEN_FILE_PATTERNS = [
  'tokens/colors.ts',
  'tokens/colors.js',
  'tokens/index.ts',
  'tokens/index.js',
  'theme/tokens.ts',
  'theme/tokens.js',
  'src/tokens.ts',
  'src/tokens.js',
  'src/theme.ts',
  'src/theme.js',
  'styles/tokens.ts',
  'styles/tokens.js',
];

const COLOR_REGEX = /['"]?(#[0-9a-fA-F]{3,8})['"]?/g;
const COLOR_VALUE_REGEX = /['"]?(#[0-9a-fA-F]{3,8})['"]?\s*:/g;

function findTokenFiles(projectPath: string): string[] {
  const found: string[] = [];

  for (const pattern of TOKEN_FILE_PATTERNS) {
    const fullPath = path.join(projectPath, pattern);
    if (fs.existsSync(fullPath)) {
      found.push(fullPath);
    }
  }

  return found;
}

function extractTokensFromFiles(files: string[]): TokenMap {
  const tokens: TokenMap = {};

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const matches = content.matchAll(/['"]?(\w+)['"]?\s*:\s*['"]?(#[0-9a-fA-F]{3,8})['"]?/g);

      for (const match of matches) {
        const name = match[1];
        const value = match[2];
        if (name && value) {
          tokens[value.toLowerCase()] = name;
        }
      }
    } catch {
      // skip unreadable files
    }
  }

  return tokens;
}

function extractConfigTokens(configPath: string): TokenMap {
  const tokens: TokenMap = {};

  if (!fs.existsSync(configPath)) {
    return tokens;
  }

  try {
    const config = require(configPath);
    if (config.tokens && typeof config.tokens === 'object') {
      for (const [value, name] of Object.entries(config.tokens)) {
        if (typeof value === 'string' && typeof name === 'string') {
          tokens[value.toLowerCase()] = name;
        }
      }
    }
  } catch {
    // skip invalid config
  }

  return tokens;
}

function findJsxFiles(projectPath: string): string[] {
  const files: string[] = [];

  function traverse(dir: string) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (!entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== 'build') {
            traverse(fullPath);
          }
        } else if (/\.(tsx?|jsx?)$/.test(entry.name) && !entry.name.endsWith('.test.tsx') && !entry.name.endsWith('.test.ts')) {
          files.push(fullPath);
        }
      }
    } catch {
      // skip unreadable dirs
    }
  }

  traverse(projectPath);
  return files;
}

export const tokenBypassRule: Rule = {
  name: 'token-bypass',
  description: 'Detects hardcoded values when a token already exists',

  detect(file: FileContent): Violation[] {
    return [];
  },

  async detectProject(projectPath: string): Promise<Violation[]> {
    const violations: Violation[] = [];

    const tokenFiles = findTokenFiles(projectPath);
    const autoTokens = extractTokensFromFiles(tokenFiles);

    const configPath = path.join(projectPath, 'remediation.config.js');
    const configTokens = extractConfigTokens(configPath);

    const allTokens = { ...autoTokens, ...configTokens };

    if (Object.keys(allTokens).length === 0) {
      return violations;
    }

    const jsxFiles = findJsxFiles(projectPath);

    for (const file of jsxFiles) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const lines = content.split('\n');

        lines.forEach((line, index) => {
          const matches = line.matchAll(/['"]?(#[0-9a-fA-F]{3,8})['"]?/g);

          for (const match of matches) {
            const value = match[1]?.toLowerCase();
            if (value && allTokens[value]) {
              const tokenName = allTokens[value];
              violations.push({
                rule: 'token-bypass',
                file,
                line: index + 1,
                column: match.index! + 1,
                message: `Token bypass: ${match[0]} exists as ${tokenName}`,
                severity: 'warning',
                suggestion: `Use ${tokenName} instead of ${match[0]}`,
              });
            }
          }
        });
      } catch {
        // skip unreadable files
      }
    }

    return violations;
  },
};
