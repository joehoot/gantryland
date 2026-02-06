# Release Provenance Policy

This policy defines how Gantryland release artifacts are traced to reviewed source changes.

## Provenance requirements

- Release tags must be annotated and cryptographically signed.
- Release tags must reference commits that passed all required CI quality gates.
- Package publication must run from a clean checkout of the signed release commit.
- Published package versions must match `changeset` outputs for the release commit.

## Signing and traceability

- Use a maintainer-managed signing identity (GPG or Sigstore-compatible signing flow).
- Keep the release tag message stable and include the release date and train identifier.
- Record the tag reference, commit SHA, and published package version list in the release notes.

## Publication controls

- Preferred: publish from CI using short-lived credentials or trusted publishing.
- If manual publish is required, run `npm run release:ready` and `npm run release:publish` from the signed commit only.
- Do not publish from dirty worktrees or detached local patches.

## Verification checklist

Before announcing a release:

1. Confirm required quality gates passed for the release commit.
2. Confirm release tag signature verification succeeds.
3. Confirm published package versions match the release notes.
