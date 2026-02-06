# Tooling Modernization and Strictness TODO

Target: adopt a fast, unified lint/format workflow, tighten TypeScript strictness, and standardize editor automation for this monorepo.

## P0 - Select and install unified tooling

- [ ] Adopt Biome as the primary lint + format tool for JS/TS/JSON/Markdown.
- [ ] Add Biome config (`biome.json` or `biome.jsonc`) with strict lint defaults.
- [ ] Add root scripts for linting and formatting (`lint`, `lint:fix`, `format`, `format:check`).
- [ ] Remove or avoid parallel formatter/linter overlap (no duplicate Prettier/ESLint pipeline unless explicitly needed).

## P0 - VSCode project automation

- [ ] Add `.vscode/settings.json` and commit it.
- [ ] Enable format-on-save and code actions on save for this workspace.
- [ ] Set Biome as the default formatter for supported file types.
- [ ] Ensure editor behavior is consistent with `.editorconfig` and CI checks.

## P0 - TypeScript strictness hardening

- [ ] Add explicit `typecheck` script and enforce it in CI.
- [ ] Tighten strict compiler flags in shared TS config where safe.
- [ ] Fix resulting type issues across packages.
- [ ] Document any intentionally deferred strictness flags with rationale.

## P1 - CI and policy alignment

- [ ] Update CI workflow to run `lint`, `format:check`, `typecheck`, `build`, and `test`.
- [ ] Keep checks deterministic and non-interactive in CI.
- [ ] Ensure failure messages are clear and actionable.

## P1 - Repository cleanup and docs

- [ ] Document local developer workflow for lint/format/typecheck commands.
- [ ] Add a short section in `CONTRIBUTING.md` about autoformat and strict checks.
- [ ] Confirm no conflicting formatting assumptions remain in docs/code.

## P1 - Authoring policy enforcement

- [ ] When package source code changes, review and validate the package against `docs/authoring/source-code.md`.
- [ ] When JSDoc changes, validate against `docs/authoring/jsdoc.md`.
- [ ] When package README/docs change, validate against `docs/authoring/package-docs.md`.
- [ ] When tests change, validate against `docs/authoring/tests.md`.
- [ ] Add a contributor note documenting this authoring-gate requirement for all package-level changes.

## Verification checklist

- [ ] `npm run lint` passes.
- [ ] `npm run format:check` passes.
- [ ] `npm run typecheck` passes.
- [ ] `npm run build` passes.
- [ ] `npm test` passes.
- [ ] CI workflow passes with the expanded quality gate set.
