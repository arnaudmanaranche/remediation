# CLI architecture

`packages/cli` has a single design-value extractor used by both `scan` and
`analyze`, plus an analyze-only codemod pipeline.

## Extraction — AST extractor (shared by `scan` and `analyze`)

- `packages/cli/src/core/ast/extractor.ts`: per-property, AST-based
  (`extractStyleValues`). CSS/SCSS files go through postcss
  (`ast/cssExtractor.ts`).
- Property classification: `packages/cli/src/core/ast/cssProperties.ts`
  (`COLOR_PROPS` / `SPACING_PROPS` / `TYPOGRAPHY_PROPS` / `RADIUS_PROPS` /
  `SHADOW_PROPS`). Includes shorthands (`border`, `background`, `outline`);
  their compound values are split per sub-value by the shared tokenizer.
- The rules in `packages/cli/src/core/rules/` consume the same extractor via
  `ast/ruleHelpers.ts`.

## Value tokenization — shared

- `pipeline/valueTokenizer.ts` (`splitValueTokens`) splits a compound CSS value
  string (`'1px solid #e4e4e7'`) into color/length sub-tokens with offsets.
  Used by **both** the analyze extractor (to classify sub-values) and the
  codemod (to rewrite them), so extraction and rewriting stay in lockstep.

## `analyze` command — pipeline

Runs `extract → normalize → cluster → decide → codemod` in
`packages/cli/src/core/pipeline/`:

| File | Role |
|------|------|
| `pipeline/extractor.ts` | Maps AST-extracted `StyleValue`s → pipeline values; splits compounds via the shared tokenizer. Falls back to a line-based regex scan only when a file cannot be parsed |
| `pipeline/normalizer.ts` | `toCanonical()` → hex / px / weight canonical form |
| `pipeline/clusterer.ts` | `clusterValues`, `suggestName`, `getSuggestedNames` |
| `pipeline/decision.ts` | proposal confidence + occurrence threshold |
| `pipeline/codemod.ts` | AST/offset edits; `collectFileWork`, `buildExpression` |
| `pipeline/index.ts` | orchestration, `buildConfigTokenMap` |

### Auto-generated names

`getSuggestedNames` buckets each cluster to a coarse scale name (`md`, `blue`,
`semibold`). When two clusters collide on the same base name, the *value* is
encoded with a `_` separator instead of a counter: `spacing.md_16`,
`colors.blue_2563eb`. `_` keeps generated names valid JS identifiers, since the
codemod emits them as bare references (`spacing.md_16` — a hyphen would parse as
subtraction). Non-colliding clusters keep clean scale names.

## Codemod

- True AST/offset edits — **never** reformats/regenerates files.
- Rewrites `style={{}}` object properties **and** CSS-in-JS tagged templates
  (`styled.div`/`css`/…). Template rewriting is declaration-scoped: matched
  sub-values become `${...}` interpolations, existing interpolations are never
  touched (quasis cannot overlap expression ranges).
- Whole-value literals → bare refs: `'#1976D2'` → `colors.primary`.
- Compound/shorthand → template literals: `'8px 16px'` → `` `${spacing.sm} ${spacing.md}` ``.
- Config `tokensImport` = module the codemod injects token imports from (warning
  fallback when unset).
- The config `tokens` map (hardcoded → token name) powers the `token-bypass`
  rule and supplies human-readable names to the codemod. Bare numeric/keyword
  font-weight keys (`'600': 'typography.semibold'`) are routed through a
  separate typography lookup (`decideTokens`) so they can't collide with length
  or color canonicals.

See `TODO.md` for any remaining open limitations.
