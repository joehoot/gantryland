# Contributing

Thanks for contributing to gantryland.

## Local workflow

Run the full gate locally before opening a PR:

```bash
npm run release:check
```

Use `npm run format` and `npm run lint:fix` to apply autoformat and safe fixes locally.

## CI gate commands

- `npm run lint`
- `npm run format:check`
- `npm run typecheck`
- `npm run build`
- `npm run api:check`
- `npm run test:coverage`
- `npm run release:guard:changeset`

Details: `docs/ci/quality-gates.md`.

## Tooling and TypeScript

- Biome is the lint/format source of truth.
- TypeScript uses strict mode plus `noImplicitOverride`, `noUncheckedIndexedAccess`, and `noFallthroughCasesInSwitch`.

Deferred strictness flags:

- `exactOptionalPropertyTypes`: deferred until package option types are refactored to avoid broad API churn.
- `noPropertyAccessFromIndexSignature`: deferred until map-like helper APIs are normalized across packages.

## Authoring standard

When changing package source/docs/tests, follow:

- `docs/authoring/README.md`

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

## Local release

```bash
npm run release:status
npm run release:changelog
npm run release:check
npm run release:publish
```

For bump policy and coordinated monorepo release guidance, see `docs/releasing/process.md`.
For support and security reporting, see `SUPPORT.md` and `SECURITY.md`.
