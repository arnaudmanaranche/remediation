# remediation

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

### Scan components only

```bash
remediation components [path]
```

### Options

- `--dry-run` — Preview mode, shows violations without applying fixes
- `--format json` — Output results as JSON (useful for CI/CD)

## Rules

### Token Rules

| Rule | Description |
|------|-------------|
| `tokens/colors/hardcoded` | Detects hardcoded color values (hex, rgb, hsl) |
| `tokens/spacing/hardcoded` | Detects hardcoded spacing values (px, rem, em) |
| `tokens/typography/hardcoded` | Detects hardcoded font sizes and weights |

### Component Rules

| Rule | Description |
|------|-------------|
| `components/dead` | Detects unused React components using knip |
| `components/duplicates` | Detects duplicate code patterns using jscpd |
| `components/variant-split` | Detects components with conditional rendering based on variant props |

## Example Output

```
src/Button.tsx
  WARNING L4:10 Conditional rendering based on variant — consider splitting into separate components
         Split into separate components based on variant values

1 violations (0 errors, 1 warnings, 0 infos)
Risk score: 2
```

## JSON Output

```json
{
  "files": [
    {
      "path": "src/Button.tsx",
      "violations": [
        {
          "rule": "components/variant-split",
          "file": "src/Button.tsx",
          "line": 4,
          "column": 10,
          "message": "Conditional rendering based on variant — consider splitting into separate components",
          "severity": "warning",
          "suggestion": "Split into separate components based on variant values"
        }
      ],
      "riskScore": 2
    }
  ],
  "summary": {
    "total": 1,
    "errors": 0,
    "warnings": 1,
    "infos": 0
  },
  "riskScore": 2
}
```

## Configuration

Create a `remediation.config.js` file in your project root:

```js
module.exports = {
  // Ignore files/patterns
  ignore: ['*.test.tsx', '*.stories.tsx', 'src/__tests__/**'],

  // Enable/disable rules or change severity
  rules: {
    'colors/hardcoded': 'off',           // Disable rule
    'components/variant-split': 'warning', // Set severity
  },

  // Custom token mappings
  tokens: {
    '#FF0000': 'colors.danger',
    '#00FF00': 'colors.success',
    '16px': 'spacing.4',
  },
};
```

### Config Options

| Option | Type | Description |
|--------|------|-------------|
| `ignore` | `string[]` | Glob patterns to exclude from scanning |
| `rules` | `Record<string, string>` | Rule settings (`off`, `warning`, `error`, `info`) |
| `tokens` | `Record<string, string>` | Custom token mappings (value → token name) |

## Auto-Fix

When not using `--dry-run`, remediation will attempt to automatically fix violations where possible:

- Token violations are replaced with design system token references
- Git checkpoint is created before applying changes

## License

MIT
