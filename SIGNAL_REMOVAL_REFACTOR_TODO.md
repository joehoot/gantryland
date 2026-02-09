# Signal Removal Refactor Record

Status: implemented.

This document records the completed refactor that removed signal-first public
APIs from the repository.

## Final decisions applied

- Public task function signatures are plain async: `(...args) => Promise<T>`.
- `Task.run(...args)` returns `Promise<T>` and rejects on failures/cancellation.
- `Task` owns runtime concurrency policy with latest-run-wins state behavior.
- Constructor mode inference (`auto`/`signal`/`plain`) was removed.
- Public docs and API baselines were regenerated to match shipped declarations.

## Package outcomes

- `@gantryland/task`
  - removed signal/mode public API surface
  - retained immutable state snapshots and listener isolation
  - clarified cancellation semantics around `AbortError`
- `@gantryland/task-react`
  - aligned hook `run` contract to core `Task.run` (`Promise<T>`)
- `@gantryland/task-combinators`
  - moved combinators to plain async signatures
  - retained retry/timeout/queue/debounce/throttle orchestration semantics
- `@gantryland/task-cache`
  - removed signal parameters from wrappers
  - preserved TTL/stale/dedupe/background revalidation/invalidation behavior

## Validation performed

- `npm run build`
- `npm run typecheck`
- `npm test`
- `npm run api:update`
- `npm run api:check`

## Definition of done status

- [x] No public API in any package requires `AbortSignal`.
- [x] No constructor `mode` concept remains.
- [x] Public READMEs match exposed API behavior.
- [x] API baseline checks pass.
- [x] Full test suite passes.
