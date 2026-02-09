# @gantryland/task-combinators

Composable operators for `TaskFn`.

All combinators target plain async function signatures: `(...args) => Promise<T>`.

## Installation

```bash
npm install @gantryland/task-combinators
```

## Quick start

```typescript
import { Task } from "@gantryland/task";
import { map, pipe, retry, timeout } from "@gantryland/task-combinators";

type User = { id: string; active: boolean };

const usersTask = new Task<User[]>(
  pipe(
    () => fetch("/api/users").then((r) => r.json()),
    map((users) => users.filter((u) => u.active)),
    retry(2),
    timeout(5_000),
  ),
);

await usersTask.run();
```

## API

- `TimeoutError`
- value transforms: `map`, `flatMap`, `tap`
- error flow: `tapError`, `tapAbort`, `mapError`, `catchError`
- retries: `retry`, `retryWhen`, `backoff`
- timeouts: `timeout`, `timeoutAbort`, `timeoutWith`
- orchestration: `zip`, `race`, `sequence`
- scheduling: `debounce`, `throttle`, `queue`
- composition: `pipe`

## Semantics

- `AbortError` is treated as cancellation and is never swallowed.
- `timeout(ms)` rejects with `TimeoutError` and does not stop underlying work.
- `timeoutAbort(ms)` is an alias of `timeout(ms)` in the signal-free API.
- `debounce({ waitMs })` rejects superseded calls with `AbortError`.
- `throttle({ windowMs })` reuses first in-window in-flight promise.
- `queue({ concurrency })` limits in-flight executions (default `1`).

## Test this package

```bash
npx vitest packages/task-combinators/test
```
