---
name: remediation
description: Use when the user wants to find or fix design-system drift in a React/TS/CSS codebase — hardcoded colors, spacing, typography, radii, or shadows that bypass design tokens; extracting a token set from existing styles; running the remediation CLI (scan / tokens / analyze / init); interpreting its health score or violations; configuring remediation.config.js; applying or reviewing its codemods safely; wiring it into CI; or adopting it incrementally on a legacy codebase via baselines. Not for general UI/design work (use impeccable) or for developing the remediation CLI itself.
version: 1.0.0
---

Eliminate design-system drift with the `remediation` CLI: detect hardcoded values, propose a token set, and rewrite sources to token references — without ever reformatting user code.

## Setup

You MUST do these before proceeding:

1. Confirm the CLI is available: `npx remediation --version` (or `node <path>/packages/cli/dist/index.js --version` inside this monorepo). If missing, install it — do not reimplement its checks by hand.
2. Look for an existing `remediation.config.js` at the project root. If present, read it: its `ignore`, `rules`, `tokens`, and `tokensImport` fields are authoritative and you must respect them. If absent, ask the user whether to run `remediation init` (interactive wizard) or proceed with defaults.
3. Run a first `scan` to see what you're dealing with before proposing any changes.

## Command map

- `remediation scan [path]` — violations + 0–100 health score. **Start here.** Exits 1 on `error`-severity violations (CI-ready). Flags: `--rule <pattern>` filter, `--format json`, `--verbose`, `--save-baseline` / `--ignore-baseline`.
- `remediation tokens [path]` — shorthand for only the hardcoded-value rules (`colors/,spacing/,typography/,radius/,shadows/`), skipping structural ones (`drift`, `token-bypass`). Use when the goal is tokenization, not auditing.
- `remediation analyze [path] --codemod` — full pipeline (extract → normalize → cluster → decide → codemod): proposes a token set and previews rewrites as a **dry run**. Add `--no-dry-run` to actually write files. `--min-confidence high|medium|low` filters proposals; `--output tokens.ts` emits the proposed token module.

## The safe codemod workflow

Never jump straight to `--no-dry-run`. Follow this order:

1. **Preview**: `analyze . --codemod` prints every change (`oldValue → newValue`) per file. Read it — especially template-literal rewrites of compound values like `` '1px solid #e4e4e7' → `1px solid ${colors.gray200}` ``.
2. **Configure names first**: values mapped in config `tokens` keep human names (`'#1976D2': 'colors.primary'`). Unmapped clusters get auto names — clean scale names when unique (`sm`, `md`, `blue`), value-encoded on collision (`spacing.md_16`, `colors.blue_2563eb`). If auto names look bad, add `tokens` entries and re-preview.
3. **Set `tokensImport`** to the module that will export the token roots (`colors`, `spacing`, `typography`). The codemod injects `import { colors, spacing } from '<tokensImport>'` into each edited file. Without it, changes still apply but you must add imports by hand — the tool warns per file.
4. **Apply**: `analyze . --codemod --no-dry-run`.
5. **Verify**: typecheck/build/test the project, and `git diff` the result. The codemod edits in place via AST offsets and never reformats, so diffs should contain only value→reference swaps and injected import lines. Anything else is a bug worth investigating before continuing.

Known rewriting behavior (expected in diffs):
- Whole-value literals become bare references (`'#fff'` → `colors.white`); compound/shorthand values become template literals preserving surrounding text.
- CSS-in-JS tagged templates (`styled.div\`...\``, `css\`...\``) are rewritten in place; existing `${...}` interpolations are never touched.
- Typography includes numeric weights (`fontWeight: 600` → `typography.semibold`).
- Clustered near-values snap to their cluster token (a one-off `3px` clustered with `4px` may be rewritten to the `xs` token whose canonical differs slightly).
- **Translucent colors stay untouched**: `rgba()`/`hsla()` values with alpha < 1 are never rewritten to an opaque token (that would change the rendered output) — expect them to remain hardcoded in the diff.
- Values below the proposal threshold (single occurrences, low confidence) are left untouched — a codemod pass won't reach 100%; iterate or pin names via config `tokens`.

## Interpreting results

- Health score is 0–100 with a "potential after fixes" companion — report both, plus violation counts grouped by rule.
- Rule families: `colors|spacing|typography|radius|shadows/hardcoded` (raw values), `token-bypass` (a configured token exists but the file hardcodes the value — requires the `tokens` map), `drift` (near-duplicate components that should merge).
- Severity comes from config `rules` overrides; only `error` fails the process. When wiring CI, promote the rules that must block merges to `"error"`.

## Adoption on legacy codebases

Large repos drown in first-run violations. Save a baseline once (`scan --save-baseline`), commit the file, and CI uses `--ignore-baseline` so only *new* drift blocks merges. Drive the count down deliberately with codemod passes rather than one big bang.

## Constraints

- Respect the user's config; never edit `remediation.config.js` as part of a codemod pass (the tool excludes it itself).
- The tool collects anonymous telemetry (counts/durations, never code or paths) by default; honor `REMEDIATION_OTEL_ENDPOINT` / opt-out settings if the user mentions privacy concerns.
- Don't hand-edit generated token files and source values inconsistently — after any manual token rename, re-run `scan` to confirm `token-bypass` goes quiet.
