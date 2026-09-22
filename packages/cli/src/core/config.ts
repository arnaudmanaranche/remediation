import * as fs from 'fs';
import * as path from 'path';

export interface RemediationConfig {
  ignore?: string[];
  rules?: Record<string, 'off' | 'warning' | 'error' | 'info'>;
  tokens?: Record<string, string>;
  // Module the codemod imports token references from, e.g. '@/design/tokens'.
  // When set, `analyze --codemod` injects the needed import into edited files;
  // when omitted, it applies the changes and lists the imports to add by hand.
  tokensImport?: string;
}

const CONFIG_FILE = 'remediation.config.js';

const DEFAULT_IGNORE = [
  'node_modules',
  'dist',
  'build',
  '.next',
  '.nuxt',
  'out',
  'coverage',
  '.cache',
  '.parcel-cache',
  '.webpack',
  '.turbo',
  '.vercel',
  '.netlify',
  'tmp',
  'temp',
];

export function loadConfig(projectPath: string): RemediationConfig {
  const configPath = path.join(projectPath, CONFIG_FILE);

  if (!fs.existsSync(configPath)) {
    return { ignore: [...DEFAULT_IGNORE] };
  }

  try {
    const absolutePath = path.resolve(configPath);
    delete require.cache[require.resolve(absolutePath)];
    const config = require(absolutePath);
    return validateConfig(config);
  } catch (error) {
    console.error(`Failed to load ${CONFIG_FILE}:`, error);
    return { ignore: [...DEFAULT_IGNORE] };
  }
}

function validateConfig(config: any): RemediationConfig {
  const validated: RemediationConfig = {};

  if (Array.isArray(config.ignore)) {
    validated.ignore = [...DEFAULT_IGNORE, ...config.ignore.filter((p: any) => typeof p === 'string')];
  } else {
    validated.ignore = [...DEFAULT_IGNORE];
  }

  if (config.rules && typeof config.rules === 'object') {
    validated.rules = {};
    for (const [rule, level] of Object.entries(config.rules)) {
      if (['off', 'warning', 'error', 'info'].includes(level as string)) {
        validated.rules[rule] = level as 'off' | 'warning' | 'error' | 'info';
      }
    }
  }

  if (config.tokens && typeof config.tokens === 'object') {
    validated.tokens = {};
    for (const [value, token] of Object.entries(config.tokens)) {
      if (typeof value === 'string' && typeof token === 'string') {
        validated.tokens[value] = token;
      }
    }
  }

  if (typeof config.tokensImport === 'string' && config.tokensImport.length > 0) {
    validated.tokensImport = config.tokensImport;
  }

  return validated;
}

export function shouldIgnoreFile(filePath: string, ignorePatterns: string[]): boolean {
  const normalizedPath = filePath.replace(/\\/g, '/');

  for (const pattern of ignorePatterns) {
    if (matchGlob(normalizedPath, pattern)) {
      return true;
    }
  }

  return false;
}

function matchGlob(filePath: string, pattern: string): boolean {
  const normalizedPattern = pattern.replace(/\\/g, '/');

  if (normalizedPattern.includes('**')) {
    const prefix = normalizedPattern.split('**')[0];
    const suffix = normalizedPattern.split('**').slice(1).join('**');

    if (prefix && !filePath.startsWith(prefix)) {
      return false;
    }
    if (suffix && !filePath.endsWith(suffix.replace(/^\//, ''))) {
      return false;
    }
    return true;
  }

  if (normalizedPattern.includes('*')) {
    const regex = new RegExp(
      '^' +
      normalizedPattern
        .replace(/\./g, '\\.')
        .replace(/\*/g, '[^/]*')
        .replace(/\?/g, '[^/]') +
      '$'
    );
    return regex.test(filePath);
  }

  return filePath.includes(normalizedPattern);
}

export function getRuleSeverity(
  ruleName: string,
  config: RemediationConfig,
  defaultSeverity: string
): string {
  if (!config.rules) {
    return defaultSeverity;
  }

  const configured = config.rules[ruleName];
  if (configured === 'off') {
    return 'off';
  }

  return configured || defaultSeverity;
}
