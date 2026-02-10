# v0.5.0 Release TODO

## Execution Rule

- Define and enforce the v0.5.0 contract only.
- Do not implement compatibility paths, shims, deprecations, or dual behavior.

## P0 - Contract Correctness

- [ ] Update `packages/task/index.ts` overlap/cancel semantics so active-run control is unambiguous for v0.5.0.
- [ ] Finalize and enforce state exposure model in `packages/task/index.ts` (explicit snapshot/immutability semantics).
- [ ] Normalize numeric option handling in `packages/task-combinators/index.ts` for finite, non-negative values (`retry`, `retryWhen`, `backoff`, `queue`).
- [ ] Align timing validation in `packages/task-cache/index.ts` across all entry points (`ttl`, `staleTtl`) with explicit runtime constraints.

## P1 - Tests Aligned To v0.5.0 Contract

- [ ] Add/adjust contract tests in `packages/task/test/task.test.ts` for overlap/cancel invariants and state exposure invariants.
- [ ] Add/adjust numeric-edge contract tests in `packages/task-combinators/test/task-combinators.test.ts` (`NaN`, `Infinity`, negative values, boundaries).
- [ ] Add/adjust timing-validation and boundary tests in `packages/task-cache/test/task-cache.test.ts`.
- [ ] Remove `as any` escape and keep pipe integration strongly typed in `packages/task-react/test/task-react.test.ts`.

## P2 - Docs And JSDoc Alignment

- [ ] Update `packages/task/README.md` and JSDoc in `packages/task/index.ts` to reflect finalized v0.5.0 semantics.
- [ ] Update `packages/task-combinators/README.md` to document numeric-option and scheduler argument semantics precisely.
- [ ] Update `packages/task-cache/README.md` to document timing validation and stale-window boundary semantics.
- [ ] Update `packages/task-react/README.md` to use effect/event-driven examples and remove render-phase side effects.

## P3 - Release Metadata

- [ ] Bump versions to `0.5.0` in:
  - [ ] `packages/task/package.json`
  - [ ] `packages/task-combinators/package.json`
  - [ ] `packages/task-cache/package.json`
  - [ ] `packages/task-react/package.json`
- [ ] Align internal dependency ranges to the `0.5.x` line (remove `^0.4.0` references).

## P4 - Release Gate Validation

- [ ] Run `npm run lint`.
- [ ] Run `npm run format:check`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run test`.
- [ ] Run `npm run build`.
- [ ] Produce final release-readiness report (issues found, files changed, command results).
