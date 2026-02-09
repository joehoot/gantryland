# @gantryland/task

Minimal async task with reactive state.

A `Task` instance is the identity: share the instance to share async state across modules, services, and UI.

- Small API (`run`, `fulfill`, `subscribe`, `cancel`, `reset`)
- AbortSignal-aware execution
- Latest-request-wins behavior built in
- No runtime dependencies; works in browser and Node.js

## Installation

```bash
npm install @gantryland/task
```

## Quick start

```typescript
import { Task } from "@gantryland/task";

type User = { id: string; name: string };

const userTask = new Task<User, [string]>((signal, id) =>
  fetch(`/api/users/${id}`, { signal }).then((r) => r.json())
);

const unsubscribe = userTask.subscribe(({ data, error, isLoading, isStale }) => {
  if (isStale || isLoading) return renderLoading();
  if (error) return renderError(error);
  renderUser(data);
});

await userTask.run("42");

unsubscribe();
```

## When to use

- You need shared async state with deterministic transitions.
- You want cancellation and "latest run wins" semantics by default.
- You want a small primitive and compose caching/retry/scheduling separately.

## When not to use

- You only need a one-off `Promise` with no shared state.
- You need multi-emission streams (use observable tools).
- You want a full data-fetching framework with built-in policies.

## State model

```typescript
type TaskState<T> = {
  data: T | undefined;
  error: Error | undefined;
  isLoading: boolean;
  isStale: boolean;
};
```

- `data`: last successful value
- `error`: last failure (`AbortError` is not stored)
- `isLoading`: true while a run is active
- `isStale`: true before first execution

Transition shape:

```text
stale -> run() -> loading -> success | error | cancel

any -> fulfill(data) -> success
any -> reset() -> stale
```

## API

```typescript
new Task<T, Args extends unknown[] = []>(
  fn: TaskFn<T, Args> | PlainTaskFn<T, Args>,
  options?: { mode?: "auto" | "signal" | "plain" }
)
```

| Member | Purpose | Return |
| --- | --- | --- |
| `getState()` | Read current snapshot | `TaskState<T>` |
| `subscribe(listener)` | Observe state changes (immediate first emit) | `() => void` |
| `run(...args)` | Execute the current `TaskFn` | `Promise<T \| undefined>` |
| `fulfill(data)` | Immediately set successful data state | `T` |
| `cancel()` | Abort in-flight run and clear loading | `void` |
| `reset()` | Restore initial stale state | `void` |

## Semantics

- Latest request wins; older completions are ignored.
- `run()` clears `error`, sets `isLoading: true`, and flips `isStale: false`.
- `run()` resolves `undefined` on error, abort, or superseded execution.
- If `T` can be `undefined`, use `getState().error` and loading flags to disambiguate outcome.
- Task functions can be signal-aware (`(signal, ...args)`) or plain (`(...args)`).
- `mode: "auto"` (default) infers shape from function arity and can be ambiguous; use `"signal"`/`"plain"` to force behavior when needed.
- For wrapped/composed signal-aware functions (for example from combinator/cache packages), prefer `mode: "signal"` on parameterized tasks.
- `fulfill(data)` aborts in-flight work and sets `{ data, error: undefined, isLoading: false, isStale: false }`.
- Failures keep previous `data` and normalize non-`Error` throws.
- Listener errors are isolated (they do not break task state updates).

## Patterns

### 1) Parameterized task

```typescript
import { Task, type TaskFn } from "@gantryland/task";

type Project = { id: string; name: string };

const fetchProject: TaskFn<Project, [string]> = (signal, id) =>
  fetch(`/api/projects/${id}`, { signal }).then((r) => r.json());

const projectTask = new Task(fetchProject);
const result = await projectTask.run("p_123");
if (result !== undefined) {
  console.log(result.name);
}
```

### 2) Error-first UI read model

```typescript
import { Task } from "@gantryland/task";

const task = new Task(async () => {
  throw new Error("Request failed");
});

await task.run();
const { data, error } = task.getState();

if (error) {
  report(error.message);
} else {
  render(data);
}
```

### 3) One stable implementation

```typescript
import { Task } from "@gantryland/task";

const task = new Task(async () => {
  const response = await fetch("/api/profile");
  if (!response.ok) throw new Error("Request failed");
  return response.json() as Promise<{ id: string; name: string }>;
});

await task.run();
```

### 4) Plain task function (no signal arg)

```typescript
import { Task } from "@gantryland/task";

const formatTask = new Task(async (id: number, label: string) => `${id}:${label}`);

const value = await formatTask.run(7, "ok");
```

## Related packages

- [@gantryland/task-react](../task-react/) - Minimal React hooks for Task interop
- [@gantryland/task-combinators](../task-combinators/) - TaskFn composition and control-flow operators
- [@gantryland/task-cache](../task-cache/) - Cache combinators and in-memory store

## Test this package

```bash
npx vitest packages/task/test
```
