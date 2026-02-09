# @gantryland/task-combinators

Composable operators for `TaskFn`.

Use this package to build small, explicit pipelines for transform, retry, timeout, recovery, and orchestration behavior around `@gantryland/task`.

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
    (signal) => fetch("/api/users", { signal }).then((r) => r.json()),
    map((users) => users.filter((u) => u.active)),
    retry(2),
    timeout(5_000)
  )
);

await usersTask.run();
```

## When to use

- You want reusable `TaskFn` pipelines instead of ad-hoc wrappers.
- You need retries/timeouts/error handling without introducing a larger framework.
- You need simple parallel or sequential orchestration helpers.

## When not to use

- You need multi-emission reactive streams.
- You need built-in persistence/caching (use `@gantryland/task-cache`).

## Semantics

- `AbortError` is treated as cancellation and is never swallowed.
- `retry`, `retryWhen`, and `backoff` stop on abort and normalize non-`Error` failures.
- `timeout(ms)` fails with `TimeoutError` and does **not** abort underlying work.
- `timeoutAbort(ms)` fails with `TimeoutError` and aborts underlying work.
- `timeoutWith(ms, fallback)` runs fallback only on timeout (not on abort).
- `throttle({ windowMs })` shares the first in-window run (including its args and signal).
- With parameterized `Task.run(...args)`, prefer `new Task(taskFn, { mode: "signal" })` for composed signal-aware pipelines.

## API

| Export | Signature | Notes |
| --- | --- | --- |
| `TimeoutError` | `new TimeoutError(message?)` | Error type for timeout combinators |
| `pipe` | `pipe(initial, ...fns)` | Left-to-right function composition |
| `map` | `map(fn)` | Transform resolved value |
| `flatMap` | `flatMap(fn)` | Chain async transform with shared signal |
| `tap` | `tap(fn)` | Run side effect on success, return original value |
| `tapError` | `tapError(fn)` | Run side effect on non-abort error, then rethrow |
| `tapAbort` | `tapAbort(fn)` | Run side effect on abort error, then rethrow |
| `mapError` | `mapError(fn)` | Map non-abort errors to `Error`, then throw |
| `catchError` | `catchError(fallback)` | Recover non-abort errors with fallback |
| `retry` | `retry(attempts, options?)` | Fixed retry count; `onRetry` runs only when a retry will occur |
| `retryWhen` | `retryWhen(shouldRetry, options?)` | Predicate retries; options: `maxAttempts?`, `delayMs?(attempt, err)`, `onRetry?(err, attempt)` |
| `backoff` | `backoff(options)` | Retry with delay; options: `attempts`, `delayMs`, `shouldRetry?` |
| `timeout` | `timeout(ms)` | Reject with `TimeoutError` without aborting source |
| `timeoutAbort` | `timeoutAbort(ms)` | Reject with `TimeoutError` and abort source |
| `timeoutWith` | `timeoutWith(ms, fallback)` | Run fallback `TaskFn` only on timeout |
| `zip` | `zip(...taskFns)` | Run in parallel, resolve as tuple |
| `race` | `race(...taskFns)` | Settle with first task to settle |
| `sequence` | `sequence(...taskFns)` | Run in order, resolve as tuple |
| `debounce` | `debounce({ waitMs })` | Only latest call in window executes |
| `throttle` | `throttle({ windowMs })` | Reuse first in-window in-flight promise |
| `queue` | `queue({ concurrency? })` | Limit concurrent executions (default `1`) |

## Patterns

### 1) Error pipeline with fallback

```typescript
import { catchError, pipe, retry, tapError, timeout } from "@gantryland/task-combinators";

const taskFn = pipe(
  (signal: AbortSignal | null) => fetch("/api/projects", { signal }).then((r) => r.json()),
  retry(2),
  timeout(4_000),
  tapError((error) => report(error)),
  catchError([])
);
```

### 2) Chained async dependency

```typescript
import { flatMap, map, pipe } from "@gantryland/task-combinators";

const taskFn = pipe(
  (signal: AbortSignal | null) => fetch("/api/user", { signal }).then((r) => r.json()),
  flatMap((user, signal) =>
    fetch(`/api/users/${user.id}/teams`, { signal }).then((r) => r.json())
  ),
  map((teams) => teams.filter((team) => team.active))
);
```

### 3) Parallel + sequence orchestration

```typescript
import { sequence, zip } from "@gantryland/task-combinators";

const fetchUser = (signal: AbortSignal | null) =>
  fetch("/api/user", { signal }).then((r) => r.json());
const fetchTeams = (signal: AbortSignal | null) =>
  fetch("/api/teams", { signal }).then((r) => r.json());

const tupleTaskFn = zip(fetchUser, fetchTeams);
const sequentialTaskFn = sequence(fetchUser, fetchTeams);
```

### 4) Timeout fallback path

```typescript
import { timeoutWith } from "@gantryland/task-combinators";

const fetchCached = (signal: AbortSignal | null) =>
  fetch("/api/users?cached=1", { signal }).then((r) => r.json());

const taskFn = timeoutWith(3_000, fetchCached)(
  (signal: AbortSignal | null) => fetch("/api/users", { signal }).then((r) => r.json())
);
```

## Related packages

- [@gantryland/task](../task/) - Task execution and state primitive
- [@gantryland/task-cache](../task-cache/) - Cache combinators and in-memory store

## Test this package

```bash
npx vitest packages/task-combinators/test
```
