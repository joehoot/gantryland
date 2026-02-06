# TODO: Distill Monorepo to 3 Packages

Goal: reduce the published surface to only:

- `@gantryland/task`
- `@gantryland/task-combinators`
- `@gantryland/task-cache`

Non-goals:

- Backward compatibility
- Keeping deprecated adapter packages alive

## Phase 0 - Guardrails

- [ ] Create a dedicated branch for package removal work.
- [ ] Confirm current baseline passes: `npm run release:check`.
- [x] Capture current public API baselines in `docs/api/*` for comparison.

## Phase 1 - Merge or Remove Package Responsibilities

### 1.1 Scheduler -> combinators

- [x] Move `debounce`, `throttle`, and `queue` from `packages/task-scheduler/index.ts` into `packages/task-combinators/index.ts`.
- [x] Decide whether `pollTask` belongs in core; default is remove (runtime orchestration, not task primitive).
- [x] Port only essential tests into `packages/task-combinators/test/task-combinators.test.ts`.
- [x] Remove `packages/task-scheduler` after parity is covered.

### 1.2 Drop framework and protocol adapters

- [x] Remove `packages/task-hooks` (React adapter).
- [x] Remove `packages/task-observable` (Observable interop adapter).
- [x] Remove `packages/task-router` (routing utility layer).

### 1.3 Drop optional utility wrappers

- [x] Remove `packages/task-validate` (single validation combinator).
- [x] Remove `packages/task-logger` (logging helper wrappers).
- [x] Remove `packages/task-storage` (cache persistence adapters).

## Phase 2 - Repo and Build System Cleanup

- [x] Delete removed package directories and their `CHANGELOG.md` files.
- [ ] Ensure root workspace now resolves only `task`, `task-combinators`, and `task-cache` under `packages/*`.
- [x] Remove references to deleted packages from root and package README docs.
- [ ] Remove references to deleted packages from release/process docs.
- [ ] Run `npm run api:update` to regenerate API baselines for retained packages only.

## Phase 3 - Docs Rewrite for Bare-Metal Shape

- [ ] Update root `README.md` to present 3-package model.
- [ ] Update `docs/api/README.md` index to only retained APIs.
- [ ] Rewrite retained package READMEs with concise examples:
  - [ ] `packages/task/README.md`
  - [ ] `packages/task-combinators/README.md`
  - [ ] `packages/task-cache/README.md`
- [ ] Add a short migration note explaining removed packages and replacement guidance (inline patterns/combinators in user code).

## Phase 4 - Test and Quality Re-baseline

- [ ] Remove tests tied only to deleted packages.
- [ ] Keep and tighten tests for retained packages around core semantics.
- [ ] Run full gate: `npm run release:check`.
- [ ] Fix any coverage threshold fallout caused by package deletions.

## Phase 5 - Release Planning

- [ ] Create changesets describing major breaking simplification.
- [ ] Mark deleted packages as deprecated in release notes (or final publish with deprecation guidance if needed).
- [ ] Prepare a concise changelog section: "Monorepo distilled to core 3 packages".

## Execution Order (Recommended)

1. Merge scheduler primitives into combinators (or intentionally delete `pollTask`).
2. Remove adapter packages (`hooks`, `observable`, `router`).
3. Remove utility packages (`validate`, `logger`, `storage`).
4. Rewrite docs and API baselines.
5. Run `npm run release:check` and finalize changesets.

## Definition of Done

- Only three package directories remain under `packages/`:
  - `task`
  - `task-combinators`
  - `task-cache`
- Root/docs/API baselines mention only retained packages.
- `npm run release:check` passes.
- Breaking changes are explicitly documented.
