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

- `Task`
- `TaskFn`
- `TaskState`

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

### `TaskFn`

```typescript
type TaskFn<T, Args extends unknown[] = []> = (...args: Args) => Promise<T>;
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

## Runtime Semantics

- Starting `run(...args)` clears `error`, sets `isLoading: true`, and sets `isStale: false`.
- If a later `run` starts before an earlier one settles, the earlier run is canceled.
- Canceled runs reject with `AbortError` and do not write `error` to state.
- Failed runs keep previous `data`, normalize non-`Error` throws, and write `error`.
- `fulfill`, `cancel`, and `reset` cancel any in-flight run.
