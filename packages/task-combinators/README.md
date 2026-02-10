# @gantryland/task-combinators

Composable operators for `TaskFn`.

All combinators use plain async function signatures: `(...args) => Promise<T>`.

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

`TaskFn<T, Args>` means `(...args: Args) => Promise<T>`.

| Export | Signature | Notes |
| --- | --- | --- |
| `TimeoutError` | `new TimeoutError(message?)` | timeout failure type |
| `pipe` | `pipe(initial, ...fns)` | left-to-right composition |
| `map` | `map(fn)` | transform success value |
| `flatMap` | `flatMap(fn)` | async transform |
| `tap` | `tap(fn)` | success side effect |
| `tapError` | `tapError(fn)` | non-abort error side effect + rethrow |
| `tapAbort` | `tapAbort(fn)` | `AbortError` side effect + rethrow |
| `mapError` | `mapError(fn)` | map non-abort errors |
| `catchError` | `catchError(fallback)` | recover non-abort errors |
| `retry` | `retry(attempts, options?)` | options: `onRetry?(err, attempt)` |
| `retryWhen` | `retryWhen(shouldRetry, options?)` | options: `maxAttempts?`, `delayMs?`, `onRetry?` |
| `backoff` | `backoff(options)` | options: `attempts`, `delayMs`, `shouldRetry?` |
| `timeout` | `timeout(ms)` | rejects `TimeoutError` only at wrapper layer |
| `timeoutWith` | `timeoutWith(ms, fallback)` | fallback runs only on timeout |
| `zip` | `zip(...taskFns)` | parallel tuple result |
| `race` | `race(...taskFns)` | first settled result/error |
| `sequence` | `sequence(...taskFns)` | sequential tuple result |
| `debounce` | `debounce({ waitMs })` | latest call wins; superseded calls reject `AbortError` |
| `throttle` | `throttle({ windowMs })` | reuses first in-window in-flight promise |
| `queue` | `queue({ concurrency? })` | default concurrency `1` |

## Semantics

- `AbortError` is treated as cancellation and is never swallowed.
- `timeout(ms)` rejects with `TimeoutError` but does not abort underlying transport.
- `timeoutWith(ms, fallback)` runs fallback only for timeout; other failures rethrow.
- `retry` and `retryWhen` normalize non-`Error` failures before terminal throw.
- `debounce`/`throttle`/`queue` are promise-level scheduling primitives and do not alter your function arguments.

## Test this package

```bash
npx vitest packages/task-combinators/test
```
