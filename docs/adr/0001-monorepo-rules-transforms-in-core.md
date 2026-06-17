# Monorepo structure with rules and transforms in core

We chose a monorepo with two packages (`core` and `cli`), keeping rules and transforms inside `core` rather than as separate top-level directories.

This keeps the dependency graph simple: `cli` depends on `core`, which owns all scanning logic. Rules and transforms are internal to `core`'s implementation — they don't need to be independently versioned or published. The alternative (separate `rules/` and `transforms/` packages) would add package management overhead without benefit at this stage.

**Update (v0.1.2)**: For publishing, we bundle `core` source into `cli/src/core/` to avoid the `@remediation/core` npm dependency. The monorepo structure remains for development, but the published CLI package is self-contained.
