# Tooling Modernization and Strictness TODO

Target: adopt a fast, unified lint/format workflow, tighten TypeScript strictness, and standardize editor automation for this monorepo.

## P0 - Select and install unified tooling

- [x] Adopt Biome as the primary lint + format tool for JS/TS/JSON/Markdown.
- [x] Add Biome config (`biome.json` or `biome.jsonc`) with strict lint defaults.
- [x] Add root scripts for linting and formatting (`lint`, `lint:fix`, `format`, `format:check`).
- [x] Remove or avoid parallel formatter/linter overlap (no duplicate Prettier/ESLint pipeline unless explicitly needed).

## P0 - VSCode project automation

- [x] Add `.vscode/settings.json` and commit it.
- [x] Enable format-on-save and code actions on save for this workspace.
- [x] Set Biome as the default formatter for supported file types.
- [x] Ensure editor behavior is consistent with `.editorconfig` and CI checks.

## P0 - TypeScript strictness hardening

- [x] Add explicit `typecheck` script and enforce it in CI.
- [x] Tighten strict compiler flags in shared TS config where safe.
- [x] Fix resulting type issues across packages.
- [x] Document any intentionally deferred strictness flags with rationale.

## P1 - CI and policy alignment

- [x] Update CI workflow to run `lint`, `format:check`, `typecheck`, `build`, and `test`.
- [x] Keep checks deterministic and non-interactive in CI.
- [x] Ensure failure messages are clear and actionable.

## P1 - Repository cleanup and docs

- [x] Document local developer workflow for lint/format/typecheck commands.
- [x] Add a short section in `CONTRIBUTING.md` about autoformat and strict checks.
- [x] Confirm no conflicting formatting assumptions remain in docs/code.

## P1 - Authoring policy enforcement

- [x] When package source code changes, review and validate the package against `docs/authoring/source-code.md`.
- [x] When JSDoc changes, validate against `docs/authoring/jsdoc.md`.
- [x] When package README/docs change, validate against `docs/authoring/package-docs.md`.
- [x] When tests change, validate against `docs/authoring/tests.md`.
- [x] Add a contributor note documenting this authoring-gate requirement for all package-level changes.

Authoring validation notes:

- Source code updates were checked for deterministic behavior, AbortError semantics, and API consistency using `docs/authoring/source-code.md`.
- No package JSDoc or package README changes were introduced in this pass; applicable guide checks were explicitly re-validated as no-op.
- Test helper updates were validated for deterministic control-flow patterns and readable assertions using `docs/authoring/tests.md`.

## Verification checklist

- [x] `npm run lint` passes.
- [x] `npm run format:check` passes.
- [x] `npm run typecheck` passes.
- [x] `npm run build` passes.
- [x] `npm test` passes.
- [ ] CI workflow passes with the expanded quality gate set.
