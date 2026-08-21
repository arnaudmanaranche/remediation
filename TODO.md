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

## Done this session (for reference — do not redo)

- Auto-generated token names no longer collide into counters (`md2`, `blue3`);
  colliding clusters encode their value (`spacing.md_16`,
  `colors.blue_2563eb`) — valid identifiers, order-independent.
- The codemod rewrites CSS-in-JS tagged templates (`styled.div\`...\``,
  `css\`...\``): matched sub-values become `${...}` interpolations; existing
  interpolations are untouched.
- `analyze` now consumes the shared AST extractor (no more line-coarse regex
  extraction); values on mixed-prop lines are no longer silently dropped.
  Compound rawValues are split per sub-value via a shared tokenizer
  (`pipeline/valueTokenizer.ts`) also used by the codemod. Regex scan kept only
  as parse-failure fallback.
- Shorthand props (`border`, `background`, `outline`, border sides) are
  recognized and flagged/codemodded.
- Config `tokens` map accepts bare numeric / `bold` / `normal` font-weight keys
  (`'600': 'typography.semibold'`), routed through a separate typography lookup.
