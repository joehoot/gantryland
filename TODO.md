# TODO

Task ecosystem expansion ideas:

- @gantryland/task-observable (done)
  - RxJS interop or minimal observable adapter (fromTask/toTask)

- @gantryland/task-scheduler (done)
  - Polling, interval refresh, debounce/throttle, queueing

- @gantryland/task-storage (done)
  - Persistent cache stores (IndexedDB, localStorage, Node filesystem)
  - Implements CacheStore interface

- @gantryland/task-router
  - Task + route params integration, prefetch hooks or route loaders

- @gantryland/task-logger (done)
  - Instrumentation: debug logs, timings, cache events, task lifecycle metrics

- @gantryland/task-validate (done)
  - Validation combinator; optional zod/io-ts/valibot adapters

- @gantryland/task-react-native
  - React Native-specific hooks/lifecycle support
