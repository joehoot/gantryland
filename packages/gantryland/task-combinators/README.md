# Task Combinators

Composable operators for TaskFn. Transform, retry, timeout, and handle errors.

Works in browser and Node.js (17+) with no dependencies.

## Quick start

```typescript
import { Task } from "../task/index.js";
import { pipe, map, retry, timeout, tapError } from "./index.js";

const task = new Task(
  pipe(
    () => fetch("/api/users").then((r) => r.json()),
    map((users) => users.filter((u) => u.active)),
    retry(2),
    timeout(5000),
    tapError((err) => console.error(err))
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

Transform error before rethrowing (skips AbortError).

```typescript
mapError((err) => new CustomError(err))
```

### catchError

Recover with fallback value (skips AbortError).

```typescript
catchError([])  // fallback to empty array
catchError((err) => defaultValue)  // or compute fallback
```

### retry

Retry on failure. `retry(2)` = 3 total attempts.

```typescript
retry(2)
```

### timeout

Fail after duration. Respects abort signal.

```typescript
timeout(5000)  // 5 seconds
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
- Combinators are curried: `map(fn)(taskFn)` or use with `pipe`
