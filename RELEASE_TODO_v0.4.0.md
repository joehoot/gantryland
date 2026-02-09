# v0.4.0 Release Hardening TODO

## Core correctness

- [x] Isolate `subscribe()` immediate listener errors the same way as update notifications.
- [x] Prevent external mutation of internal Task state snapshots returned by `getState()` and emitted to listeners.
- [x] Add regression tests for listener throw-on-subscribe and state mutation safety.

## Auto mode + TaskFn ergonomics

- [x] Document `mode: "auto"` ambiguity for some arity patterns.
- [x] Document recommended `mode: "signal"` when composing with signal-aware wrappers/combinators.
- [x] Add tests that pin explicit `mode` behavior in ambiguous cases.

## Combinators/cache runtime semantics

- [x] Ensure `timeoutAbort` always cleans timer/abort listeners even if wrapped task does not settle.
- [x] Align `retry` `onRetry` callback timing with actual retry attempts (not terminal failure).
- [x] Update cache combinator JSDoc examples to call `TaskFn` with explicit signal slot (`null` when unused).

## React interop polish

- [x] Stabilize `useTaskState` subscription/snapshot callbacks to avoid unnecessary resubscribe churn.
- [x] Add JSDoc to `useTaskState`, `useTask`, and `UseTaskResult` for API parity and IntelliSense.
- [x] Add README caveat about stable Task identity in React component scope.

## Docs consistency

- [x] Expand Task transition docs to include `cancel`, `fulfill`, and `reset` paths.
- [x] Clarify `run()` return-value ambiguity when `T` may include `undefined`.
- [x] Clarify throttle semantics around shared in-window args/signal.

## Release metadata

- [x] Bump package versions to `0.4.0`.
- [x] Update inter-package dependency ranges to `^0.4.0`.

## Validation

- [x] Run: `npm run typecheck`
- [x] Run: `npm test`
- [x] Run: `npm run build`
- [x] Run: `npm run api:update`
- [x] Run: `npm run api:check`
