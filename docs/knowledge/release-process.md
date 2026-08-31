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
- **Always squash-merge PRs** (enforced at the repo level: merge/rebase commits
  are disabled). Merge commits whose subject carries a Conventional Commit
  prefix cause release-please to emit the same change **twice** — once from the
  merge commit, once from the feature commit — because it cannot tell them
  apart (googleapis/release-please#2476). Keep the Conventional Commit prefix on
  the commit/PR, and let the squash collapse the branch into one commit on main.
