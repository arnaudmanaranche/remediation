# CLI architecture

The single most important non-obvious fact about `packages/cli`: there are **two
separate design-value extractors** that can disagree on the same file.

## `scan` / `tokens` commands — AST extractor (accurate)

- `packages/cli/src/core/ast/extractor.ts`, driven by the rules in
  `packages/cli/src/core/rules/`.
- Per-property, AST-based.
- Property classification: `packages/cli/src/core/ast/cssProperties.ts`
  (`COLOR_PROPS` / `SPACING_PROPS` / `RADIUS_PROPS` / `TYPOGRAPHY_PROPS`).
  **Longhand only** by design — shorthand `border`/`background` are not recognized
  (see `TODO.md` item 4).

## `analyze` command — separate pipeline (coarser)

Runs `extract → normalize → cluster → decide → codemod` in
`packages/cli/src/core/pipeline/`:

| File | Role |
|------|------|
| `pipeline/extractor.ts` | **regex-and-line-based** extraction — can silently drop values on mixed-prop lines (`TODO.md` item 3) |
| `pipeline/normalizer.ts` | `toCanonical()` → hex / px. Colors + lengths only |
| `pipeline/clusterer.ts` | `clusterValues`, `suggestName`, `getSuggestedNames` |
| `pipeline/decision.ts` | proposal confidence + occurrence threshold |
| `pipeline/codemod.ts` | AST/offset edits; `collectFileWork`, `buildExpression`, `VALUE_TOKEN_REGEX` |
| `pipeline/index.ts` | orchestration, `buildConfigTokenMap` |

Because `scan` uses the AST extractor and `analyze` uses the regex extractor, the
two commands can report different values for the same file. Long-term fix (item 3
in `TODO.md`) is to migrate `analyze` onto the AST extractor.

## Codemod

- True AST/offset edits — **never** reformats/regenerates files.
- Whole-value literals → bare refs: `'#1976D2'` → `colors.primary`.
- Compound/shorthand → template literals: `'8px 16px'` → `` `${spacing.sm} ${spacing.md}` ``.
- Currently only rewrites `style={{}}` object properties — **not** styled/css
  tagged template literals (`TODO.md` item 2).
- Config `tokensImport` = module the codemod injects token imports from (warning
  fallback when unset).
- The config `tokens` map (hardcoded → token name) both powers the `token-bypass`
  rule and supplies human-readable names to the codemod.

See `TODO.md` for the full list of open limitations with repro steps.
