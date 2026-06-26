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
| `--codemod` | Apply token replacements automatically |
| `--dry-run` | Preview changes without applying (default) |
| `--output <file>` | Generate `tokens.ts` file |
| `--min-confidence <level>` | Filter by confidence (`high`, `medium`, `low`) |

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
⚡ Scanning... 26/26 [token-bypass] [drift]
⚡ Scanned 26 files in 1.2s

Violations by file:
  src/components/Button.tsx 3W
  src/components/ButtonPrimary.tsx 2W

┌─ Summary ─────────────────────────────┐
│  ⚠  12 warnings  ████████░░░░░░░
│  ─────────────────────────────────────
│  12 total violations
└────────────────────────────────────────┘

┌─ Health Score ─────────────────────────┐
│  ██████████████████░░░░░░░░░░░░  62/100
│  Needs work
│
│  ████████████████████████░░░░░░  82/100
│  Potential after fixes
└────────────────────────────────────────┘
```

Health score: **100 = clean codebase, 0 = critical**. Labels: Excellent / Good / Needs work / Poor / Critical.

### Analyze output

```
⚡ Analyzing design system...
⚡ Analysis complete in 0.0s

┌─ Extraction ──────────────────────────┐
│  140 design values found
│  colors       117
│  spacing      18
│  typography   5
└────────────────────────────────────────┘

┌─ Color Clusters ──────────────────────┐
│  #ea580c 17x (3 files)
│  #2563eb 13x (2 files)
│  #ffffff 10x (4 files)
│  #93c5fd 6x (3 files)
└────────────────────────────────────────┘

┌─ Token Proposals ─────────────────────┐
│  19 tokens proposed
│  ● 6 high confidence
│  ● 11 medium confidence
│  ● 2 low confidence
│
│  Top proposals:
│    ● red = #ea580c (17x)
│    ● blue = #2563eb (13x)
│    ● white = #ffffff (10x)
└────────────────────────────────────────┘
```

### Codemod preview

```
Codemod Preview
════════════════════════════════════════════════════════════

📄 src/components/Button.tsx
────────────────────────────────────────────────────────────
  L16:60  "#93C5FD" → colors.blue
  L49:90  "#EA580C" → colors.red

Total: 50 changes in 10 files
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
