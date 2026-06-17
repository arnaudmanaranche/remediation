# remediation

[![version](https://img.shields.io/npm/v/remediation?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/remediation)
[![downloads](https://img.shields.io/npm/dt/remediation.svg?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/remediation)

CLI tool that scans React source code and detects design system inconsistencies, offering suggestions and automated fixes.

## Installation

```bash
npm install -g remediation
```

Or run directly with npx:

```bash
npx remediation scan
```

## Usage

### Scan all rules

```bash
remediation scan [path]
```

### Scan tokens only

```bash
remediation tokens [path]
```

### Options

| Flag | Description |
|------|-------------|
| `--dry-run` | Preview mode, no changes applied |
| `--verbose` | Show all violations in terminal |
| `--output <file>` | Write report to file |
| `--rule <pattern>` | Filter by rule name (e.g., `colors`, `drift`) |
| `--format json` | Output results as JSON (for CI/CD) |

## Rules

### Token Rules

| Rule | Description |
|------|-------------|
| `colors/hardcoded` | Detects hardcoded color values (hex, rgb, hsl) |
| `spacing/hardcoded` | Detects hardcoded spacing values (px, rem, em) |
| `typography/hardcoded` | Detects hardcoded font sizes and weights |
| `radius/hardcoded` | Detects hardcoded border-radius values |
| `shadows/hardcoded` | Detects hardcoded box-shadow values |

### Analysis Rules

| Rule | Description |
|------|-------------|
| `token-bypass` | Detects hardcoded values when a token already exists |
| `drift` | Detects duplicate components that should be merged |

## Example Output

```
⚡ Scanning... 26/26 [token-bypass] [drift]
⚡ Scanned 26 files in 1.2s

Violations by file:
  src/components/Button.tsx 3W
  src/components/ButtonPrimary.tsx 2W
  src/components/CTAButton.tsx 2W

┌─ Summary ─────────────────────────────┐
│  ⚠   7 warnings  ███████████████
│  ────────────────────────────────────
│    7 total violations
└────────────────────────────────────────┘

┌─ UI Health Score ──────────────────────┐
│  ████████████████████████░░░░░░  82/100
│  High risk
│
│  ██████████████████████████████░  95/100
│  Potential after fixes
└────────────────────────────────────────┘
```

## Configuration

Create a `remediation.config.js` file in your project root:

```js
module.exports = {
  // Ignore files/patterns
  ignore: ['*.test.tsx', '*.stories.tsx'],

  // Enable/disable rules
  rules: {
    'colors/hardcoded': 'off',
    'drift': 'warning',
  },

  // Custom token mappings (for token-bypass)
  tokens: {
    '#1976D2': 'colors.primary',
    '#D32F2F': 'colors.danger',
  },
};
```

### Config Options

| Option | Type | Description |
|--------|------|-------------|
| `ignore` | `string[]` | Glob patterns to exclude from scanning |
| `rules` | `Record<string, string>` | Rule settings (`off`, `warning`, `error`, `info`) |
| `tokens` | `Record<string, string>` | Custom token mappings (value → token name) |

### Default Ignore Patterns

These directories are ignored by default:
`node_modules`, `dist`, `build`, `.next`, `.nuxt`, `out`, `coverage`, `.cache`, `.parcel-cache`, `.webpack`, `.turbo`, `.vercel`, `.netlify`, `tmp`, `temp`

## UI Health Score

The UI Health Score (0-100) measures how well your code follows the design system:

| Score | Label |
|-------|-------|
| 0-29 | Healthy |
| 30-69 | Needs attention |
| 70-89 | Technical debt |
| 90-100 | Critical |

The "Potential after fixes" shows what your score could be after applying available fixes.

## Auto-Fix

When using `--dry-run`, no changes are applied. Without the flag, remediation will attempt to automatically fix violations where possible.

## License

MIT
