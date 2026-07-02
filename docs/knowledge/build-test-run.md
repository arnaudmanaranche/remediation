# Build, test, run

From the repo root.

## CLI (`packages/cli`)

- Build: `pnpm --filter './packages/cli' run build` (plain `tsc`, outputs `dist/`)
- Test: `pnpm --filter './packages/cli' run test` (vitest). Root alias: `pnpm test`.
- Watch tests: `pnpm --filter './packages/cli' run test:watch`
- Dead-code check: `pnpm knip` (config `knip.config.ts`)

Manual run after building:

```bash
node packages/cli/dist/index.js scan <path> --verbose
node packages/cli/dist/index.js analyze <path> --codemod [--no-dry-run]
```

## Fixtures

`fixtures/bad-ds/` is a deliberately messy component set for reproducing
extractor/codemod behavior (e.g. `fixtures/bad-ds/src/components/Card.tsx`).

## Website (`packages/website`)

- Dev: `pnpm --filter './packages/website' run dev` (vite)
- Build: `pnpm --filter './packages/website' run build` (`tsc -b && vite build`)
- OG image: `pnpm --filter './packages/website' run og`
