# @gantryland/task-hooks

React hooks for the Task library. Requires React 18+ (uses `useSyncExternalStore`).

## Installation

```bash
npm install @gantryland/task-hooks
```

## Quick start

```tsx
import { Task } from "@gantryland/task";
import { useTask, useTaskOnce } from "@gantryland/task-hooks";

const userTask = new Task((signal) =>
  fetch("/api/user", { signal }).then((r) => r.json())
);

export function UserPanel() {
  const [task, { data, error, isLoading, isStale }] = useTask(() => userTask, {
    mode: "factory",
  });

  useTaskOnce(task);

  if (isStale || isLoading) return <Spinner />;
  if (error) return <ErrorView error={error} />;
  return <UserCard user={data} />;
}
```

## Core concepts

### Task instance is stable

`useTask` creates a Task once and returns the same instance for the lifetime of the component.

### TaskFn vs factory

`useTask` accepts either a TaskFn or a factory that returns a Task. Use `mode: "factory"` when passing a factory so it is not treated as a TaskFn.

```tsx
const [taskA] = useTask(fetchUsers); // TaskFn
const [taskB] = useTask(() => new Task(fetchUsers), { mode: "factory" });
```

## Hooks

### useTask

Creates a Task instance and subscribes to its state.

```tsx
const [task, state] = useTask(fetchUsers);
```

### useTaskOnce

Runs a task on mount if it is stale and not already loading. Only triggers on initial render.

```tsx
useTaskOnce(task);
useTaskOnce(task, { enabled: true });
useTaskOnce(task, { when: (state) => state.isStale && !state.isLoading });
```

### useTaskState

Subscribes to a task's state reactively and optionally selects a slice.

```tsx
const state = useTaskState(task);
const isLoading = useTaskState(task, { select: (s) => s.isLoading });
```

Accepts `null` or `undefined` and returns a default stale state. You can provide a fallback state if needed.

### useTaskRun

Returns a stable `run()` callback. Optionally auto-runs when dependencies change.

```tsx
const run = useTaskRun(task);
const runUser = useTaskRun(task, { auto: true, deps: [userId] });
```

### useTaskResult

Convenience wrapper for `useTaskState`.

```tsx
const { data, error } = useTaskResult(task);
```

### useTaskError

Subscribes only to the error field.

```tsx
const error = useTaskError(task);
```

### useTaskAbort

Returns a stable `cancel()` callback.

```tsx
const cancel = useTaskAbort(task);
```

## Practical examples

### Fetch on mount

```tsx
import { useTask, useTaskOnce } from "@gantryland/task-hooks";

const [task, { data, isLoading }] = useTask(fetchUsers);
useTaskOnce(task);

if (isLoading) return <Spinner />;
return <UserList users={data} />;
```

### Manual refetch

```tsx
import { useTask, useTaskRun } from "@gantryland/task-hooks";

const [task, { data, isLoading }] = useTask(fetchUsers);
const handleRefresh = useTaskRun(task);

return (
  <button onClick={handleRefresh} disabled={isLoading}>
    Refresh
  </button>
);
```

### Shared task instance

```tsx
import { Task } from "@gantryland/task";
import { useTaskState, useTaskOnce } from "@gantryland/task-hooks";

// tasks/user.ts
export const userTask = new Task<User>((signal) =>
  fetch("/api/user", { signal }).then((r) => r.json())
);

// Component.tsx
const state = useTaskState(userTask);
useTaskOnce(userTask);
```

### Auto-run on dependency changes

```tsx
import { Task } from "@gantryland/task";
import { useTask, useTaskRun } from "@gantryland/task-hooks";

const [task, { data, isLoading }] = useTask(
  () =>
    new Task((signal) =>
      fetch(`/api/users/${userId}`, { signal }).then((r) => r.json())
    ),
  { mode: "factory" }
);

useTaskRun(task, { auto: true, deps: [userId] });
```

### Select a slice of state

```tsx
import { useTaskState } from "@gantryland/task-hooks";

const isLoading = useTaskState(task, { select: (s) => s.isLoading });
const user = useTaskState(task, { select: (s) => s.data });
```

### Compose with task-combinators

```tsx
import { Task } from "@gantryland/task";
import { useTask, useTaskOnce } from "@gantryland/task-hooks";
import { pipe, retry, timeout, map } from "@gantryland/task-combinators";

const [task, state] = useTask(
  () =>
    new Task(
      pipe(
        (signal) => fetch("/api/users", { signal }).then((r) => r.json()),
        retry(2),
        timeout(5000),
        map((users) => users.filter((u) => u.active))
      )
    ),
  { mode: "factory" }
);

useTaskOnce(task);
```

### Cached Task in React

```tsx
import { Task } from "@gantryland/task";
import { MemoryCacheStore, cache } from "@gantryland/task-cache";
import { pipe } from "@gantryland/task-combinators";
import { useTask, useTaskOnce } from "@gantryland/task-hooks";

const store = new MemoryCacheStore();

const [task, state] = useTask(
  () =>
    new Task(
      pipe(
        (signal) => fetch("/api/projects", { signal }).then((r) => r.json()),
        cache("projects", store, { ttl: 30_000 })
      )
    ),
  { mode: "factory" }
);

useTaskOnce(task);
```

### Abort in-flight work

```tsx
import { useTask, useTaskAbort } from "@gantryland/task-hooks";

const [task] = useTask(fetchUsers);
const cancel = useTaskAbort(task);

return <button onClick={cancel}>Cancel</button>;
```

## Related packages

- [@gantryland/task](../task/) - Core Task abstraction
- [@gantryland/task-combinators](../task-combinators/) - Composable TaskFn operators
- [@gantryland/task-cache](../task-cache/) - Cache combinators and stores
- [@gantryland/task-storage](../task-storage/) - Persistent CacheStore implementations
- [@gantryland/task-logger](../task-logger/) - Logging utilities
- [@gantryland/task-validate](../task-validate/) - Validation combinators

## Tests

```bash
npm test
npx vitest packages/task-hooks/test
```
