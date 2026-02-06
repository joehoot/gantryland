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
npm run release:version
npm run release:check
npm run release:publish
```

Use the smallest bump that matches user-visible impact:

- Patch: bug fixes, refactors that preserve behavior, docs/tests changes
- Minor: additive exports or optional capabilities
- Major: breaking API or incompatible behavior changes

For support and security reporting, see `SUPPORT.md` and `SECURITY.md`.
