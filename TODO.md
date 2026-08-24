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

## 1. `rgba()` alpha is silently dropped when canonicalizing

**Symptom.** The codemod rewrites `boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)'`
to `` `0 ${spacing.xs} ${spacing.xs} ${colors.black}` `` — the `0.12` alpha is
gone, so the rendered shadow becomes opaque black. Found during skill smoke
testing; repro: `node packages/cli/dist/index.js analyze fixtures/bad-ds --codemod`.

**Root cause.** `normalizeColor()` in
`packages/cli/src/core/pipeline/normalizer.ts` matches `rgba\(...)` but feeds
only r/g/b to `rgbToHex()`, discarding the fourth channel — so
`rgba(0,0,0,0.12)` and `#000000` collapse to the same canonical and share a
cluster/token.

**Options.**
- Keep alpha in the canonical form (e.g. `#000000@0.12` or separate `alpha`
  field) so translucent values never cluster with opaque ones.
- Cheaper guard: refuse to rewrite an `rgba(` sub-value unless the matched
  token's value also carries the same alpha (skip + warn instead).

**Files.** `packages/cli/src/core/pipeline/normalizer.ts` (`normalizeColor`),
`packages/cli/src/core/pipeline/codemod.ts` (`buildExpression`).
