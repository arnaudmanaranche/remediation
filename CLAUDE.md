# remediation

CLI that scans React source for design-system drift (hardcoded
colors/spacing/typography/radius/shadows, near-duplicate components, token-bypass),
emits a 0–100 health score + violation list, and can auto-fix via codemod.
Exit code 1 on `error`-severity violations for CI.

pnpm monorepo (`pnpm@11.1.2`), workspace = `packages/*`:
- `packages/cli` — the published npm package `remediation` (the product).
- `packages/website` — marketing/docs SPA, not published.

## Knowledge base (read before diving in)

Versioned project knowledge lives in `docs/knowledge/` — read the relevant file
before working on an area rather than re-discovering it:

- **[docs/knowledge/architecture.md](docs/knowledge/architecture.md)** — CRITICAL:
  the CLI has **two divergent design-value extractors** (`scan` = AST, `analyze` =
  regex pipeline). Read this before touching either.
- **[docs/knowledge/build-test-run.md](docs/knowledge/build-test-run.md)** — build,
  test, and manual-run commands; fixtures.
- **[docs/knowledge/release-process.md](docs/knowledge/release-process.md)** —
  release-please + Conventional Commits (only `packages/cli` publishes).
- **[docs/knowledge/website.md](docs/knowledge/website.md)** — website stack + brand rules.

Existing top-level docs remain the source of truth for their topics:
- `CONTEXT.md` — enforced vocabulary (Rule / Codemod / Token …). Use the exact terms.
- `PRODUCT.md` — product purpose + brand/design constraints for the website.
- `TODO.md` — open limitations with full repro/root-cause context. Read before
  working on the `analyze` pipeline.
- `README.md` — user-facing CLI docs (commands, flags, rules, config).

## Quick reference

- Build CLI: `pnpm --filter './packages/cli' run build`
- Test CLI: `pnpm --filter './packages/cli' run test` (vitest)
- Dead-code check: `pnpm knip`
- Manual run: `node packages/cli/dist/index.js analyze fixtures/bad-ds --codemod`

## Keeping docs in sync

This knowledge base is only useful if it stays true. **After making non-trivial
changes, update the affected doc in the same change:**

- Changed the `analyze` pipeline or the `scan`/AST extractors, `cssProperties`,
  clustering, or codemod behavior → update `docs/knowledge/architecture.md`, and
  update/close the relevant item in `TODO.md`.
- Added/changed a command, flag, rule, or config field → update `README.md`.
- Changed build/test/release tooling → update `docs/knowledge/build-test-run.md`
  or `docs/knowledge/release-process.md`.
- Introduced or fixed a limitation → add/remove the item in `TODO.md`.
- Changed vocabulary or introduced a new core noun → update `CONTEXT.md`.

Prefer editing an existing doc over adding a new one; keep entries terse and
point to code paths (`packages/cli/src/...`) rather than pasting code.
