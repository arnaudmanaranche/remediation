# Release process

Only `packages/cli` (npm package `remediation`) is released. The website is not
published to a registry.

- **release-please** manages versioning + CHANGELOG from Conventional Commits:
  `.github/workflows/release-please.yml`, `release-please-config.json`,
  `.release-please-manifest.json` (holds the current version).
- **`.github/workflows/publish.yml`** publishes to npm on release.
- Changelog sections: `feat` → Features, `fix` → Bug Fixes, `perf` → Performance.
  `refactor` and `chore` are hidden.

## Rules

- Use **Conventional Commit** prefixes, scoped where useful:
  `feat(cli):`, `fix(cli):`, `perf:`, `refactor:`, `chore(website):`, `docs:`.
- **Do not** hand-bump versions or hand-edit `CHANGELOG.md` — release-please owns those.
