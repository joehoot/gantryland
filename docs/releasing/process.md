# Releasing Gantryland

This guide defines the release workflow for the `@gantryland/*` monorepo.

Current release scope:

- `@gantryland/task`
- `@gantryland/task-react`
- `@gantryland/task-combinators`
- `@gantryland/task-cache`

## Release commands

Typical local workflow:

```bash
npm run release:changeset
npm run release:status
npm run release:changelog
npm run release:ready
npm run release:publish
```

- `release:changeset`: creates a new `.changeset/*.md` entry.
- `release:status`: non-interactive check for pending changesets plus quality gates.
- `release:changelog`: applies versions and updates package changelogs.
- `release:ready`: guard changesets, apply versions/changelogs, then run quality gates.
- `release:publish`: reruns release checks, then publishes with Changesets.

`release:guard:changeset` is intended for CI pull request checks against `main`.
See `docs/ci/quality-gates.md` for the full provider-agnostic required gate policy.
See `docs/releasing/provenance.md` for signed-tag and publication traceability requirements.

## Bump policy

Use the smallest bump that matches user-visible impact.

### Patch

Use `patch` for:

- Bug fixes that do not break existing public API.
- Internal refactors that preserve behavior.
- Documentation updates and tests-only changes.
- Dependency updates that do not change package APIs.

### Minor

Use `minor` for:

- New exports, new options, or additive API behavior.
- New package capabilities that are backward-compatible.
- Meaningful behavior additions users can opt into.

### Major

Use `major` for:

- Removing or renaming public exports.
- Changing function signatures, return types, or run semantics in incompatible ways.
- Behavior changes that can break existing consumer code.

## Monorepo package selection

When creating a changeset:

- Include every package with direct user-visible changes.
- Include dependent packages only when their published dependency range or runtime behavior changes.
- For coordinated trains (for example, `0.3.0` across all packages), list all packages explicitly.

## Practical examples

- Bug fix without API break -> `patch`.
- Additive API change -> `minor`.
- Breaking API change -> `major`.
