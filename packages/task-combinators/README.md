# @gantryland/task-combinators

Composable operators for TaskFn. Transform results, retry, timeout, and orchestrate multiple TaskFns with a small, predictable API.

Works in browser and Node.js (17+) with no dependencies.

## Installation

```bash
npm install @gantryland/task-combinators
```

## Quick start

```typescript
import { Task } from "@gantryland/task";
import {
  pipe,
  map,
  retry,
  timeout,
  tapError,
  TimeoutError,
} from "@gantryland/task-combinators";

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

## Core concepts

### TaskFn

All combinators work with a TaskFn from `@gantryland/task`.

```typescript
type TaskFn<T> = (signal?: AbortSignal) => Promise<T>;
```

### Combinators are curried

Each operator returns a function that wraps a TaskFn. Use them directly or via `pipe`.

```typescript
const withRetry = retry(2)(fetchUsers);
const withPipeline = pipe(fetchUsers, retry(2), timeout(5000));
```

## API overview

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

### mapError

Transform error before rethrowing (skips AbortError). Mapper must return an Error.

```typescript
mapError((err) => new CustomError("request failed", { cause: err }))
```

### catchError

Recover with a fallback value (skips AbortError). Fallbacks are synchronous.

```typescript
catchError([])
catchError((err) => defaultValue)
```

### retry

Retry on failure. `retry(2)` means 3 total attempts.

```typescript
retry(2)
```

### retryWhen

Retry while a predicate returns true.

```typescript
retryWhen((err, attempt) => attempt < 3)
```

### backoff

Retry with a fixed or computed delay.

```typescript
backoff({ attempts: 3, delayMs: (attempt) => attempt * 250 })
```

### timeout

Fail after duration. Respects abort signal; does not abort the underlying task. Rejects with `TimeoutError`.

```typescript
timeout(5000)
```

### timeoutWith

Fallback TaskFn on timeout.

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

```typescript
race(fetchPrimary, fetchReplica)
```

### sequence / concat

Run TaskFns sequentially and return all results. `concat` is an alias.

```typescript
sequence(fetchUser, fetchTeams)
```

### defer / lazy

Defer creation of a TaskFn until run time. `lazy` is an alias.

```typescript
defer(() => fetchUserTaskFn(id))
```

### TimeoutError

Error type used by `timeout`.

```typescript
new TimeoutError()
```

## Practical examples

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

## Notes

- All combinators respect AbortError; they do not swallow or transform it.
- `retry` and `retryWhen` check the signal between attempts.
- `timeout` cleans up on abort and rejects with `TimeoutError`.
- `timeout` does not abort the underlying TaskFn.

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
