# Consumer Confidence Guide

This guide helps teams evaluate runtime compatibility, upgrade risk, and release impact before adopting `@gantryland/*` packages.

## Compatibility matrix

| Surface | Support policy | Notes |
| --- | --- | --- |
| Node.js runtime | `>=20` | Enforced via `engines.node` in the root and workspace packages. |
| TypeScript consumers | `>=5.5` recommended | Declarations are built and validated in this repo with TypeScript 5.5.x. |
| React (where relevant) | `>=18` | Applies to `@gantryland/task-hooks` via peer dependency. |

## Deprecation and migration policy

- Deprecations are announced in package changelogs and release notes before removal.
- Deprecated APIs stay available for at least one minor release unless a security issue requires faster removal.
- Breaking removals include a migration section with before/after examples.
- Major-version upgrades include a migration checklist for package-level changes.

## Package lifecycle markers

Lifecycle markers communicate support expectations:

- `stable`: production-ready and covered by normal semver guarantees.
- `beta`: usable but may receive API adjustments before `stable`.
- `experimental`: early API with higher churn risk.

Current package lifecycle map:

| Package | Lifecycle |
| --- | --- |
| `@gantryland/task` | stable |
| `@gantryland/task-cache` | stable |
| `@gantryland/task-combinators` | stable |
| `@gantryland/task-hooks` | stable |
| `@gantryland/task-logger` | stable |
| `@gantryland/task-observable` | stable |
| `@gantryland/task-router` | stable |
| `@gantryland/task-scheduler` | stable |
| `@gantryland/task-storage` | stable |
| `@gantryland/task-validate` | stable |

## Changelog conventions by bump type

- `patch`: bug fixes, docs updates, and internal refactors without API breakage.
- `minor`: additive APIs, new exports, and backward-compatible behavior additions.
- `major`: breaking API removals/renames or incompatible behavior changes.

See `docs/releasing/process.md` for release command workflow and bump decision details.
