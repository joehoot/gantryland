# Contributing

Thanks for contributing to gantryland.

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
