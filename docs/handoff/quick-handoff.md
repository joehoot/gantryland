# Quick Handoff

Point-in-time session snapshot for continuing 0.3.0 release preparation and tooling-quality hardening.

## Current state

- Monorepo: `gantryland` (`@gantryland/*` packages, Node + TypeScript workspaces)
- Latest commit: `c154fce` (`chore: harden OSS conventions and release safety`)
- Last validation run passed (`npm run release:status`, build/tests, 182 tests)
- Current working tree has pending docs/todo updates for tooling modernization planning.

## What changed

- Release docs are standardized under `docs/releasing/`
- Root release scripts in `package.json` are simplified and aligned with docs
- Handoff docs are now organized under `docs/handoff/`
- OSS conventions hardening is in place (CI workflow, governance files, `.editorconfig`, engines/prepack safeguards)

## Release commands

- `npm run release:changeset`
- `npm run release:changelog`
- `npm run release:guard:changeset`
- `npm run release:status`
- `npm run release:check`
- `npm run release:ready`
- `npm run release:publish`
- `npm run changeset:publish`

## What is next

1. Implement `docs/todo/tooling-modernization-and-strictness.md` (Biome-first lint/format + strict typecheck + `.vscode` settings).
2. Keep package-level edits aligned with `docs/authoring/*` guides.
3. Expand CI quality gates for lint/format/typecheck/build/test/release guard.
4. Re-run release readiness and prepare final release commit/PR and publish sequence.

## Constraints

- Keep changes minimal and intentional.
- Preserve Gantryland terminology consistency (`Task`, `TaskFn`, `AbortError`, cancellation semantics).
- Keep doc structure clear: index files + scoped guides + explicit boundaries.
