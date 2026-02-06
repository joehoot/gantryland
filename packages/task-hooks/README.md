# @gantryland/task-hooks

React hooks for `@gantryland/task`.

Use this package to bind task state to React components with stable task identity, selective subscriptions, and ergonomic run/cancel helpers.

Requires React 18+ (`useSyncExternalStore`).

## Installation

```bash
npm install @gantryland/task-hooks
```

## Quick start

```tsx
import { Task } from "@gantryland/task";
import { useTask, useTaskOnce } from "@gantryland/task-hooks";

type User = { id: string; name: string };

const userTask = new Task<User>((signal) =>
  fetch("/api/user", { signal }).then((r) => r.json())
);

export function UserPanel() {
  const [task, state] = useTask(() => userTask, { mode: "factory" });
  useTaskOnce(task);

  if (state.isStale || state.isLoading) return <div>Loading...</div>;
  if (state.error) return <div>Error: {state.error.message}</div>;
  return <div>{state.data?.name}</div>;
}
```

## When to use

- You need reactive rendering from `TaskState`.
- You want stable run/cancel callbacks in components.
- You want mount/dependency-driven auto-run behavior.

## When not to use

- You are outside React.
- You need stream semantics instead of task snapshots.

## Exports

- `useTask(arg, options?)`
- `useTaskState(task, options?)`
- `useTaskResult(task, options?)`
- `useTaskError(task, options?)`
- `useTaskRun(task, options?)`
- `useTaskAbort(task)`
- `useTaskOnce(task, options?)`

## Semantics

- `useTask`
  - Creates one stable `Task` instance per component lifetime.
  - If passing a task factory, use `{ mode: "factory" }`.
  - Later function identity changes are ignored (same task instance remains).
- `useTaskState`
  - Subscribes with `useSyncExternalStore`.
  - Supports `select` for narrow subscriptions.
  - Nullable task (`null`/`undefined`) returns stale fallback state.
- `useTaskRun`
  - Returns stable run callback.
  - Optional `auto` runs when `deps` change.
  - `args` are passed to auto-run but are not dependency-tracked.
  - Nullable task returns a no-op run function resolving `undefined`.
- `useTaskOnce`
  - Checks once on mount and runs when condition passes (default: stale + not loading).
- `useTaskAbort`
  - Stable `cancel()` callback; safe for nullable tasks.

Like `Task`, run callbacks resolve to `undefined` on error, abort, or superseded runs.

## Patterns

### 1) Task from TaskFn

```tsx
import { useTask, useTaskOnce } from "@gantryland/task-hooks";

const [task, state] = useTask((signal) =>
  fetch("/api/users", { signal }).then((r) => r.json())
);

useTaskOnce(task);
```

### 2) Auto-run on dependency changes

```tsx
import { useTask, useTaskRun } from "@gantryland/task-hooks";

const [task] = useTask(
  (signal, id: string) => fetch(`/api/users/${id}`, { signal }).then((r) => r.json())
);

useTaskRun(task, { auto: true, deps: [userId], args: [userId] });
```

### 3) Select only what the component needs

```tsx
import { useTaskState } from "@gantryland/task-hooks";

const isLoading = useTaskState(task, { select: (s) => s.isLoading });
const error = useTaskState(task, { select: (s) => s.error });
```

### 4) Stable cancel button

```tsx
import { useTaskAbort } from "@gantryland/task-hooks";

const cancel = useTaskAbort(task);
```

## Related packages

- [@gantryland/task](../task/) - Task execution and state primitive
- [@gantryland/task-combinators](../task-combinators/) - TaskFn composition and control-flow operators
- [@gantryland/task-cache](../task-cache/) - Cache combinators and in-memory store
- [@gantryland/task-scheduler](../task-scheduler/) - Polling and TaskFn scheduling utilities

## Test this package

```bash
npx vitest packages/task-hooks/test
```
