# OSS Structure and Conventions TODO

Target: remove unconventional monorepo setup patterns and align Gantryland with enterprise-grade OSS expectations.

## P0 - CI and release safety

- [x] Add a core CI workflow for pull requests.
- [x] Enforce baseline required checks in CI workflow: `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm run build`, `npm run test:coverage`, and `npm run release:guard:changeset`.
- [ ] Add typecheck/lint checks if introduced, and enforce them as required CI gates.
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
- [x] Verify no conflicting formatting assumptions in existing docs and code.

## Verification checklist

- [ ] New CI workflow passes in a pull-request pipeline run.
- [ ] Required checks are enabled in protected-branch policy.
- [x] Publish command naming is unambiguous and documented.
- [x] Packaging/publish dry-run succeeds for all workspaces.
- [x] New governance files are linked from root docs.

Notes:

- Lint and typecheck jobs now run in CI (`npm run lint`, `npm run format:check`, `npm run typecheck`) as part of the expanded quality gate.
- Public API delta checks now run in CI via `npm run api:check`.
- Coverage thresholds are now enforced in CI via `npm run test:coverage`.
- Provider-agnostic required-check policy is documented in `docs/ci/quality-gates.md`.
- Provider-side required-check validation steps are documented in `docs/ci/enforcement-runbook.md`.
- "Required CI gates" and "PR pipeline pass" still require CI-provider protection policy and a validated pull-request run.
