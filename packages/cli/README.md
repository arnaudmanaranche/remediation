# remediation

CLI that scans React codebases for design system drift — hardcoded colors, spacing,
typography, radius, and shadows that should use design tokens, near-duplicate
components, and token bypasses. Returns a 0–100 health score and a full violation
list, and can rewrite your sources to token references with a safe codemod.

- Docs: https://remediation.dev
- Source: https://github.com/arnaudmanaranche/remediation

## Install

```bash
npx remediation scan          # run directly
npm install -g remediation    # or install globally
```

## Commands

### scan

```bash
remediation scan [path] [flags]
```

Scans the project for all rule violations. Exit code is `1` when any
`error`-severity violation is found — CI-ready.

| Flag | Description |
|------|-------------|
| `--verbose` | Show all violations in the terminal |
| `--output <file>` | Write the full report to a file |
| `--rule <pattern>` | Filter by rule name (e.g. `colors`, `drift`) |
| `--format json` | Output results as JSON |
| `--save-baseline` | Save current violations as baseline |
| `--ignore-baseline` | Skip the baseline file even if present |

### tokens

```bash
remediation tokens [path] [flags]
```

Shorthand for `scan --rule colors/,spacing/,typography/,radius/,shadows/` — runs
only the hardcoded-value rules.

### analyze

```bash
remediation analyze [path] [flags]
```

Runs the full pipeline (`extract → normalize → cluster → decide → codemod`) and
proposes a token set from the values already in your codebase:

```bash
remediation analyze . --codemod               # preview rewrites (dry run)
remediation analyze . --codemod --no-dry-run  # apply rewrites
remediation analyze . --output tokens.ts      # emit proposed token file
```

The codemod edits source in place via AST offsets — it never reformats files.
Whole-value literals become bare references (`'#1976D2'` → `colors.primary`),
compound/shorthand values become template literals
(`'8px 16px'` → `` `${spacing.sm} ${spacing.md}` ``), CSS-in-JS tagged templates
(`styled.div\`...\``) are rewritten with `${...}` interpolations, and token imports
are injected from the configured `tokensImport` module.

### init

Interactive wizard that creates a `remediation.config.js`.

## Rules

| Rule | Description |
|------|-------------|
| `colors/hardcoded` | Hardcoded color values (hex, rgb, hsl) — including inside shorthand values like `border: '1px solid #eee'` |
| `spacing/hardcoded` | Hardcoded spacing values (px, rem, em) |
| `typography/hardcoded` | Hardcoded font sizes and weights |
| `radius/hardcoded` | Hardcoded border-radius values |
| `shadows/hardcoded` | Hardcoded box-shadow values |
| `token-bypass` | A hardcoded value is used although a matching token exists in config |
| `drift` | Near-duplicate components that should be merged |

## Configuration

Create `remediation.config.js` at the project root (or run `remediation init`):

```js
module.exports = {
  ignore: ['**/*.test.tsx', '**/*.stories.tsx'],
  rules: {
    'colors/hardcoded': 'error',   // error → exit code 1
    'token-bypass':     'off',
  },
  // hardcoded value → your token name; powers token-bypass and names the codemod output
  tokens: {
    '#1976D2': 'colors.primary',
    '16px':    'spacing.md',
  },
  // module the codemod injects token imports from
  tokensImport: '@/design/tokens',
};
```

## Baseline

Adopt on a legacy codebase without failing on pre-existing debt:

```bash
npx remediation scan --save-baseline   # once — commit .remediation-baseline.json
npx remediation scan                   # then only new violations are reported
```

## CI usage

```yaml
- name: Scan design system
  run: npx remediation scan --format json --output report.json
```

Fails the workflow when `error`-severity rules are violated.

## Telemetry

Anonymous usage data (command name, duration, violation counts, versions) is sent
via OpenTelemetry — never file paths, code, or identifiers. Disable with
`--no-telemetry`, `REMEDIATION_TELEMETRY=0`, or `DO_NOT_TRACK=1`.

## License

MIT
