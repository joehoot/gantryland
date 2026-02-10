# @gantryland/task

Minimal async task primitive with reactive state and latest-run-wins behavior.

## Installation

```bash
npm install @gantryland/task
```

## Quick Start

```typescript
import { Task } from "@gantryland/task";

type User = { id: string; name: string };

const userTask = new Task<User, [string]>((id) =>
  fetch(`/api/users/${id}`).then((r) => r.json()),
);

await userTask.run("42");
```

## Exports

| Export | Kind | What it does |
| --- | --- | --- |
| `Task` | Class | Provides reactive async state with latest-run-wins behavior. |
| `TaskFn` | Type | Represents the async function signature used by `Task.run`. |
| `TaskState` | Type | Represents the task state snapshot shape. |
| `TaskOperator` | Type | Represents a function wrapper used by `task.pipe(...)`. |

## API Reference

### `Task`

```typescript
new Task<T, Args extends unknown[] = []>(fn: TaskFn<T, Args>)
```

| Member | Signature | Description |
| --- | --- | --- |
| `getState` | `() => TaskState<T>` | Returns the current state snapshot. |
| `subscribe` | `(listener: (state: TaskState<T>) => void) => () => void` | Subscribes to state updates and emits the current state immediately. |
| `run` | `(...args: Args) => Promise<T>` | Runs the task function and updates state. Rejects on failure or cancellation. |
| `fulfill` | `(data: T) => T` | Sets success state immediately and returns `data`. |
| `cancel` | `() => void` | Cancels the in-flight run, if any. |
| `reset` | `() => void` | Resets to the initial stale idle state. |
| `pipe` | Overloaded `pipe(...operators)` returning a typed `Task` chain | Returns a new task composed from this task function. |

### `TaskFn`

```typescript
type TaskFn<T, Args extends unknown[] = []> = (...args: Args) => Promise<T>;
```

### `TaskOperator`

```typescript
type TaskOperator<In, Out, Args extends unknown[] = []> = (
  taskFn: TaskFn<In, Args>,
) => TaskFn<Out, Args>;
```

### `TaskState`

```typescript
type TaskState<T> = {
  data: T | undefined;
  error: Error | undefined;
  isLoading: boolean;
  isStale: boolean;
};
```

## Practical Use Cases

### Example: Load on Demand

```typescript
const searchTask = new Task<string[], [string]>((query) =>
  fetch(`/api/search?q=${encodeURIComponent(query)}`).then((r) => r.json()),
);

await searchTask.run("term");
```

### Example: Optimistic Local Fulfill

```typescript
const profileTask = new Task(async () => fetch("/api/profile").then((r) => r.json()));

profileTask.fulfill({ id: "42", name: "Local Name" });
```

### Example: Cancel Superseded Work

```typescript
const reportTask = new Task(async (id: string) =>
  fetch(`/api/reports/${id}`).then((r) => r.json()),
);

void reportTask.run("a");
void reportTask.run("b");
```

### Example: Derive a Piped Task

```typescript
const baseTask = new Task(async (id: string) =>
  fetch(`/api/users/${id}`).then((r) => r.json()),
);

const hardenedTask = baseTask.pipe(
  (taskFn) => async (...args: [string]) => {
    const value = await taskFn(...args);
    return value;
  },
);
```

## Runtime Semantics

- Starting `run(...args)` clears `error`, sets `isLoading: true`, and sets `isStale: false`.
- If a later `run` starts before an earlier one settles, the earlier run is canceled.
- Canceled runs reject with `AbortError` and do not write `error` to state.
- Failed runs keep previous `data`, normalize non-`Error` throws, and write `error`.
- `fulfill`, `cancel`, and `reset` cancel any in-flight run.
- `getState` and `subscribe` expose snapshot copies, not mutable internal state references.
- `pipe` never mutates the source task; it always returns a new `Task` instance.
