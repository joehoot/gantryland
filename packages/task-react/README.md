# @gantryland/task-react

Minimal React hooks for `@gantryland/task`.

## Installation

```bash
npm install @gantryland/task-react @gantryland/task react
```

## Quick Start

```typescript
import { Task } from "@gantryland/task";
import { useTask } from "@gantryland/task-react";

const baseUserTask = new Task(async (id: string) =>
  fetch(`/api/users/${id}`).then((r) => r.json()),
);

const userTask = baseUserTask.pipe((taskFn) => async (id: string) => {
  const user = await taskFn(id);
  return user;
});

export function UserPanel({ id }: { id: string }) {
  const { data, error, isLoading, run } = useTask(userTask);

  return (
    <section>
      <button disabled={isLoading} onClick={() => run(id)} type="button">
        Load user
      </button>
      {isLoading && <p>Loading...</p>}
      {error && <p>{error.message}</p>}
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
    </section>
  );
}
```

## Exports

| Export | Kind | What it does |
| --- | --- | --- |
| `useTaskState` | Hook | Returns the latest `TaskState` from a subscribed `Task`. |
| `useTask` | Hook | Returns `TaskState` plus imperative task controls. |
| `UseTaskResult` | Type | Represents the return shape of `useTask`. |

## API Reference

### `useTaskState`

```typescript
useTaskState<T, Args extends unknown[] = []>(task: Task<T, Args>): TaskState<T>
```

Returns the latest `TaskState` snapshot from a subscribed `Task`.

### `useTask`

```typescript
useTask<T, Args extends unknown[] = []>(task: Task<T, Args>): UseTaskResult<T, Args>
```

Returns `TaskState` plus imperative task controls for component usage.

### `UseTaskResult`

```typescript
type UseTaskResult<T, Args extends unknown[] = []> = TaskState<T> & {
  run: (...args: Args) => Promise<T>;
  fulfill: (data: T) => T;
  cancel: () => void;
  reset: () => void;
};
```

| Property | Type | Description |
| --- | --- | --- |
| `data` | `T \| undefined` | Latest successful value. |
| `error` | `Error \| undefined` | Latest non-cancel error. |
| `isLoading` | `boolean` | `true` while `run` is in flight. |
| `isStale` | `boolean` | `true` before first successful resolve or after reset. |
| `run` | `(...args: Args) => Promise<T>` | Runs the task and mirrors `Task.run` behavior. |
| `fulfill` | `(data: T) => T` | Sets success state immediately. |
| `cancel` | `() => void` | Cancels the in-flight run. |
| `reset` | `() => void` | Restores initial stale idle state. |

## Practical Use Cases

### Example: Manual Fetch in UI

```typescript
function RefreshButton({ task }: { task: Task<number> }) {
  const { data, isLoading, run } = useTask(task);
  return (
    <button disabled={isLoading} onClick={() => void run()} type="button">
      Total: {data ?? "-"}
    </button>
  );
}
```

### Example: Read-Only State Subscription

```typescript
function TaskStatus({ task }: { task: Task<unknown> }) {
  const { isLoading, error } = useTaskState(task);
  if (isLoading) return <p>Loading...</p>;
  if (error) return <p>{error.message}</p>;
  return <p>Idle</p>;
}
```

### Example: Seed Data Then Refetch

```typescript
function Example({ task }: { task: Task<{ id: string }> }) {
  const { fulfill, run, reset } = useTask(task);
  fulfill({ id: "local" });
  void run();
  reset();
  return null;
}
```

## Runtime Semantics

- Hooks use `useSyncExternalStore` for React 18+ subscription correctness.
- Hooks add no retry, cache, dedupe, or scheduling behavior.
- `run` rejection semantics exactly match `Task.run`.
- Pass a stable `Task` instance to avoid unnecessary resubscriptions.
- A module-level singleton `Task` is shared state across all consumers.
