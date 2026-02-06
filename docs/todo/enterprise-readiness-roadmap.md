# Enterprise Readiness Roadmap TODO

Target: move Gantryland from strong OSS readiness to clear enterprise-grade confidence.

## P0 - Trust and governance

- [ ] Add `SECURITY.md` with disclosure process, response SLA, and supported versions.
- [ ] Add `SUPPORT.md` with support scope, response expectations, and contact channels.
- [ ] Add `CODEOWNERS` to define package ownership and review routing.
- [ ] Document release provenance expectations (for example, signed tags and publish policy).

## P0 - CI quality gates

- [ ] Enforce required checks on PRs: build, test, typecheck, and release guard.
- [ ] Add and enforce lint/format checks.
- [ ] Add coverage reporting and minimum coverage thresholds.
- [ ] Add public API delta checks (for example, declaration/API report checks).

Progress notes:

- CI workflow now runs `lint`, `format:check`, `typecheck`, `build`, `test`, and release guard.
- Remaining work is enforcement via required checks in protected-branch policy, plus coverage and API delta automation.

## P1 - OSS consumer confidence

- [ ] Add a compatibility matrix (Node.js, TypeScript, React where relevant).
- [ ] Add deprecation and migration policy.
- [ ] Add package lifecycle/status markers (stable/beta/experimental).
- [ ] Add changelog conventions by bump type (patch/minor/major).

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

- [ ] Deliver all P0 trust/governance docs.
- [ ] Deliver core CI gates and coverage thresholds.
- [ ] Add PR template.

### Week 2

- [ ] Deliver compatibility matrix and deprecation/migration policy.
- [ ] Deliver architecture overview and benchmark harness notes.
- [ ] Publish package lifecycle markers and changelog convention section.

## Exit criteria

- [ ] Required CI checks protect the default branch.
- [ ] Security and support policies are discoverable from root docs.
- [ ] Coverage thresholds are enforced in PR workflows.
- [ ] Public API change process is documented and verified.
- [ ] New consumers can assess adoption risk quickly from docs.
