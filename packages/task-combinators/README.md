# @gantryland/task-combinators

Composable operators for `TaskFn` pipelines.

All combinators preserve plain async signatures: `(...args) => Promise<T>`.

## Installation

```bash
npm install @gantryland/task @gantryland/task-combinators
```

## Quick Start

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

## Exports

| Export | Kind | What it does |
| --- | --- | --- |
| `TimeoutError` | Error class | Timeout failure type used by `timeout`. |
| `pipe` | Composition | Composes functions left-to-right. |
| `map` | Value transform | Maps successful values. |
| `flatMap` | Async transform | Chains async transforms from successful values. |
| `tap` | Side effect | Runs side effects on success and returns original value. |
| `tapError` | Error side effect | Runs side effects for non-abort errors, then rethrows. |
| `tapAbort` | Abort side effect | Runs side effects only for `AbortError`, then rethrows. |
| `mapError` | Error transform | Maps non-abort errors to a new `Error`. |
| `catchError` | Recovery | Recovers from non-abort failures with fallback value or async fallback. |
| `retry` | Retry policy | Retries non-abort failures for a fixed retry count. |
| `retryWhen` | Retry policy | Retries while a predicate allows it. |
| `backoff` | Retry policy | Retries with fixed or computed delay strategy. |
| `timeout` | Timeout policy | Rejects with `TimeoutError` after the configured deadline. |
| `timeoutWith` | Timeout fallback | Runs fallback only on timeout failures. |
| `zip` | Coordination | Runs task functions in parallel and resolves tuple results. |
| `race` | Coordination | Settles with the first result or error. |
| `sequence` | Coordination | Runs task functions sequentially and resolves tuple results. |
| `debounce` | Scheduling | Runs only the latest call in a debounce window. |
| `throttle` | Scheduling | Reuses first in-window in-flight promise. |
| `queue` | Scheduling | Limits concurrent executions with optional concurrency. |

## API Reference

`TaskFn<T, Args>` represents `(...args: Args) => Promise<T>`.

### Core Composition

| Export | Signature | Description |
| --- | --- | --- |
| `pipe` | `pipe(initial, ...fns)` | Composes functions left-to-right. |
| `map` | `map(fn)` | Maps successful values. |
| `flatMap` | `flatMap(fn)` | Chains async value transforms. |
| `tap` | `tap(fn)` | Runs success side effects and returns original value. |

### Error Handling

| Export | Signature | Description |
| --- | --- | --- |
| `tapError` | `tapError(fn)` | Runs side effects for non-abort errors, then rethrows. |
| `tapAbort` | `tapAbort(fn)` | Runs side effects for `AbortError`, then rethrows. |
| `mapError` | `mapError(fn)` | Maps non-abort errors to a new `Error`. |
| `catchError` | `catchError(fallback)` | Recovers from non-abort errors with value or async fallback. |

### Retry And Timeouts

| Export | Signature | Description |
| --- | --- | --- |
| `retry` | `retry(attempts, options?)` | Retries on non-abort errors; `attempts` is retry count. |
| `retryWhen` | `retryWhen(shouldRetry, options?)` | Retries while predicate returns true. |
| `backoff` | `backoff(options)` | Retry helper using fixed or computed delay. |
| `timeout` | `timeout(ms)` | Rejects with `TimeoutError` after `ms`. |
| `timeoutWith` | `timeoutWith(ms, fallback)` | Uses fallback only when timeout occurs. |
| `TimeoutError` | `new TimeoutError(message?)` | Error type thrown by `timeout`. |

`retry` options:

```typescript
{ onRetry?: (err: unknown, attempt: number) => void }
```

`retryWhen` options:

```typescript
{
  maxAttempts?: number;
  delayMs?: (attempt: number, err: unknown) => number;
  onRetry?: (err: unknown, attempt: number) => void;
}
```

`backoff` options:

```typescript
{
  attempts: number;
  delayMs: number | ((attempt: number, err: unknown) => number);
  shouldRetry?: (err: unknown) => boolean;
}
```

### Coordination And Scheduling

| Export | Signature | Description |
| --- | --- | --- |
| `zip` | `zip(...taskFns)` | Runs task functions in parallel and resolves tuple results. |
| `race` | `race(...taskFns)` | Settles with first result or error. |
| `sequence` | `sequence(...taskFns)` | Runs task functions sequentially and resolves tuple results. |
| `debounce` | `debounce({ waitMs })` | Runs only the latest call in a debounce window. |
| `throttle` | `throttle({ windowMs })` | Reuses first in-window in-flight promise. |
| `queue` | `queue({ concurrency? })` | Limits concurrent executions, default `1`. |

## Practical Use Cases

### Example: Harden a Network Request

```typescript
import { pipe, retry, timeout } from "@gantryland/task-combinators";

const getUsers = pipe(
  () => fetch("/api/users").then((r) => r.json()),
  retry(2),
  timeout(4_000),
);
```

### Example: Debounced Search

```typescript
import { debounce } from "@gantryland/task-combinators";

const searchUsers = debounce<{ id: string }[], [string]>({ waitMs: 250 })(
  (q) => fetch(`/api/users?q=${encodeURIComponent(q)}`).then((r) => r.json()),
);
```

### Example: Controlled Background Work

```typescript
import { queue } from "@gantryland/task-combinators";

const syncItem = queue<void, [string]>({ concurrency: 2 })(async (id) => {
  await fetch(`/api/sync/${id}`, { method: "POST" });
});
```

## Runtime Semantics

- `AbortError` is treated as cancellation and is never swallowed.
- `timeout` controls only the wrapper promise boundary and does not abort transport.
- `timeoutWith` runs fallback only for timeout failures.
- `retry` and `retryWhen` normalize terminal non-`Error` failures.
- `debounce`, `throttle`, and `queue` are promise-level schedulers that keep args unchanged.
