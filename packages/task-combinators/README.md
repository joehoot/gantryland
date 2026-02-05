# Task Combinators

Composable operators for TaskFn. Transform, retry, timeout, and handle errors.

Works in browser and Node.js (17+) with no dependencies.

## Quick start

```typescript
import { Task } from "@gantryland/task";
import { pipe, map, retry, timeout, tapError, TimeoutError } from "@gantryland/task-combinators";

const task = new Task(
  pipe(
    () => fetch("/api/users").then((r) => r.json()),
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
```

## API

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

Transform error before rethrowing (skips AbortError). Mapper should return an Error.

```typescript
mapError((err) => new CustomError(err))
```

### catchError

Recover with fallback value (skips AbortError). Fallbacks are synchronous.

```typescript
catchError([])  // fallback to empty array
catchError((err) => defaultValue)  // or compute fallback
```

### retry

Retry on failure. `retry(2)` = 3 total attempts.

```typescript
retry(2)
```

Negative attempts are treated as 0.

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

Fail after duration. Respects abort signal; does not abort the underlying task.
Rejects with `TimeoutError`.

```typescript
timeout(5000)  // 5 seconds
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

### sequence

Run TaskFns sequentially and return all results.

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

## Patterns

### Error handling pipeline

```typescript
pipe(
  fetchUsers,
  retry(2),
  timeout(10000),
  tapError((err) => logError(err)),
  catchError([])
)
```

### Transform chain

```typescript
pipe(
  fetchUsers,
  map((users) => users.filter((u) => u.active)),
  map((users) => users.slice(0, 10)),
  tap((users) => console.log(`showing ${users.length} users`))
)
```

### Chained fetches

```typescript
pipe(
  () => fetchUser(id),
  flatMap((user, signal) => fetchUserPosts(user.id, signal)),
  map((posts) => posts.filter((p) => p.published))
)
```

## Notes

- All combinators respect AbortError - they don't swallow or transform it
- `retry` checks the signal between attempts
- `timeout` cleans up properly on abort
- `timeout` rejects with `TimeoutError`
- Combinators are curried: `map(fn)(taskFn)` or use with `pipe`

## Tests

```bash
npm test

npx vitest packages/task-combinators/test
```
