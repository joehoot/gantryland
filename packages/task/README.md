# @gantryland/task

Minimal async task with reactive state. The Task instance is the identity: share it to share state across modules and UI.

Works in browser and Node.js (17+) with no dependencies.

## Installation

```bash
npm install @gantryland/task
```

## Quick start

```typescript
import { Task } from "@gantryland/task";
import { pipe, map, retry } from "@gantryland/task-combinators";

const userTask = new Task(
  pipe(
    (signal) => fetch("/api/user", { signal }).then((r) => r.json()),
    map((user) => user.profile),
    retry(2)
  )
);

const unsub = userTask.subscribe(({ data, error, isLoading, isStale }) => {
  if (isLoading) return showSpinner();
  if (error) return showError(error);
  if (isStale) return showEmptyState();
  render(data);
});

await userTask.run();

unsub();
userTask.dispose();
```

## Core concepts

### TaskFn

The async function signature. Receives an optional `AbortSignal` for cancellation.

```typescript
type TaskFn<T> = (signal?: AbortSignal) => Promise<T>;
```

### TaskState

```typescript
type TaskState<T> = {
  data: T | undefined;
  error: unknown | undefined;
  isLoading: boolean;
  isStale: boolean;
};
```

`isStale` is true until the first run starts. Together with `isLoading`, this is enough to model empty and loading states.

## API

### Constructor

```typescript
new Task<T>(fn: TaskFn<T>)
```

### Methods

```typescript
task.getState(): TaskState<T>
task.subscribe((state) => void): Unsubscribe
await task.run(): Promise<void>
task.setFn(fn: TaskFn<T>): void
task.resolve(data: T): void
task.cancel(): void
task.reset(): void
task.dispose(): void
```

Behavior notes:

- Latest request wins; older responses are ignored.
- Abort clears `isLoading` while preserving current data.
- Listener errors are isolated.

## Practical examples

### Shared singleton

```typescript
// tasks/user.ts
import { Task } from "@gantryland/task";

export const userTask = new Task<User>((signal) =>
  fetch("/api/user", { signal }).then((r) => r.json())
);
```

### Parameterized task with setFn

```typescript
import { Task } from "@gantryland/task";

const userTask = new Task<User>((signal) =>
  fetch("/api/users/me", { signal }).then((r) => r.json())
);

export async function runUserTask(id: string) {
  userTask.setFn((signal) =>
    fetch(`/api/users/${id}`, { signal }).then((r) => r.json())
  );
  await userTask.run();
}
```

### Optimistic resolve with fallback fetch

```typescript
import { Task } from "@gantryland/task";

const profileTask = new Task<Profile>((signal) =>
  fetch("/api/profile", { signal }).then((r) => r.json())
);

export async function loadProfile(cached: Profile | null) {
  if (cached) {
    profileTask.resolve(cached);
    return;
  }
  await profileTask.run();
}
```

### Explicit cancellation

```typescript
const task = new Task((signal) =>
  fetch("/api/slow", { signal }).then((r) => r.json())
);

task.run();
task.cancel();
```

### Compose TaskFn with task-combinators

```typescript
import { Task } from "@gantryland/task";
import { pipe, timeout, retry, map } from "@gantryland/task-combinators";

const task = new Task(
  pipe(
    (signal) => fetch("/api/search?q=term", { signal }).then((r) => r.json()),
    timeout(4000),
    retry(3),
    map((payload) => payload.items)
  )
);

await task.run();
```

### Cached tasks with task-cache and task-storage

```typescript
import { Task } from "@gantryland/task";
import { MemoryCacheStore, cache } from "@gantryland/task-cache";
import { StorageCacheStore } from "@gantryland/task-storage";
import { pipe } from "@gantryland/task-combinators";

const baseTaskFn = (signal?: AbortSignal) =>
  fetch("/api/projects", { signal }).then((r) => r.json());

const memoryStore = new MemoryCacheStore();
const inMemoryTask = new Task(
  pipe(
    baseTaskFn,
    cache("projects", memoryStore, { ttl: 30_000 })
  )
);

const persistentStore = new StorageCacheStore(localStorage, { prefix: "gantry:" });
const persistentTask = new Task(
  pipe(
    baseTaskFn,
    cache("projects", persistentStore, { ttl: 600_000 })
  )
);
```

### Scheduling with task-scheduler

```typescript
import { Task } from "@gantryland/task";
import { pollTask } from "@gantryland/task-scheduler";

const task = new Task((signal) =>
  fetch("/api/heartbeat", { signal }).then((r) => r.json())
);

const stop = pollTask(task, { intervalMs: 15_000, immediate: true });

// Later
stop();
```

### Validation with task-validate

```typescript
import { Task } from "@gantryland/task";
import { validate, fromPredicate } from "@gantryland/task-validate";
import { pipe } from "@gantryland/task-combinators";

type SaveResponse = { ok: boolean };

const isSaveResponse = (input: unknown): input is SaveResponse =>
  !!input && typeof (input as SaveResponse).ok === "boolean";

const saveTask = new Task(
  pipe(
    (signal) => fetch("/api/save", { method: "POST", signal }).then((r) => r.json()),
    validate(fromPredicate(isSaveResponse))
  )
);

await saveTask.run();
```

### React usage with task-hooks

```tsx
import { Task } from "@gantryland/task";
import { useTask } from "@gantryland/task-hooks";

const userTask = new Task((signal) =>
  fetch("/api/user", { signal }).then((r) => r.json())
);

export function UserPanel() {
  const { data, error, isLoading, isStale, run } = useTask(userTask);

  if (isStale || isLoading) return <Spinner />;
  if (error) return <ErrorView error={error} />;
  return <UserCard user={data} onRefresh={run} />;
}
```

### Observable interop with task-observable

```typescript
import { Task } from "@gantryland/task";
import { fromTaskState } from "@gantryland/task-observable";

const task = new Task((signal) =>
  fetch("/api/stream", { signal }).then((r) => r.json())
);

const observable = fromTaskState(task);
const sub = observable.subscribe((state) => console.log(state));

await task.run();
sub.unsubscribe();
```

### Logging state changes with task-logger

```typescript
import { Task } from "@gantryland/task";
import { logTaskState } from "@gantryland/task-logger";

const task = new Task((signal) =>
  fetch("/api/notes", { signal }).then((r) => r.json())
);

const unsubscribe = logTaskState(task, { label: "notes" });
await task.run();
unsubscribe();
```

### Routing helpers with task-router

```typescript
import { createPathTask } from "@gantryland/task-router";

const userTask = createPathTask(
  "/users/:id",
  (params) => (signal) =>
    fetch(`/api/users/${params.id}`, { signal }).then((r) => r.json())
);

await userTask.runPath("/users/42");
```

## Related packages

- [@gantryland/task-combinators](../task-combinators/) - Composable operators for TaskFn
- [@gantryland/task-hooks](../task-hooks/) - React bindings
- [@gantryland/task-cache](../task-cache/) - Caching primitives and combinators
- [@gantryland/task-storage](../task-storage/) - Persistent CacheStore implementations
- [@gantryland/task-scheduler](../task-scheduler/) - Scheduling utilities and combinators
- [@gantryland/task-observable](../task-observable/) - Minimal observable interop
- [@gantryland/task-logger](../task-logger/) - Logging utilities
- [@gantryland/task-validate](../task-validate/) - Validation combinators
- [@gantryland/task-router](../task-router/) - Route helpers

## Tests

```bash
npm test
npx vitest packages/task/test
```
