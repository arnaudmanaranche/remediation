# TODO — remediation

Known limitations and follow-up work, captured with full context so any of
these can be picked up cold. Ordered by rough value/effort ratio.

Background: the `analyze` command runs a pipeline
`extract → normalize → cluster → decide → codemod`
(`packages/cli/src/core/pipeline/`). The `scan` command uses a *separate*,
more accurate AST extractor (`packages/cli/src/core/ast/extractor.ts`) via the
rules in `packages/cli/src/core/rules/`. The two extractors diverge — see item 3.

Test suite: `pnpm --filter './packages/cli' run test` (64 tests). Fixture for
manual runs: `fixtures/bad-ds/` (a deliberately messy component set). Build:
`pnpm --filter './packages/cli' run build`, then
`node packages/cli/dist/index.js analyze <path> --codemod [--no-dry-run]`.

---

## 1. Auto-generated token names collide into meaningless suffixes

**Symptom.** Two distinct clusters that map to the same scale name get numeric
suffixes: `spacing.md` / `spacing.md2`, `colors.blue` / `colors.blue2` /
`colors.blue3`. On a real codebase this produces a token set nobody can read.

Reproduce:
```
node packages/cli/dist/index.js analyze fixtures/bad-ds --codemod
# → padding: `${spacing.sm} ${spacing.md2}`   ← md2 is meaningless
```

**Root cause.** `getSuggestedNames()` in
`packages/cli/src/core/pipeline/clusterer.ts` assigns a base name via
`suggestName()` (e.g. two spacing clusters at 15px and 16px both bucket to
`md`), then disambiguates with a running counter → `md`, `md2`. The suffix
carries no meaning and the choice of which cluster "wins" `md` is order-dependent.

**Why it happens.** `suggestName()` maps to a coarse fixed scale (xs/sm/md/lg/
xl/xxl for spacing; size/weight scales for typography). Nearby-but-distinct
values land in the same bucket. Clustering (`clusterValues`) only merges values
within a tiny distance (spacing `<= 2px`, color distance `< 30`), so 15px and
16px stay separate clusters yet both name to `md`.

**Options.**
- Encode the value in the name instead of a counter: `spacing.15` / `spacing.16`,
  or `spacing.md` / `spacing.md-15` — self-describing, stable, order-independent.
- Widen the clustering threshold so near values merge into one token (changes
  behavior: fewer tokens, some values snap). Tune `spacingDistance` cutoff in
  `clusterValues`.
- Let config pin names (already works via the `tokens` map for declared values;
  the gap is only *auto* names). Could emit a warning suggesting the user add a
  `tokens` entry for any auto-suffixed name.

**Files.** `packages/cli/src/core/pipeline/clusterer.ts`
(`suggestName`, `getSuggestedNames`, `clusterValues`).

---

## 2. CSS-in-JS template literals are not codemodded

**Symptom.** `styled.div\`color: #2563eb; padding: 8px;\`` and
`css\`...\`` are detected by `scan` (violations reported) but the codemod leaves
them untouched — only `style={{ ... }}` object properties are rewritten.

**Root cause.** `collectFileWork()` in
`packages/cli/src/core/pipeline/codemod.ts` only visits `ObjectProperty`
nodes. It never handles `TaggedTemplateExpression`. The scan-side AST extractor
(`packages/cli/src/core/ast/extractor.ts`, `extractFromTemplateLiteral`)
already knows how to *read* these; the codemod has no matching *writer*.

**Why it's harder.** A styled template is a multi-quasi `TemplateLiteral`
(`quasis` + `expressions`). Rewriting a value inside a quasi means splitting the
quasi and inserting a new `${...}` expression, i.e. editing the template's
internal structure by offset, not just replacing one value node. Care needed
around existing `${...}` interpolations and around the `;`/newline CSS syntax.

**Approach.** In `collectFileWork`, add a branch for
`TaggedTemplateExpression` where the tag is styled/css (reuse the `isStyled`
check from `ast/extractor.ts`). For each quasi, run the existing
`buildExpression()` logic on the CSS text, but emit offset edits *inside* the
quasi range (`quasi.start`..`quasi.end`) turning matched sub-values into
`${colors.x}`. Reuse `extractFromTemplateLiteral`'s line/column parsing to
locate values. Add tests mirroring the `style={{}}` cases.

**Files.** `packages/cli/src/core/pipeline/codemod.ts`;
reference `packages/cli/src/core/ast/extractor.ts`.

---

## 3. The analyze pipeline extractor is line-coarse (misses values on mixed lines)

**Symptom.** On a line with several style props, spacing values are missed by
`analyze` (and therefore never proposed or codemodded). Example from the fixture
(`fixtures/bad-ds/src/components/Card.tsx`):
```jsx
<h2 style={{ color: '#27272a', fontSize: '18px', marginBottom: '12px' }}>
```
`analyze` extracts the color `#27272a` but **silently drops
`marginBottom: '12px'`** — verified: the codemod rewrites the color on this line
and leaves both other values untouched. (The `12px` is lost at *extraction*; the
`18px` is a separate story — it's extracted but a single occurrence, so it falls
under the proposal threshold in `decision.ts`.)

**Root cause.** `extractFromFile()` in
`packages/cli/src/core/pipeline/extractor.ts` is regex-and-line based:
- `isTypography` is computed for the *whole line* (`line.includes('fontSize')`),
  so the entire line is treated as typography and the spacing branch
  (`if (!isTypography) { ...spacing... }`) is skipped → `12px` marginBottom lost.
- Typography size uses a single `line.match(...)` → only the first unit value on
  the line is captured.

Meanwhile `scan` uses the AST extractor (`core/ast/extractor.ts`), which is
per-property and correct. So `scan` and `analyze` disagree on the same file.

**Approach (bigger, principled).** Migrate the analyze pipeline to consume the
AST extractor (`extractStyleValues`) instead of the regex extractor, mapping
`StyleValue { cssProperty, rawValue }` → pipeline `ExtractedValue { type, value }`
by classifying `cssProperty` via the prop sets in
`packages/cli/src/core/ast/cssProperties.ts`
(COLOR_PROPS→color, SPACING_PROPS/RADIUS_PROPS→spacing, TYPOGRAPHY_PROPS→typography).

**Caveat that blocked doing it already.** The AST extractor returns *whole*
values (e.g. `boxShadow: '0 1px 3px rgba(0,0,0,0.12)'`, `border: '1px solid #eee'`
as one string), whereas the pipeline normalizer expects a single color or a
single length. Compound values would normalize ambiguously. A migration must
first split compound `rawValue`s into their sub-values (the same
`VALUE_TOKEN_REGEX` tokenization the codemod already uses in
`buildExpression`) before normalization. Factor that tokenizer out and share it.

**Files.** `packages/cli/src/core/pipeline/extractor.ts` (replace/augment),
`packages/cli/src/core/ast/extractor.ts` (reuse),
`packages/cli/src/core/ast/cssProperties.ts` (classification),
`packages/cli/src/core/pipeline/codemod.ts` (`VALUE_TOKEN_REGEX` to share).

---

## 4. Shorthand `border` / `background` props are not targeted

**Symptom.** `border: '1px solid #e4e4e7'` is never flagged or codemodded, even
though `#e4e4e7` may be a declared token. Only the longhand color props
(`borderColor`, `backgroundColor`, …) are recognized.

**Root cause.** By design, `ALL_STYLE_PROPS` in
`packages/cli/src/core/ast/cssProperties.ts` lists longhand props only. The
codemod and scan both key off this set, so shorthands are consistently ignored.

**Approach.** Add `border`, `background`, `outline`, `boxShadow` (already
present), etc. to the relevant prop sets. The codemod already handles compound
values via template literals, so once the prop is recognized,
`border: '1px solid #e4e4e7'` → `` `1px solid ${colors.gray200}` `` works.
Verify the scan rules do something sensible with the shorthand too (they read
the same sets). Add fixture coverage.

**Files.** `packages/cli/src/core/ast/cssProperties.ts` (+ rule/codemod tests).

---

## 5. Config `tokens` map can't map numeric font weights

**Symptom.** A config entry like `tokens: { '600': 'typography.semibold' }` is
silently ignored; `600` is only tokenized via the *auto* typography path.

**Root cause.** `buildConfigTokenMap()` in
`packages/cli/src/core/pipeline/index.ts` normalizes each config key with
`toCanonical()` (`packages/cli/src/core/pipeline/normalizer.ts`), which only
recognizes colors and lengths (px/rem/em). A bare number returns `null`, so the
entry is dropped from the config→canonical map.

**Approach.** Extend `toCanonical()` (or add a typography branch in
`buildConfigTokenMap`) to accept bare numeric / `bold` / `normal` weight keys and
map them into the typography lookup. Mind the color/spacing vs typography
lookup split already present in the codemod (`buildLookups`).

**Files.** `packages/cli/src/core/pipeline/normalizer.ts` (`toCanonical`),
`packages/cli/src/core/pipeline/index.ts` (`buildConfigTokenMap`).

---

## Done this session (for reference — do not redo)

- `--no-dry-run` now actually applies the codemod (Commander negatable option).
- Codemod respects the config `tokens` map (declared names, not auto names).
- Codemod never rewrites `remediation.config.js` (excluded from extraction).
- Codemod rewritten to AST/offset edits: bare refs for whole values, template
  literals for compound/shorthand values, token imports injected from a new
  `tokensImport` config field (with a warning fallback when unset).
- Typography is clustered, proposed, and codemodded — including numeric
  `fontWeight` (`600` → `typography.semibold`).
- Website builds/deploys via pnpm (stray `package-lock.json` removed).
