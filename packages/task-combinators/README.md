# @gantryland/task-combinators

Composable operators for TaskFn. Transform results, handle errors, retry, timeout, and orchestrate TaskFns with a small, predictable API.

- Curried combinators that compose cleanly with `pipe`.
- Abort-aware behavior across retries and timeouts.
- Parallel and sequential orchestration utilities.
- Works in browser and Node.js with no dependencies.

## Installation

```bash
npm install @gantryland/task-combinators
```

## Contents

- [Quick start](#quick-start)
- [Design goals](#design-goals)
- [When to use task-combinators](#when-to-use-task-combinators)
- [When not to use task-combinators](#when-not-to-use-task-combinators)
- [Core concepts](#core-concepts)
- [Flow](#flow)
- [API](#api)
- [Common patterns](#common-patterns)
- [Integrations](#integrations)
- [Related packages](#related-packages)
- [Tests](#tests)

## Quick start

```typescript
import { Task } from "@gantryland/task";
import { pipe, map, retry, timeout, tapError, TimeoutError } from "@gantryland/task-combinators";

const task = new Task(
  pipe(
    (signal) => fetch("/api/users", { signal }).then((r) => r.json()),
    map((users) => users.filter((u) => u.active)),
    retry(2),
    timeout(5000),
    tapError((err) => {
      if (err instanceof TimeoutError) {
        console.error("request timed out");
        return;
      }
      console.error(err);
    })
  )
);

await task.run();
```

This example shows a TaskFn pipeline with transforms, retries, and timeouts.

## Design goals

- Keep operators tiny and composable.
- Treat AbortError as a first-class cancellation signal.
- Make orchestration (parallel/sequence) ergonomic without new abstractions.

## When to use task-combinators

- You want reusable TaskFn pipelines.
- You need retries, timeouts, or error shaping.
- You want to coordinate multiple TaskFns without a framework.

## When not to use task-combinators

- You need a full reactive stream library.
- You need persistent caching without composition.

## Core concepts

### TaskFn

All combinators work with a TaskFn from `@gantryland/task`.

```typescript
type TaskFn<T, Args extends unknown[] = []> = (signal?: AbortSignal, ...args: Args) => Promise<T>;
```

### Combinators are curried

Each operator returns a function that wraps a TaskFn. Use them directly or via `pipe`.

```typescript
const withRetry = retry(2)(fetchUsers);
const withPipeline = pipe(fetchUsers, retry(2), timeout(5000));
```

### AbortError behavior

AbortError is treated as cancellation and is not transformed or swallowed by error operators.

## Flow

```text
TaskFn -> map/flatMap -> retry/backoff -> timeout -> catchError
```

Order matters. Use `pipe` to make intent explicit.

## API

### API at a glance

| Member | Purpose | Returns |
| --- | --- | --- |
| **Composition** |  |  |
| [`pipe`](#pipe) | Compose operators left-to-right | `TaskFn` |
| **Transforms** |  |  |
| [`map`](#map) | Transform result | `(taskFn) => TaskFn` |
| [`flatMap`](#flatmap) | Chain async work | `(taskFn) => TaskFn` |
| [`tap`](#tap) | Side effect on success | `(taskFn) => TaskFn` |
| [`tapError`](#taperror) | Side effect on error | `(taskFn) => TaskFn` |
| [`tapAbort`](#tapabort) | Side effect on abort | `(taskFn) => TaskFn` |
| [`mapError`](#maperror) | Transform error | `(taskFn) => TaskFn` |
| [`catchError`](#catcherror) | Recover with fallback | `(taskFn) => TaskFn` |
| **Retry/Backoff** |  |  |
| [`retry`](#retry) | Retry with fixed attempts | `(taskFn) => TaskFn` |
| [`retryWhen`](#retrywhen) | Retry while predicate passes | `(taskFn) => TaskFn` |
| [`backoff`](#backoff) | Retry with delays | `(taskFn) => TaskFn` |
| **Timeouts** |  |  |
| [`timeout`](#timeout) | Fail after duration | `(taskFn) => TaskFn` |
| [`timeoutAbort`](#timeoutabort) | Fail and abort task | `(taskFn) => TaskFn` |
| [`timeoutWith`](#timeoutwith) | Fallback on timeout | `(taskFn) => TaskFn` |
| [`TimeoutError`](#timeouterror) | Timeout error class | `Error` |
| **Orchestration** |  |  |
| [`zip`](#zip) | Parallel tuple results | `TaskFn` |
| [`all`](#all) | Parallel array results | `TaskFn` |
| [`race`](#race) | First-to-settle | `TaskFn` |
| [`sequence`](#sequence) | Sequential results | `TaskFn` |
| [`concat`](#concat) | Alias for sequence | `TaskFn` |
| **Factories** |  |  |
| [`defer`](#defer) | Defer TaskFn creation | `TaskFn` |
| [`lazy`](#lazy) | Alias for defer | `TaskFn` |

### pipe

Compose functions left to right.

```typescript
pipe(taskFn, map(transform), retry(2), timeout(5000))
```

### map

Transform the result.

```typescript
map((data) => data.filter((x) => x.active))
```

### flatMap

Chain to another async operation. Receives the abort signal.

```typescript
flatMap((user, signal) => fetchDetails(user.id, signal))
```

### tap

Side effect on success, returns data unchanged.

```typescript
tap((data) => console.log("fetched", data.length))
```

### tapError

Side effect on error (skips AbortError), rethrows.

```typescript
tapError((err) => reportError(err))
```

### tapAbort

Side effect on AbortError, rethrows.

```typescript
tapAbort((err) => logAbort(err))
```

### mapError

Transform error before rethrowing (skips AbortError). Mapper must return an Error.

```typescript
mapError((err) => new CustomError("request failed", { cause: err }))
```

### catchError

Recover with a fallback value (skips AbortError). Fallbacks may be synchronous or async.

```typescript
catchError([])
catchError((err) => defaultValue)
catchError(async (err) => await loadFallback(err))
```

### retry

Retry on failure. `retry(2)` means 3 total attempts.

`onRetry` runs after each failed attempt.

```typescript
retry(2)
retry(2, { onRetry: (err, attempt) => console.warn("retry", attempt, err) })
```

### retryWhen

Retry while a predicate returns true.

```typescript
retryWhen((err, attempt) => attempt < 3)
retryWhen((err) => err instanceof Error, { onRetry: (err, attempt) => log(err, attempt) })
```

### backoff

Retry with a fixed or computed delay.

```typescript
backoff({ attempts: 3, delayMs: (attempt) => attempt * 250 })
```

### timeout

Fail after duration. Respects abort signal and rejects with `TimeoutError`.

```typescript
timeout(5000)
```

### timeoutAbort

Fail after duration and abort the underlying task.

```typescript
timeoutAbort(5000)
```

### timeoutWith

Fallback TaskFn on timeout. AbortError is rethrown and does not trigger fallback.

```typescript
timeoutWith(3000, () => fetchCachedUsers())
```

### zip

Run TaskFns in parallel and return a tuple of results.

```typescript
zip(fetchUser, fetchTeams)
```

### all

Run TaskFns in parallel and return an array of results.

```typescript
all([fetchUser, fetchTeams])
```

### race

Resolve or reject with the first TaskFn to settle.
Accepts either varargs or an array of TaskFns.

```typescript
race(fetchPrimary, fetchReplica)
```

### sequence

Run TaskFns sequentially and return all results. `concat` is an alias.

```typescript
sequence(fetchUser, fetchTeams)
```

### concat

Alias for `sequence`.

```typescript
concat(fetchUser, fetchTeams)
```

### defer

Defer creation of a TaskFn until run time.

```typescript
defer(() => fetchUserTaskFn(id))
```

### lazy

Alias for `defer`.

```typescript
lazy(() => fetchUserTaskFn(id))
```

### TimeoutError

Error type used by `timeout`.

```typescript
new TimeoutError()
```

### Guarantees

- AbortError is never swallowed by error operators.
- `retry` and `retryWhen` check the signal between attempts.
- `timeout` cleans up on abort and rejects with `TimeoutError`.
- `timeoutAbort` aborts the underlying task.

### Gotchas

- `timeout` does not abort the underlying TaskFn.
- `catchError` does not run for AbortError.
- `timeoutWith` does not run fallback for AbortError.

## Common patterns

Use these patterns for most usage.

### Error handling pipeline

```typescript
import { pipe, retry, timeout, tapError, catchError } from "@gantryland/task-combinators";

const fetchUsers = (signal?: AbortSignal) =>
  fetch("/api/users", { signal }).then((r) => r.json());

const taskFn = pipe(
  fetchUsers,
  retry(2),
  timeout(10_000),
  tapError((err) => logError(err)),
  catchError([])
);
```

### Transform chain

```typescript
import { pipe, map, tap } from "@gantryland/task-combinators";

const taskFn = pipe(
  (signal?: AbortSignal) => fetch("/api/users", { signal }).then((r) => r.json()),
  map((users) => users.filter((u) => u.active)),
  map((users) => users.slice(0, 10)),
  tap((users) => console.log(`showing ${users.length} users`))
);
```

### Chained fetches

```typescript
import { pipe, flatMap, map } from "@gantryland/task-combinators";

const taskFn = pipe(
  (signal?: AbortSignal) => fetch("/api/users/1", { signal }).then((r) => r.json()),
  flatMap((user, signal) =>
    fetch(`/api/users/${user.id}/posts`, { signal }).then((r) => r.json())
  ),
  map((posts) => posts.filter((p) => p.published))
);
```

### Parallel requests

```typescript
import { zip, all } from "@gantryland/task-combinators";

const fetchUser = (signal?: AbortSignal) =>
  fetch("/api/user", { signal }).then((r) => r.json());
const fetchTeams = (signal?: AbortSignal) =>
  fetch("/api/teams", { signal }).then((r) => r.json());

const zipFn = zip(fetchUser, fetchTeams);
const allFn = all([fetchUser, fetchTeams]);
```

### Sequential requests

```typescript
import { sequence } from "@gantryland/task-combinators";

const fetchUser = (signal?: AbortSignal) =>
  fetch("/api/user", { signal }).then((r) => r.json());
const fetchTeams = (signal?: AbortSignal) =>
  fetch("/api/teams", { signal }).then((r) => r.json());

const taskFn = sequence(fetchUser, fetchTeams);
```

### Timeout with fallback TaskFn

```typescript
import { timeoutWith } from "@gantryland/task-combinators";

const fetchCachedUsers = (signal?: AbortSignal) =>
  fetch("/api/users?cache=1", { signal }).then((r) => r.json());

const taskFn = timeoutWith(3000, fetchCachedUsers)(
  (signal?: AbortSignal) => fetch("/api/users", { signal }).then((r) => r.json())
);
```

## Integrations

Compose with other Gantryland utilities. This section shows common pairings.

### Use with task-cache

```typescript
import { Task } from "@gantryland/task";
import { MemoryCacheStore, cache } from "@gantryland/task-cache";
import { pipe, retry, timeout } from "@gantryland/task-combinators";

const store = new MemoryCacheStore();

const task = new Task(
  pipe(
    (signal) => fetch("/api/projects", { signal }).then((r) => r.json()),
    cache("projects", store, { ttl: 30_000 }),
    retry(1),
    timeout(4000)
  )
);
```

### Use with task-hooks (React)

```tsx
import { Task } from "@gantryland/task";
import { useTask } from "@gantryland/task-hooks";
import { pipe, map } from "@gantryland/task-combinators";

const userTask = new Task(
  pipe(
    (signal) => fetch("/api/user", { signal }).then((r) => r.json()),
    map((user) => user.profile)
  )
);

export function UserPanel() {
  const { data, isLoading, error } = useTask(userTask);
  if (isLoading) return <Spinner />;
  if (error) return <ErrorView error={error} />;
  return <UserCard user={data} />;
}
```

## Related packages

- [@gantryland/task](../task/) - Core Task abstraction
- [@gantryland/task-cache](../task-cache/) - Cache combinators and stores
- [@gantryland/task-hooks](../task-hooks/) - React bindings
- [@gantryland/task-logger](../task-logger/) - Logging utilities
- [@gantryland/task-validate](../task-validate/) - Validation combinators

## Tests

```bash
npm test
npx vitest packages/task-combinators/test
```
