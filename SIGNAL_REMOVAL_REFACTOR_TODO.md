# Signal Removal Refactor TODO

## Objective

Refactor the monorepo to remove `AbortSignal` from public core APIs and restore a plain async function paradigm across:

- `@gantryland/task`
- `@gantryland/task-react`
- `@gantryland/task-combinators`
- `@gantryland/task-cache`

Target outcome:

- Public function signatures are plain async: `(...args) => Promise<T>`.
- Latest-run-wins remains the default runtime policy in `Task`.
- Combinators remain first-class and ergonomic without signal wiring.
- Cache package remains SWR-like (TTL + stale + dedupe + background revalidate).

---

## Scope

### In scope

- Breaking API changes for vNext.
- Source changes in package `index.ts` files.
- Unit test rewrites and additions for updated behavior.
- README rewrites and API baseline regeneration.
- Migration notes for users.

### Out of scope

- New feature additions unrelated to signal removal.
- New packages or runtime policy systems.
- Performance optimization work beyond regression checks.

---

## Critical Decisions To Lock Before Coding

1. `Task.run(...)` contract:
   - Option A: `Promise<T>` and throw on non-success.
   - Option B: `Promise<RunResult<T>>` discriminated union.
   - Option C: keep current behavior (not recommended for this refactor).

2. Superseded run behavior:
   - Normalize to generic cancellation error.
   - Use a dedicated superseded error.
   - Keep supersede internal only (no distinct external signal).

3. `cancel()` semantics:
   - Should actively reject in-flight `run` promise.
   - Should only update state while in-flight work settles naturally.

4. Timeout/cancellation semantics in combinators without signal:
   - `timeout(ms)` should reject with `TimeoutError` only.
   - No underlying transport abort unless explicitly implemented by user code.

Note: Do not start broad implementation until these four are explicitly fixed as policy.

---

## Work Breakdown

## Phase 0 - Baseline and branch hygiene

- [ ] Confirm clean working tree.
- [ ] Create feature branch (example: `refactor/remove-signal-api`).
- [ ] Capture pre-refactor baseline:
  - [ ] `npm test`
  - [ ] `npm run typecheck`
  - [ ] `npm run build`
  - [ ] `npm run api:check`

Deliverable: verified baseline command results saved in PR notes.

---

## Phase 1 - Core package refactor (`@gantryland/task`)

Files:

- `packages/task/index.ts`
- `packages/task/test/task.test.ts`
- `packages/task/README.md`

Tasks:

- [ ] Replace public `TaskFn` with plain async signature:
  - from `(signal: AbortSignal | null, ...args) => Promise<T>`
  - to `(...args: Args) => Promise<T>`
- [ ] Remove `PlainTaskFn` export if no longer needed.
- [ ] Remove constructor `mode` option and all arity/mode inference logic.
- [ ] Simplify `Task` internals to call function directly with args.
- [ ] Keep latest-run-wins state protection with request id checks.
- [ ] Reconcile abort/cancel behavior with chosen `run` contract.
- [ ] Ensure `getState()` remains immutable snapshot.
- [ ] Ensure listener error isolation remains unchanged.

Tests:

- [ ] Remove signal/mode-specific tests.
- [ ] Add/adjust tests for:
  - [ ] plain args forwarding
  - [ ] overlapping runs and latest-wins correctness
  - [ ] cancel behavior (state + run promise contract)
  - [ ] reset/fulfill behavior against in-flight runs
  - [ ] error normalization and state retention behavior

Docs:

- [ ] Remove all constructor mode sections.
- [ ] Rewrite API contract and semantics for new `run` behavior.
- [ ] Update examples to plain function signature only.

Deliverable: core package compiles, tests pass, docs aligned.

---

## Phase 2 - React package alignment (`@gantryland/task-react`)

Files:

- `packages/task-react/index.ts`
- `packages/task-react/test/task-react.test.ts`
- `packages/task-react/README.md`

Tasks:

- [ ] Update `UseTaskResult.run` return type to match `Task.run` contract.
- [ ] Verify hooks still stable and no behavior regressions.
- [ ] Update docs to remove references to signal or mode caveats.

Tests:

- [ ] Update expectations around `run` resolution/rejection behavior.

Deliverable: react package type-safe and behaviorally aligned with core.

---

## Phase 3 - Combinator refactor (`@gantryland/task-combinators`)

Files:

- `packages/task-combinators/index.ts`
- `packages/task-combinators/test/task-combinators.test.ts`
- `packages/task-combinators/README.md`

Tasks:

- [ ] Replace all combinator function types to plain async fns.
- [ ] Remove all signal plumbing from:
  - [ ] `map`, `flatMap`, `tap`, `tapError`, `tapAbort`, `mapError`, `catchError`
  - [ ] `retry`, `retryWhen`, `backoff`
  - [ ] `timeout`, `timeoutAbort`, `timeoutWith`
  - [ ] `zip`, `race`, `sequence`
  - [ ] `debounce`, `throttle`, `queue`
- [ ] Decide fate of `tapAbort` / abort-specialized logic when no signal is public.
- [ ] Redefine `timeoutAbort` semantics (likely deprecate/rename/remove if no underlying abort support).
- [ ] Keep `TimeoutError` contract consistent.
- [ ] Keep `pipe` type inference behavior.

Tests:

- [ ] Rewrite suite to remove external signal assumptions.
- [ ] Validate retry/timeouts with plain async resolvers.
- [ ] Validate debounce/throttle/queue semantics under concurrency.
- [ ] Add tests for synchronous throw normalization where relevant.

Docs:

- [ ] Rewrite signatures and examples without signal argument.
- [ ] Clarify operational behavior for timeout and cancellation-like outcomes.

Deliverable: full combinator surface usable with plain async functions.

---

## Phase 4 - Cache refactor (`@gantryland/task-cache`)

Files:

- `packages/task-cache/index.ts`
- `packages/task-cache/test/task-cache.test.ts`
- `packages/task-cache/README.md`

Tasks:

- [ ] Update combinator signatures to plain async functions.
- [ ] Remove signal parameters from cache wrappers and callsites.
- [ ] Preserve dedupe, ttl, stale windows, background revalidation, and invalidation logic.
- [ ] Remove docs and behavior describing "first caller signal wins".
- [ ] Ensure background revalidation still does not block caller response.

Tests:

- [ ] Rewrite signal-based tests to plain async tests.
- [ ] Keep coverage for:
  - [ ] no cache write on rejection
  - [ ] dedupe behavior
  - [ ] staleWhileRevalidate background update and error emission
  - [ ] invalidateOnResolve only on success

Docs:

- [ ] Rewrite examples to `taskFn(...args)` (no `null` signal slot).
- [ ] Keep API documentation complete for all exported types/methods.

Deliverable: cache package remains SWR-like with plain async API.

---

## Phase 5 - API baselines and docs synchronization

Files:

- `docs/api/task.d.ts`
- `docs/api/task-react.d.ts`
- `docs/api/task-combinators.d.ts`
- `docs/api/task-cache.d.ts`

Tasks:

- [ ] Run API baseline generation (`npm run api:update`).
- [ ] Verify no undocumented exports remain.
- [ ] Update README files for all packages with complete API coverage.
- [ ] Add a migration guide section for breaking changes.

Deliverable: public API docs match shipped TypeScript declarations.

---

## Phase 6 - Validation and release readiness

Tasks:

- [ ] Run full checks:
  - [ ] `npm run build`
  - [ ] `npm run typecheck`
  - [ ] `npm test`
  - [ ] `npm run api:check`
- [ ] Validate no stale signal references remain:
  - [ ] grep for `AbortSignal` in public package docs and exports
  - [ ] grep for constructor `mode` references
- [ ] Confirm README examples compile conceptually against new signatures.
- [ ] Draft changelog entry and migration notes.

Deliverable: all checks passing and release notes ready.

---

## Migration Checklist (for consumers)

- [ ] Replace all `(signal, ...args)` task functions with `(...args)`.
- [ ] Remove `{ mode: "signal" | "plain" | "auto" }` from `new Task(...)` calls.
- [ ] Update any direct calls like `taskFn(null, ...)` to `taskFn(...)`.
- [ ] Update error handling for `run()` according to final contract decision.
- [ ] Replace signal-aware combinator usage patterns with plain async patterns.
- [ ] Revisit timeout/cancel assumptions in app code.

---

## Risk Register

1. Hidden signal coupling in tests/docs
   - Mitigation: repo-wide grep pass before finalizing.

2. Breaking behavior drift in `run` semantics
   - Mitigation: add explicit behavioral tests first, then implementation.

3. Combinator behavior regressions under concurrency
   - Mitigation: preserve and expand debounce/throttle/queue test matrix.

4. Cache stale/revalidate regressions
   - Mitigation: keep deterministic fake-timer tests for ttl/stale windows.

5. Consumer confusion during migration
   - Mitigation: add before/after examples in each README.

---

## Suggested Commit Plan

1. `refactor(task): remove signal and mode from core Task API`
2. `refactor(task-react): align hook types with core Task contract`
3. `refactor(task-combinators): convert operators to plain async functions`
4. `refactor(task-cache): remove signal from cache combinator surface`
5. `docs: rewrite READMEs and update API baselines for signal-free API`
6. `test: align suites with signal-free semantics and concurrency guarantees`

---

## Definition of Done

- [ ] No public API in any package requires `AbortSignal`.
- [ ] No constructor `mode` concept remains.
- [ ] All exposed methods/properties are documented in package READMEs.
- [ ] API baseline check passes.
- [ ] Full test suite passes.
- [ ] Migration guidance is present and accurate.
