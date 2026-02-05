# Task Hooks

React hooks for the Task library. Requires React 18+ (uses `useSyncExternalStore`).

## Hooks

### useTask

Creates a Task instance and subscribes to its state. Accepts a TaskFn or a factory.

```typescript
import { useTask } from "@gantryland/task-hooks";

const [task, state] = useTask(() => new Task(fetchUser), { mode: "factory" });

// Or pass a TaskFn directly (default)
const [task2, state2] = useTask(fetchUser);
```

The task instance is stable across renders. The initializer runs once on mount and returns `[Task<T>, TaskState<T>]`.
When passing a factory, set `{ mode: "factory" }` so it doesn't get treated as a TaskFn.

### useTaskOnce

Runs a task on mount if it's stale and not already loading. You can gate it with options.

```typescript
import { useTaskOnce } from "@gantryland/task-hooks";

const [task] = useTask(fetchUser);
useTaskOnce(task, { enabled: true });

// Only run when a condition is met
useTaskOnce(task, { when: (state) => state.isStale && !state.isLoading });
```

Only triggers on initial render. If you pass a new Task later, it will not run again.

### useTaskState

Subscribes to a task's state reactively. You can optionally select a slice.

```typescript
import { useTaskState } from "@gantryland/task-hooks";

const state = useTaskState(task);
// { data, error, isLoading, isStale }

const isLoading = useTaskState(task, { select: (s) => s.isLoading });
```

Accepts `null` or `undefined` and returns a default stale state. Optionally accepts a fallback state or a selector.

### useTaskRun

Returns a stable `run()` callback. Optionally auto-runs when deps change.

```typescript
import { useTaskRun } from "@gantryland/task-hooks";

const run = useTaskRun(task);

useTaskRun(task, { auto: true, deps: [userId] });
```

### useTaskResult

Convenience wrapper for `useTaskState`.

```typescript
import { useTaskResult } from "@gantryland/task-hooks";

const { data, error } = useTaskResult(task);
```

### useTaskError

Subscribe to only the error field.

```typescript
import { useTaskError } from "@gantryland/task-hooks";

const error = useTaskError(task);
```

### useTaskAbort

Returns a stable `cancel()` callback.

```typescript
import { useTaskAbort } from "@gantryland/task-hooks";

const cancel = useTaskAbort(task);
```

## Patterns

### Fetch on mount

```typescript
const [task, { data, isLoading }] = useTask(fetchUsers);
useTaskOnce(task);

if (isLoading) return <Spinner />;
return <UserList users={data} />;
```

### Shared task instance

```typescript
// tasks/user.ts
export const userTask = new Task<User>(fetchUser);

// Component.tsx
const state = useTaskState(userTask);
useTaskOnce(userTask);
```

### Manual refetch

```typescript
const [task, { data, isLoading }] = useTask(fetchUsers);

const handleRefresh = useTaskRun(task);

return (
  <button onClick={handleRefresh} disabled={isLoading}>
    Refresh
  </button>
);
```
