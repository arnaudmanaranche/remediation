# TODO — remediation

Known limitations and follow-up work, captured with full context so any of
these can be picked up cold.

Background: `scan` and `analyze` share the AST extractor
(`packages/cli/src/core/ast/extractor.ts`). The `analyze` pipeline runs
`extract → normalize → cluster → decide → codemod`
(`packages/cli/src/core/pipeline/`) on top of it — see
`docs/knowledge/architecture.md`.

Test suite: `pnpm --filter './packages/cli' run test`. Fixture for manual runs:
`fixtures/bad-ds/` (a deliberately messy component set). Build:
`pnpm --filter './packages/cli' run build`, then
`node packages/cli/dist/index.js analyze <path> --codemod [--no-dry-run]`.

---

No open items.
