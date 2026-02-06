# Contributing

Thanks for contributing to gantryland.

## Fast path

Run the full gate locally before opening a PR:

```bash
npm run release:check
```

Use `npm run format` and `npm run lint:fix` to apply autoformat and safe fixes locally.

`release:check` runs: lint, format check, typecheck, build, API delta check, and coverage tests.

CI also runs `npm run release:guard:changeset`.

Details: `docs/ci/quality-gates.md`.

Follow `docs/authoring/README.md` for package source/docs/test edits.

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

## Release

```bash
npm run release:status
npm run release:changelog
npm run release:check
npm run release:publish
```

For bump policy and coordinated monorepo release guidance, see `docs/releasing/process.md`.
For support and security reporting, see `SUPPORT.md` and `SECURITY.md`.
