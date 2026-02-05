# Unit Test Coverage TODO

Remaining packages needing comprehensive unit test coverage:

- [x] @gantryland/task-logger
  - core logger task factory + lifecycle hooks
  - event payloads, timing data, error logging

- [x] @gantryland/task-observable
  - observable adapters (fromTask/toTask) and cancellation
  - error propagation and completion semantics

- [x] @gantryland/task-router
  - route param binding + task execution
  - prefetch/load helpers and error cases

- [x] @gantryland/task-scheduler
  - interval/polling/debounce/throttle behavior
  - queueing order, cancellation, and retries

- [x] @gantryland/task-storage
  - cache store adapters (localStorage/IndexedDB/FS)
  - serialization, keying, and eviction behavior

- [x] @gantryland/task-validate
  - validation combinator success/failure paths
  - adapter integration (zod/io-ts/valibot) if present
