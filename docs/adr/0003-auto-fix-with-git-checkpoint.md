# Auto-fix with git checkpoint

Transforms are applied automatically without per-violation confirmation. Before applying, remediation creates a git commit so the user can revert with `git reset` if needed.

This follows the ESLint + Prettier model: fast, non-intrusive, and reversible. Requiring explicit confirmation for each transform would make the tool tedious for large codebases. The git checkpoint provides a safety net without slowing down the workflow.
