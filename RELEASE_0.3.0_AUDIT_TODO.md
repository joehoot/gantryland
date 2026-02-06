# Gantryland 0.3.0 Release Audit TODO

## Status Legend
- [ ] Pending
- [~] In progress
- [x] Completed

## Global
- [x] Review root documentation and release metadata (`README.md`, authoring guides, root `package.json` scripts)
- [x] Audit all packages for API/JSDoc/README/test alignment
- [~] Apply required fixes across code, docs, and tests
- [ ] Run release-readiness checks (`build`, tests, release checks)
- [ ] Produce final publish-readiness report

## Package Audit Checklist
- [x] `packages/task`
- [x] `packages/task-cache`
- [x] `packages/task-combinators`
- [x] `packages/task-hooks`
- [x] `packages/task-logger`
- [x] `packages/task-observable`
- [x] `packages/task-router`
- [x] `packages/task-scheduler`
- [x] `packages/task-storage`
- [x] `packages/task-validate`

## Findings Log
- Fixed README examples that used `useTask` as an object instead of tuple in `packages/task` and `packages/task-combinators`.
- Fixed `task-scheduler` docs to reflect `Task.run` argument behavior and `pollTask` stop semantics when `run` throws.
- Hardened `matchRoute` against malformed URI segments (now returns `null` instead of throwing) and added coverage.
- Added monorepo release support improvements: CI changeset guard workflow, `release:status`/`release:guard:changeset` scripts, and `RELEASING.md` bump policy.
