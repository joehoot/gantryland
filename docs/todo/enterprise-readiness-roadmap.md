# Enterprise Readiness Roadmap TODO

Target: move Gantryland from strong OSS readiness to clear enterprise-grade confidence.

## P0 - Trust and governance

- [x] Add `SECURITY.md` with disclosure process, response SLA, and supported versions.
- [x] Add `SUPPORT.md` with support scope, response expectations, and contact channels.
- [x] Add `CODEOWNERS` to define package ownership and review routing.
- [x] Document release provenance expectations (for example, signed tags and publish policy).

## P0 - CI quality gates

- [ ] Enforce required checks on PRs: build, test, typecheck, and release guard.
- [ ] Add and enforce lint/format checks.
- [x] Add coverage reporting and minimum coverage thresholds.
- [x] Add public API delta checks (for example, declaration/API report checks).

Progress notes:

- CI workflow now runs `lint`, `format:check`, `typecheck`, `build`, `test:coverage`, and release guard.
- Coverage thresholds are enforced via `vitest.config.ts` (`lines >=95`, `statements >=95`, `functions >=98`, `branches >=90`).
- API baseline deltas are enforced via `npm run api:check` against snapshots in `docs/api`.
- Required-check policy and provider-agnostic CI guidance are documented in `docs/ci/quality-gates.md`.
- Release provenance expectations are documented in `docs/releasing/provenance.md`.
- Remaining work is protected-branch enforcement in the active CI provider.

## P1 - OSS consumer confidence

- [x] Add a compatibility matrix (Node.js, TypeScript, React where relevant).
- [x] Add deprecation and migration policy.
- [x] Add package lifecycle/status markers (stable/beta/experimental).
- [x] Add changelog conventions by bump type (patch/minor/major).

## P1 - Enterprise adoption readiness

- [ ] Add architecture overview doc with package relationships.
- [ ] Add recommended package-combination playbooks by use case.
- [ ] Add benchmark guidance with reproducible scripts for core packages.
- [ ] Add security posture notes (dependency policy and audit cadence).

## P2 - Contributor throughput

- [ ] Add PR template with tests/docs/changeset/compat checkboxes.
- [ ] Add issue templates (bug, feature, security report).
- [ ] Add contributor onboarding guidance with "good first issue" flow.
- [ ] Add lightweight maintenance cadence notes.

## Suggested 2-week execution plan

### Week 1

- [x] Deliver all P0 trust/governance docs.
- [ ] Deliver core CI gates and coverage thresholds.
- [ ] Add PR template.

### Week 2

- [x] Deliver compatibility matrix and deprecation/migration policy.
- [ ] Deliver architecture overview and benchmark harness notes.
- [x] Publish package lifecycle markers and changelog convention section.

## Exit criteria

- [ ] Required CI checks protect the default branch.
- [x] Security and support policies are discoverable from root docs.
- [ ] Coverage thresholds are enforced in PR workflows.
- [x] Public API change process is documented and verified.
- [x] New consumers can assess adoption risk quickly from docs.

P1 consumer confidence policy is documented in `docs/adoption/consumer-confidence.md`.
