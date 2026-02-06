# OSS Structure and Conventions TODO

Target: remove unconventional monorepo setup patterns and align Gantryland with enterprise-grade OSS expectations.

## P0 - CI and release safety

- [x] Add a core CI workflow for pull requests to `main`.
- [x] Enforce required checks: `npm run build`, `npm test`, and `npm run release:guard:changeset`.
- [ ] Add typecheck/lint checks if introduced, and make them required status checks.
- [x] Verify CI uses a pinned Node version strategy that matches documented support.

## P0 - Publish script hardening

- [x] Rename root `publish` script to `publish:workspaces` to avoid npm lifecycle confusion.
- [x] Add a release-safe publish path that always builds before packaging/publish.
- [x] Add `prepack` safeguards (root or package level) so tarballs cannot be published stale.
- [x] Confirm dry-run packaging remains clean after script changes.

## P1 - OSS trust and governance files

- [x] Add `SECURITY.md` with disclosure channel and response expectations.
- [x] Add `SUPPORT.md` defining support scope and communication channels.
- [x] Add `CODE_OF_CONDUCT.md` for contributor behavior standards.
- [x] Add `CODEOWNERS` to define review ownership for packages and docs.

## P1 - Runtime and contributor consistency

- [x] Add `engines.node` policy in root `package.json`.
- [x] Propagate `engines` to workspace packages where appropriate.
- [x] Add `.editorconfig` for baseline editor consistency.
- [ ] Verify no conflicting formatting assumptions in existing docs and code.

## Verification checklist

- [ ] New CI workflow passes on a test PR.
- [ ] Required checks are enabled in branch protection.
- [x] Publish command naming is unambiguous and documented.
- [x] Packaging/publish dry-run succeeds for all workspaces.
- [x] New governance files are linked from root docs.
