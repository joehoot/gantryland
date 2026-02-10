# @gantryland/task

Minimal async task with reactive state.

`Task` gives you one shared async state identity with latest-run-wins behavior built in.

- Plain async task functions: `(...args) => Promise<T>`
- Small API: `run`, `fulfill`, `subscribe`, `cancel`, `reset`
- No runtime dependencies

## Installation

```bash
npm install @gantryland/task
```

## Quick start

```typescript
import { Task } from "@gantryland/task";

type User = { id: string; name: string };

const userTask = new Task<User, [string]>((id) =>
  fetch(`/api/users/${id}`).then((r) => r.json()),
);

await userTask.run("42");
```

## API

```typescript
new Task<T, Args extends unknown[] = []>(fn: (...args: Args) => Promise<T>)
```

| Member | Return | Notes |
| --- | --- | --- |
| `getState()` | `TaskState<T>` | Current snapshot |
| `subscribe(listener)` | `() => void` | Immediate emit, then every update |
| `run(...args)` | `Promise<T>` | Rejects on failure or cancellation |
| `fulfill(data)` | `T` | Sets success state immediately |
| `cancel()` | `void` | Cancels in-flight run |
| `reset()` | `void` | Restores stale initial state |

## Semantics

- `run(...args)` clears previous `error`, sets loading, and marks `isStale: false`.
- If a second `run` starts before the first settles, the first is canceled.
- Canceled runs reject with `AbortError` and do not write `error` to state.
- Failures keep previous `data`, normalize non-`Error` throws, and set `error`.
- `fulfill(data)` and `reset()` both cancel any in-flight run.

## Types

```typescript
type TaskState<T> = {
  data: T | undefined;
  error: Error | undefined;
  isLoading: boolean;
  isStale: boolean;
};

type TaskFn<T, Args extends unknown[] = []> = (...args: Args) => Promise<T>;
```

## Test this package

```bash
npx vitest packages/task/test
```
