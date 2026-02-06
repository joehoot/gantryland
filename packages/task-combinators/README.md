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

## API

### Composition

- `pipe(initial, ...fns)`

### Transforms and side effects

- `map(fn)`
- `flatMap(fn)`
- `tap(fn)`
- `tapError(fn)`
- `tapAbort(fn)`
- `mapError(fn)`
- `catchError(fallback)`

### Retry and timeout

- `retry(attempts, options?)`
- `retryWhen(predicate, options?)`
- `backoff(options)`
- `timeout(ms)`
- `timeoutAbort(ms)`
- `timeoutWith(ms, fallback)`
- `TimeoutError`

### Orchestration

- `zip(...taskFns)`
- `all(taskFns)`
- `race(...taskFns)` or `race(taskFns)`
- `sequence(...taskFns)`
- `defer(factory)`

## Patterns

### 1) Error pipeline with fallback

```typescript
import { catchError, pipe, retry, tapError, timeout } from "@gantryland/task-combinators";

const taskFn = pipe(
  (signal?: AbortSignal) => fetch("/api/projects", { signal }).then((r) => r.json()),
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
  (signal?: AbortSignal) => fetch("/api/user", { signal }).then((r) => r.json()),
  flatMap((user, signal) =>
    fetch(`/api/users/${user.id}/teams`, { signal }).then((r) => r.json())
  ),
  map((teams) => teams.filter((team) => team.active))
);
```

### 3) Parallel + sequence orchestration

```typescript
import { all, sequence, zip } from "@gantryland/task-combinators";

const fetchUser = (signal?: AbortSignal) =>
  fetch("/api/user", { signal }).then((r) => r.json());
const fetchTeams = (signal?: AbortSignal) =>
  fetch("/api/teams", { signal }).then((r) => r.json());

const tupleTaskFn = zip(fetchUser, fetchTeams);
const arrayTaskFn = all([fetchUser, fetchTeams]);
const sequentialTaskFn = sequence(fetchUser, fetchTeams);
```

### 4) Timeout fallback path

```typescript
import { timeoutWith } from "@gantryland/task-combinators";

const fetchCached = (signal?: AbortSignal) =>
  fetch("/api/users?cached=1", { signal }).then((r) => r.json());

const taskFn = timeoutWith(3_000, fetchCached)(
  (signal?: AbortSignal) => fetch("/api/users", { signal }).then((r) => r.json())
);
```

## Related packages

- [@gantryland/task](../task/) - Task execution and state primitive
- [@gantryland/task-cache](../task-cache/) - Cache combinators and in-memory store
- [@gantryland/task-scheduler](../task-scheduler/) - Polling and TaskFn scheduling utilities
- [@gantryland/task-validate](../task-validate/) - Output validation combinators

## Test this package

```bash
npx vitest packages/task-combinators/test
```
