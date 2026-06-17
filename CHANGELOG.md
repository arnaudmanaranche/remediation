# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.10.0] - 2026-06-17

### Added
- `--codemod` flag to apply token replacements automatically
- `--dry-run` flag to preview changes before applying
- Codemod preview showing file-by-file changes

## [0.9.0] - 2026-06-17

### Added
- `remediation analyze` command for design system analysis
- Full pipeline: EXTRACTION → NORMALIZATION → CLUSTERING → DECISION
- Color clustering using color distance algorithm
- Spacing clustering with proximity detection
- Token proposals with confidence levels (high, medium, low)
- `--output tokens.ts` to generate design system file

## [0.8.0] - 2026-06-17

### Added
- `token-bypass` rule: detects hardcoded values when a token already exists
- `drift` rule: detects duplicate components that should be merged
- "UI Health Score" replaces "Risk Score"
- "Potential score after fixes" in output

### Removed
- `components/dead` rule (knip integration)
- `components/duplicates` rule (jscpd integration)
- `components/variant-split` rule (false positives with Radix/shadcn/MUI)

## [0.7.3] - 2026-06-17

### Added
- Unit tests with Vitest (29 tests)
- Tests for all token rules (colors, spacing, typography, radius, shadows)
- Tests for component rules (variant-split)
- Tests for config loader

### Fixed
- Fix stateful regex bug in shadows rule

## [0.7.2] - 2026-06-17

### Fixed
- Use relative paths in output instead of absolute paths
- Default to dry-run mode (no auto-fix without explicit flag)
- Logarithmic risk score to prevent 100/100 saturation

### Added
- `--rule <pattern>` flag to filter violations by rule name
- Expanded color token suggestions (Tailwind-like colors)

## [0.7.1] - 2026-06-17

### Added
- Default ignore patterns for build output directories (dist, build, .next, out, coverage, etc.)

## [0.7.0] - 2026-06-17

### Added
- `--verbose` flag to show all violations in terminal
- `--output <file>` flag to write report to file
- Compact output by default (violations by file with counts)
- Report file format with summary and risk score

## [0.6.0] - 2026-06-17

### Added
- Progress indicator with file count during scan
- Scan completion summary with file count and elapsed time

## [0.5.0] - 2026-06-17

### Added
- `radius/hardcoded` rule: detects hardcoded border-radius values (px, rem, em)
- `shadows/hardcoded` rule: detects hardcoded box-shadow values

## [0.4.0] - 2026-06-17

### Added
- Improved terminal output with picocolors
- Progress bar for risk score visualization
- Severity icons (✖, ⚠, ℹ)
- Visual summary with breakdown by severity
- Risk level labels (Low, Medium, High, Critical)

## [0.3.0] - 2026-06-17

### Added
- Configuration file support (`remediation.config.js`)
- Ignore patterns (glob syntax) to exclude files from scanning
- Rule toggling (`off`, `warning`, `error`, `info`)
- Custom token mappings (value → token name)

## [0.2.0] - 2026-06-17

### Added
- `components/variant-split` rule: detects components with conditional rendering based on variant props (variant, size, type, kind) that should be split into separate components
- Ternary detection (single-line and multi-line)
- Switch statement detection

## [0.1.2] - 2026-06-17

### Fixed
- Remove dead packages/core directory
- Add root tsconfig.json
- Update .gitignore with comprehensive ignore rules

## [0.1.1] - 2026-06-17

### Fixed
- npm publish configuration

## [0.1.0] - 2026-06-17

### Added
- Initial release
- Token rules: `colors/hardcoded`, `spacing/hardcoded`, `typography/hardcoded`
- Token transforms: auto-replace hardcoded values with token references
- Component rules: `components/dead` (knip), `components/duplicates` (jscpd)
- CLI commands: `scan`, `tokens`, `components`
- `--dry-run` flag for preview mode
- `--format json` for CI/CD output
- Risk scoring per file
- Git checkpoint before auto-fix
