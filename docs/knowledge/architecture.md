# CLI architecture

`packages/cli` has a single design-value extractor used by both `scan` and
`analyze`, plus an analyze-only codemod pipeline.

## Extraction — AST extractor (shared by `scan` and `analyze`)

- `packages/cli/src/core/ast/extractor.ts`: per-property, AST-based
  (`extractStyleValues`). CSS/SCSS files go through postcss
  (`ast/cssExtractor.ts`).
- Property classification: `packages/cli/src/core/ast/cssProperties.ts`
  (`COLOR_PROPS` / `SPACING_PROPS` / `TYPOGRAPHY_PROPS` / `RADIUS_PROPS` /
  `SHADOW_PROPS`). Includes shorthands (`border`, `background`, `outline`,
  and `flex` for spacing); their compound values are split per sub-value by
  the shared tokenizer.
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
| `pipeline/designMd.ts` | `generateDesignMd` — renders cluster proposals as a `DESIGN.md` in the `@google/design.md` spec format: YAML frontmatter (`colors`/`spacing`/`typography` token maps; typography as `fontSize`/`fontWeight` objects) + prose sections in the spec's canonical order (Overview → Colors → Typography → Layout → Elevation & Depth → Shapes) |
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

## `primitives` command — compiling the constrained API

- `packages/cli/src/core/primitives/compiler.ts` (`compilePrimitives`) turns the
  pipeline's `decision.proposals` into a typed React primitives API: `tokens.ts`
  (reuses `generateTokensFile`) + `primitives.tsx` with `Box`/`Text` components
  and `ColorName`/`Spacing`/`FontSizeName`/`FontWeightName` union types (`keyof
  typeof` over the token records; typography is split into size/weight literal
  unions so `fontSize` can't take a weight name). Props accept token names only,
  so off-system values fail to typecheck.
- Emits only the groups that exist (colors/spacing/typography): `Box` when colors
  or spacing tokens exist, `Text` when colors or typography exist; their props are
  generated per present group. Spacing accepts a single scale name or 1–4 element
  tuples; `resolveSpacing` joins tuples into the compound CSS value.
- When config `tokensImport` is set, the generated file imports from that module
  instead of writing a local `tokens.ts`.
- `packages/cli/src/commands/primitives.ts` wires it: same `runPipeline` +
  `--min-confidence` filter as `design`/`analyze`, writes files under the
  `--output` dir (default `primitives/`). Telemetry: `primitives.proposals_count`,
  `primitives.tokens_import`, `primitives.output_path`.

## `components` command — compiling the component library

- `packages/cli/src/core/components/detector.ts` (`detectComponents`) parses each
  source file with `@babel/parser` and finds PascalCase functions/arrow consts
  that return JSX. Per component it records the root tag/attrs, the element
  signature, and `styleValues` — collected from the root element's `style={{…}}`
  object only (fallback: any `style` attr in the body). This scoping keeps data
  objects like `const VARIANTS = { border: '#93c5fd' }` out of style extraction.
- `packages/cli/src/core/components/archetypes.ts` — the catalog: 13 `Archetype`s
  (`button`, `iconButton`, `card`, `badge`, `input`, `select`, `checkbox`,
  `radio`, `switch`, `skeleton`, `avatar`, `divider`, `spinner`), each declaring
  its token-bearing `slots` (from `TokenSlot`), DOM `element`, element attrs, and
  whether it can take text children. `classifyComponent` maps a detected
  component onto an archetype by root tag with name-hint refinement (icon→iconButton,
  pill span→badge, switch/toggle→switch, card/panel→card, skeleton/spinner/avatar
  hints, hr→divider, img→avatar).
- `packages/cli/src/core/components/compiler.ts` (`compileComponents`) runs the
  primitives compiler first, then groups detected components per archetype,
  merges near-duplicates (`signature` equality or ≥50% shared name words) into a
  canonical rich one, and `buildUnit`-maps their style values onto slot defaults
  via the same `toCanonical` maps as the codemod. Slot values that resolve to a
  token become constrained props (typed unions imported from `./primitives`);
  values that don't stay literal in the component's `LOOK` and are reported as
  `unmapped`. `tokens.ts`/`primitives.tsx` are reused from the primitives step;
  the generated `components.tsx` imports `colors`/`typography` records from the
  same `tokensImport` source the primitives use.
- Config `components: 'auto' | <archetypeId[]>` — `'auto'` (default) emits the
  archetypes the codebase uses; an explicit list force-includes the listed
  archetypes even when undetected (reported as `forced`).
- `packages/cli/src/commands/components.ts` wires it (same `runPipeline` +
  `--min-confidence` filter, `--output` default `components/`). Telemetry:
  `components.detected_count`, `components.emitted_count`, `components.merged_count`,
  `components.unmatched_count`, `components.proposals_count`, `components.output_path`.
- Known limitation: radius and shadow tokens are not in the analyze pipeline, so
  `borderRadius`/`boxShadow` never map to a token and always stay literal `LOOK`
  (reported as `unmapped` when they collide with a mapped slot). Typography
  size/weight conflation is documented in `TODO.md`.
