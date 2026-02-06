# Contributing

Thanks for contributing to gantryland.

## Local quality workflow

Run these checks before opening a PR:

```bash
npm run lint
npm run format:check
npm run typecheck
npm run build
npm test
```

Use `npm run format` and `npm run lint:fix` to apply autoformat and safe fixes locally.

## Autoformat and strict checks

- This repo uses Biome as the source of truth for linting and formatting.
- Workspace `.vscode/settings.json` enables format-on-save and Biome code actions on save.
- CI enforces `lint`, `format:check`, `typecheck`, `build`, `test`, and release guard checks.

## TypeScript strictness policy

`strict` mode is enabled for all packages with additional flags: `noImplicitOverride`, `noUncheckedIndexedAccess`, and `noFallthroughCasesInSwitch`.

Deferred strictness flags:

- `exactOptionalPropertyTypes`: deferred until package option types are refactored to avoid broad API churn.
- `noPropertyAccessFromIndexSignature`: deferred until map-like helper APIs are normalized across packages.

## Package-level authoring gate

When changing package-level files, validate your edits against the authoring guides before merging:

- Source code changes: `docs/authoring/source-code.md`
- JSDoc changes: `docs/authoring/jsdoc.md`
- Package README/docs changes: `docs/authoring/package-docs.md`
- Tests changes: `docs/authoring/tests.md`

## Changesets

We use Changesets to manage versions and changelogs for the `@gantryland/*` packages.

When you make a change that should be released, add a changeset:

```bash
npx changeset
```

Choose the version bump based on the impact:

- Patch: bug fixes, small refactors, docs changes
- Minor: new features, additive API changes
- Major: breaking changes

## Local release (manual)

```bash
npm run release:status
npm run release:changelog
npm run release:check
npm run release:publish
```

For bump policy and coordinated monorepo release guidance, see `docs/releasing/process.md`.
For session continuity and handoff standards, see `docs/handoff/README.md`.
For support and security reporting, see `SUPPORT.md` and `SECURITY.md`.
