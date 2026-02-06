# Enterprise Readiness Roadmap TODO

Target: move Gantryland from strong OSS readiness to clear enterprise-grade confidence.

## P0 - Trust and governance

- [x] Add `SECURITY.md` with disclosure process, response SLA, and supported versions.
- [x] Add `SUPPORT.md` with support scope, response expectations, and contact channels.
- [x] Add `CODEOWNERS` to define package ownership and review routing.
- [x] Document release provenance expectations (for example, signed tags and publish policy).

## P0 - CI quality gates

- [ ] Enforce required checks on PRs/default-branch merges in the active CI provider (build, test, typecheck, release guard, lint/format, coverage, and API delta).
- [x] Add lint/format checks to the CI quality-gate workflow.
- [x] Add coverage reporting and minimum coverage thresholds.
- [x] Add public API delta checks (for example, declaration/API report checks).

Progress notes:

- CI workflow now runs `lint`, `format:check`, `typecheck`, `build`, `test:coverage`, and release guard.
- Coverage thresholds are enforced via `vitest.config.ts` (`lines >=95`, `statements >=95`, `functions >=98`, `branches >=90`).
- API baseline deltas are enforced via `npm run api:check` against snapshots in `docs/api`.
- Required-check policy and provider-agnostic CI guidance are documented in `docs/ci/quality-gates.md`.
- Provider-side required-check verification steps and evidence checklist are documented in `docs/ci/enforcement-runbook.md`.
- Release provenance expectations are documented in `docs/releasing/provenance.md`.
- Remaining work is protected-branch enforcement in the active CI provider.

## P1 - OSS consumer confidence

- [x] Add a compatibility matrix (Node.js, TypeScript, React where relevant).
- [x] Add deprecation and migration policy.
- [x] Add package lifecycle/status markers (stable/beta/experimental).
- [x] Add changelog conventions by bump type (patch/minor/major).

## P1 - Enterprise adoption readiness

- [x] Add architecture overview doc with package relationships.
- [x] Add recommended package-combination playbooks by use case.
- [x] Add benchmark guidance with reproducible scripts for core packages.
- [x] Add security posture notes (dependency policy and audit cadence).

## P2 - Contributor throughput (not planned for solo-maintained repo)

- [x] N/A: PR template with tests/docs/changeset/compat checkboxes (not needed for solo-maintained workflow).
- [x] N/A: issue templates (bug, feature, security report) (not needed for solo-maintained workflow).
- [x] N/A: contributor onboarding guidance with "good first issue" flow (not needed for solo-maintained workflow).
- [x] N/A: lightweight maintenance cadence notes (tracked operationally outside public templates).

## Suggested 2-week execution plan

### Week 1

- [x] Deliver all P0 trust/governance docs.
- [x] Deliver core CI gates and coverage thresholds.
- [x] N/A: add PR template (solo-maintained repo).

### Week 2

- [x] Deliver compatibility matrix and deprecation/migration policy.
- [x] Deliver architecture overview and benchmark harness notes.
- [x] Publish package lifecycle markers and changelog convention section.

## Exit criteria

- [ ] Required CI checks protect the default branch.
- [x] Security and support policies are discoverable from root docs.
- [ ] Coverage thresholds are enforced in provider-validated PR/default-branch workflows.
- [x] Public API change process is documented and verified.
- [x] New consumers can assess adoption risk quickly from docs.

P1 consumer confidence policy is documented in `docs/adoption/consumer-confidence.md`.
P1 enterprise adoption playbooks are documented in `docs/adoption/enterprise-playbooks.md`.

Execution status (provider-side evidence still required):

- Deferred by maintainer for now (since 2026-02-06); resume when CI-provider enforcement work is prioritized.
- Confirm at least one PR/pipeline run where all required checks pass.
- Confirm branch/default-merge protection blocks merges when any required check fails.
