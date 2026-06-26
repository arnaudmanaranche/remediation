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

## Commands

### Scan — Detect violations

```bash
remediation scan [path]
```

| Flag | Description |
|------|-------------|
| `--verbose` | Show all violations in terminal |
| `--output <file>` | Write report to file |
| `--rule <pattern>` | Filter by rule name (e.g., `colors`, `drift`) |
| `--format json` | Output results as JSON (for CI/CD) |

### Tokens — Token rules only

```bash
remediation tokens [path]
```

Shorthand for `scan --rule colors/,spacing/,typography/,radius/,shadows/`. Runs only the hardcoded-value rules, skipping structural rules like `drift` and `token-bypass`.

| Flag | Description |
|------|-------------|
| `--verbose` | Show all violations in terminal |
| `--output <file>` | Write report to file |
| `--format json` | Output results as JSON (for CI/CD) |

### Analyze — Design system analysis + codemod

```bash
remediation analyze [path]
```

| Flag | Description |
|------|-------------|
| `--codemod` | Preview token replacements (dry-run by default) |
| `--codemod --no-dry-run` | Apply token replacements to files |
| `--output <file>` | Generate `tokens.ts` file |
| `--min-confidence <level>` | Filter proposals by confidence (`high`, `medium`, `low`) |

## Rules

### Token Rules

Detect hardcoded values that should be replaced with design tokens. Comments and import statements are excluded from analysis to avoid false positives.

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
| `token-bypass` | Detects hardcoded values when a matching token already exists — requires tokens to be configured |
| `drift` | Detects components with similar names or identical JSX structure that should be merged |

## Pipeline

`remediation analyze` runs a full pipeline:

```
EXTRACTION → NORMALIZATION → CLUSTERING → DECISION → CODEMOD
```

1. **Extraction** — Scans codebase for all design values (colors, spacing, typography)
2. **Normalization** — Converts all values to canonical form (hex, px)
3. **Clustering** — Groups similar values using color distance algorithm
4. **Decision** — Proposes tokens with confidence levels (high, medium, low)
5. **Codemod** — Replaces hardcoded values with token references

## Example

### Scan output

```
⚡ ████████████████████████  2423/2423
⚡ Scanned 2423 files in 3.4s

Violations by rule:
  colors/hardcoded             237  ████████████████  45 files
  spacing/hardcoded            102  ██████░░░░░░░░░░  31 files
  token-bypass                  58  ███░░░░░░░░░░░░░  22 files
  typography/hardcoded          21  █░░░░░░░░░░░░░░░  14 files
  drift                          4  █░░░░░░░░░░░░░░░   3 files

Top affected files:
   31  src/components/Button.tsx
   18  src/pages/Dashboard.tsx
   14  src/components/Card.tsx
    9  src/components/Badge.tsx
    8  src/components/Text.tsx
  ... and 40 more files

  Run with --verbose to see all violations, --rule <name> to filter by rule.

┌─ Summary ─────────────────────────────┐
│  ✖  237 errors    ████████████████
│  ⚠  185 warnings  ████████████░░░░
│  ────────────────────────────────────
│  422 total violations
│   45 files affected
└────────────────────────────────────────┘

┌─ Health Score ─────────────────────────┐
│  ██████░░░░░░░░░░░░░░░░░░░░░░░░  18/100
│  Critical
│
│  █████████████░░░░░░░░░░░░░░░░░  41/100
│  Potential after fixes
└────────────────────────────────────────┘
```

Health score: **100 = clean codebase, 0 = critical**. Labels: Excellent / Good / Needs work / Poor / Critical.

### Analyze output

```
⚡ Analyzing design system...
⚡ Analysis complete in 1.2s

┌─ Extraction ──────────────────────────┐
│  284 design values found
│  color        189
│  spacing       71
│  typography    24
└────────────────────────────────────────┘

┌─ Color Clusters ──────────────────────┐
│  #2563eb 5x (5 files)
│  #dc2626 3x (3 files)
│  #ffffff 4x (4 files)
│  #27272a 3x (3 files)
│  ... and 8 more
└────────────────────────────────────────┘

┌─ Spacing Clusters ────────────────────┐
│  8px      9x (6 files)
│  16px     5x (5 files)
│  24px     2x (2 files)
└────────────────────────────────────────┘

┌─ Token Proposals ─────────────────────┐
│  16 tokens proposed
│  ● 4 high confidence
│  ● 12 medium confidence
│
│  Top proposals:
│    ● blue = #2563eb (5x)
│    ● sm = 8px (9x)
│    ● md = 16px (5x)
│    ● red = #dc2626 (3x)
│    ● white = #ffffff (4x)
│    ... and 11 more
└────────────────────────────────────────┘
```

### Codemod preview

```bash
remediation analyze [path] --codemod
```

```
Codemod Preview
════════════════════════════════════════════════════════════

📄 src/components/Button.tsx
────────────────────────────────────────────────────────────
  L14:26  '#2563eb' → colors.blue
  L16:23  16px → spacing.md
  L16:19  8px → spacing.sm
  L15:16  '#ffffff' → colors.white

📄 src/components/Card.tsx
────────────────────────────────────────────────────────────
  L8:18   1px → spacing.xs
  L11:24  16px → spacing.md
  L9:24   8px → spacing.sm
  L7:26   '#ffffff' → colors.white
  L15:27  '#27272a' → colors.black

════════════════════════════════════════════════════════════
Total: 57 changes in 7 files

DRY RUN — no changes applied
Run with --codemod --no-dry-run to apply changes
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

  // Token mappings for the token-bypass rule
  // Maps hardcoded values to their token name in your design system
  tokens: {
    '#1976D2': 'colors.primary',
    '#D32F2F': 'colors.danger',
  },
};
```

The `tokens` map is what powers the `token-bypass` rule: when a hardcoded value matches a key, the rule flags it and suggests the token name as a replacement.

### Default Ignore Patterns

These directories are ignored by default:
`node_modules`, `dist`, `build`, `.next`, `.nuxt`, `out`, `coverage`, `.cache`, `.parcel-cache`, `.webpack`, `.turbo`, `.vercel`, `.netlify`, `tmp`, `temp`

## License

MIT
