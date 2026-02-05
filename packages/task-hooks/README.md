# @gantryland/task-hooks

React hooks for `@gantryland/task`. Build reactive UIs over Task state with stable instances and ergonomic helpers. Requires React 18+ (uses `useSyncExternalStore`).

- Stable Task instances across component lifetimes.
- Auto-run helpers for common lifecycle patterns.
- Selectors to reduce re-renders.
- Works with any TaskFn or Task factory.

## Installation

```bash
npm install @gantryland/task-hooks
```

## Contents

- [Quick start](#quick-start)
- [Design goals](#design-goals)
- [When to use task-hooks](#when-to-use-task-hooks)
- [When not to use task-hooks](#when-not-to-use-task-hooks)
- [Core concepts](#core-concepts)
- [Flow](#flow)
- [API](#api)
- [Common patterns](#common-patterns)
- [Integrations](#integrations)
- [Related packages](#related-packages)
- [Tests](#tests)

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

This example shows a stable Task instance that runs on mount.

## Design goals

- Keep hook APIs small and explicit.
- Ensure Tasks remain stable across renders.
- Make it easy to subscribe to minimal state.

## When to use task-hooks

- You want reactive UI over Task state.
- You need to run tasks on mount or dependency changes.
- You want stable `run()`/`cancel()` callbacks.

## When not to use task-hooks

- You are not in a React runtime.
- You need stream semantics instead of Task state.

## Core concepts

### Task instance is stable

`useTask` creates a Task once and returns the same instance for the lifetime of the component.

### TaskFn vs factory

`useTask` accepts either a TaskFn or a factory that returns a Task. Use `mode: "factory"` when passing a factory so it is not treated as a TaskFn.

```tsx
const [taskA] = useTask(fetchUsers); // TaskFn
const [taskB] = useTask(() => new Task(fetchUsers), { mode: "factory" });
```

### Nullable tasks

`useTaskState`, `useTaskResult`, and `useTaskError` accept `null` or `undefined` and return a default stale state (or your provided fallback).

## Flow

```text
useTask -> subscribe -> render
useTaskOnce/useTaskRun -> run when conditions match
```

## API

### API at a glance

| Member | Purpose | Returns |
| --- | --- | --- |
| **Hooks** |  |  |
| [`useTask`](#usetask) | Create Task and subscribe | `[Task, TaskState]` |
| [`useTaskOnce`](#usetaskonce) | Run on mount if stale | `void` |
| [`useTaskState`](#usetaskstate) | Subscribe to state or slice | `TaskState` or selected value |
| [`useTaskRun`](#usetaskrun) | Stable run callback | `(...args) => Promise<T | undefined>` |
| [`useTaskResult`](#usetaskresult) | Full TaskState | `TaskState` |
| [`useTaskError`](#usetaskerror) | Error-only selector | `unknown | undefined` |
| [`useTaskAbort`](#usetaskabort) | Stable cancel callback | `() => void` |

### useTask

Creates a Task instance and subscribes to its state. The Task instance is stable across renders.

```tsx
const [task, state] = useTask(fetchUsers);
```

Use `mode: "factory"` when passing a Task factory:

```tsx
const [task, state] = useTask(() => new Task(fetchUsers), { mode: "factory" });
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

Returns a stable `run()` callback. Resolves with data on success or `undefined`
on error, abort, or when superseded. Optionally auto-runs when dependencies change.

```tsx
const run = useTaskRun(task);
const runUser = useTaskRun(task, { auto: true, deps: [userId], args: [userId] });
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

### Guarantees

- Task instances created by `useTask` are stable across renders.
- `useTaskOnce` only runs on initial mount.
- Selector hooks return a stale fallback for nullable tasks.

### Gotchas

- Use `mode: "factory"` when passing a Task factory.
- `useTaskRun` auto mode only re-runs when deps change.

## Common patterns

Use these patterns for most usage.

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

const [task, { isLoading }] = useTask(fetchUsers);
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

const [task] = useTask(
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

### Abort in-flight work

```tsx
import { useTask, useTaskAbort } from "@gantryland/task-hooks";

const [task] = useTask(fetchUsers);
const cancel = useTaskAbort(task);

return <button onClick={cancel}>Cancel</button>;
```

## Integrations

Compose with other Gantryland utilities. This section shows common pairings.

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

const [task] = useTask(
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
