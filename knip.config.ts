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
  // These are intentional public API exports for programmatic use of the package.
  // Nothing in the CLI itself imports them, but they form the library surface.
  ignoreExports: [
    'packages/cli/src/core/index.ts',
  ],
};

export default config;
