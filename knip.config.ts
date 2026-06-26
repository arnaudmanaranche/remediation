import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  workspaces: {
    'packages/cli': {
      entry: ['src/index.ts'],
      project: ['src/**/*.ts', 'src/**/*.tsx'],
      ignore: [
        'src/**/*.test.ts',
        'src/**/*.test.tsx',
      ],
    },
  },
  ignore: [
    // Intentionally "bad" code used as test fixture — not part of the CLI
    'fixtures/**',
  ],
  ignoreDependencies: [
    // Used by vitest at runtime, not via a direct import in source
    'vitest',
  ],
};

export default config;
