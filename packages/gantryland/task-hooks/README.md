# Task Hooks

React hooks for the Task library. Requires React 18+ (uses `useSyncExternalStore`).

## Hooks

### useTask

Creates a Task instance and subscribes to its state.

```typescript
import { useTask } from "./index.js";

const [task, state] = useTask(() => new Task(fetchUser));
```

The task instance is stable across renders. Returns `[Task<T>, TaskState<T>]`.

### useTaskOnce

Runs a task on mount if it's stale and not already loading.

```typescript
import { useTaskOnce } from "./index.js";

const [task] = useTask(() => new Task(fetchUser));
useTaskOnce(task);
```

Only triggers on initial render. Ignores later changes to the task instance.

### useTaskState

Subscribes to a task's state reactively.

```typescript
import { useTaskState } from "./index.js";

const state = useTaskState(task);
// { data, error, isLoading, isStale }
```

Accepts `null` or `undefined` and returns a default stale state. Optionally accepts a fallback state as the second argument.

## Patterns

### Fetch on mount

```typescript
const [task, { data, isLoading }] = useTask(() => new Task(fetchUsers));
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
const [task, { data, isLoading }] = useTask(() => new Task(fetchUsers));

const handleRefresh = () => task.run();

return (
  <button onClick={handleRefresh} disabled={isLoading}>
    Refresh
  </button>
);
```
