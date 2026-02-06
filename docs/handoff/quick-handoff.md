# Quick Handoff

Point-in-time session snapshot for continuing 0.3.0 release preparation.

## Current state

- Monorepo: `gantryland` (`@gantryland/*` packages, Node + TypeScript workspaces)
- Latest commit: `30edb93` (`docs: add handoff guides and normalize release documentation`)
- Last validation run passed (`npm run release:status`, build/tests, 182 tests)

## What changed

- Release docs are standardized under `docs/releasing/`
- Root release scripts in `package.json` are simplified and aligned with docs
- Handoff docs are now organized under `docs/handoff/`

## Release commands

- `npm run release:changeset`
- `npm run release:changelog`
- `npm run release:guard:changeset`
- `npm run release:status`
- `npm run release:check`
- `npm run release:ready`
- `npm run changeset:publish`

## What is next

1. Do a final doc/script consistency pass.
2. Run `npm run release:changelog` and review version/changelog diffs.
3. Run `npm run release:ready`.
4. Prepare the final release commit/PR and publish sequence.

## Constraints

- Keep changes minimal and intentional.
- Preserve Gantryland terminology consistency (`Task`, `TaskFn`, `AbortError`, cancellation semantics).
- Keep doc structure clear: index files + scoped guides + explicit boundaries.
