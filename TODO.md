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

<!-- Items below are picked up cold — keep full repro/root-cause context. -->

## Open

### Radius and shadow values are never tokenized by `components`

The analyze pipeline clusters colors/spacing/typography only — radius and
shadow tokens are not proposed (`packages/cli/src/core/pipeline/`). So the
`components` compiler can never map a `borderRadius` or `boxShadow` style value
to a token: it stays in the component's literal `LOOK` (reported as `unmapped`
when it collides with a mapped slot like `padding`). The `radius`/`shadows`
scan rules flag the violations, but the compile step has nothing to map them
to. Fix direction: extend the pipeline with radius/shadow clusters and slot
kinds, then teach the `components` compiler to map `borderRadius`/`boxShadow`
(`packages/cli/src/core/components/compiler.ts`).

### Typography tokens conflate size/weight with other type props

`primitives` splits the typography bucket into size vs weight prop unions by
value shape (`/px|rem|em$/` → `FontSizeName`, else → `FontWeightName`,
`packages/cli/src/core/primitives/compiler.ts`). But the analyze extractor
feeds *all* typography props — including `lineHeight`, `letterSpacing`,
`wordSpacing` (`packages/cli/src/core/ast/cssProperties.ts`) — through the same
bucket when the value matches `TYPO_VALUE_REGEX`
(`packages/cli/src/core/pipeline/extractor.ts`). So a `lineHeight: '1.5'` is
classified as a weight name and `letterSpacing: '2px'` as a size name, producing
semantically wrong prop output in the compiled primitives.

Fix direction: carry the cssProperty through `ExtractedValue` →
`NormalizedValue` → `Cluster` → `TokenProposal` so the compiler can separate
sizes from weights properly, then make only genuinely ambiguous values (no
unit) default to weights.
