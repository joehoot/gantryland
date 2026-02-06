# @gantryland/task

Minimal async task with reactive state, designed for ergonomic data flows in apps and libraries. A Task instance is the identity: share it to share state across modules and UI.

- Simple `TaskFn` contract with AbortSignal cancellation.
- Reactive state you can render directly.
- Latest-request-wins semantics built in.
- Composable with retries, caching, validation, and scheduling utilities.
- Works in browser and Node.js with no dependencies.

## Installation

```bash
npm install @gantryland/task
```

## Contents

- [Quick start](#quick-start)
- [At a glance](#at-a-glance)
- [Design goals](#design-goals)
- [When to use task](#when-to-use-task)
- [When not to use task](#when-not-to-use-task)
- [Core concepts](#core-concepts)
- [Flow](#flow)
- [Run semantics](#run-semantics)
- [API](#api)
- [Common patterns](#common-patterns)
- [Integrations](#integrations)
- [Related packages](#related-packages)
- [Tests](#tests)

## Quick start

```typescript
import { Task } from "@gantryland/task";
import { pipe, map, retry } from "@gantryland/task-combinators";

const userTask = new Task(
  pipe(
    (signal) => fetch("/api/user", { signal }).then((r) => r.json()),
    map((user) => user.profile),
    retry(2)
  )
);

const unsub = userTask.subscribe(({ data, error, isLoading, isStale }) => {
  if (isLoading) return showSpinner();
  if (error) return showError(error);
  if (isStale) return showEmptyState();
  render(data);
});

await userTask.run();

unsub();
userTask.dispose();
```

This example shows a shared Task instance across a view and its data loader.

## At a glance

```typescript
import { Task, type TaskFn, type TaskState } from "@gantryland/task";

type User = { id: string; name: string };

const fetchUser: TaskFn<User, [string]> = (signal, id) =>
  fetch(`/api/users/${id}`, { signal }).then((r) => r.json());

const task = new Task(fetchUser);

const state: TaskState<User> = task.getState();
const user = await task.run("42");
```

## Design goals

- Small API surface that reads well in UI and service layers.
- Deterministic state transitions with cancellation and last-write-wins behavior.
- Composable with the rest of the Gantryland ecosystem.

## When to use task

- Share async state across modules or UI.
- Need cancellation and latest-request-wins semantics.
- Prefer a minimal, dependency-free reactive state model.

## When not to use task

- Only need a one-off Promise with no shared state.
- Need multi-emission streams (use observables instead).
- Want built-in caching or scheduling without composing utilities (use a higher-level data layer).

## Core concepts

### TaskFn

Async function signature executed by a Task. Receives an optional `AbortSignal` and any run arguments.

```typescript
type TaskFn<T, Args extends unknown[] = []> = (signal?: AbortSignal, ...args: Args) => Promise<T>;
```

### TaskState

```typescript
type TaskState<T> = {
  data: T | undefined;
  error: Error | undefined;
  isLoading: boolean;
  isStale: boolean;
};
```

- `data`: last successful result, or `undefined` before any success.
- `error`: last error, or `undefined` if none. AbortError is not stored; non-Error throws are normalized to Error.
- `isLoading`: true while a run is in-flight.
- `isStale`: true before the first run.

## Flow

```text
stale (initial) -> run() -> loading -> data | error
```

- `isStale` flips to false when a run starts.
- `run()` sets `isLoading` true until completion and clears `error`.
- `resolveWith(data)` settles immediately with `data` and clears `error`/`isLoading`/`isStale`.
- `reset()` returns to the initial stale snapshot.
- `cancel()` clears `isLoading` but keeps current `data`.

## Run semantics

- Latest run wins; older results are ignored.
- Each run clears `error` and sets `isLoading` true before calling the TaskFn.
- AbortError is swallowed and does not set `error`.
- Failures preserve existing `data` and set `error` (normalized to Error).
- `run(...args)` resolves with `T` on success and `undefined` on error/abort/superseded.

## API

### Constructor

```typescript
new Task<T, Args>(fn?: TaskFn<T, Args>)
```

### API at a glance

| Member | Purpose | Returns |
| --- | --- | --- |
| **Create** |  |  |
| [`new Task(fn)`](#constructor) | Create a task instance | `Task<T>` |
| **Read/Observe** |  |  |
| [`getState()`](#taskgetstate) | Read current snapshot | `TaskState<T>` |
| [`subscribe(fn)`](#tasksubscribe) | Listen to state changes | `Unsubscribe` |
| **Run/Update** |  |  |
| [`run(...args)`](#taskrun) | Execute TaskFn | `Promise<T | undefined>` |
| [`resolveWith(data)`](#taskresolvewith) | Set data without running | `void` |
| [`define(fn)`](#taskdefine) | Replace TaskFn | `Task<T, Args>` |
| **Control/Cleanup** |  |  |
| [`cancel()`](#taskcancel) | Abort in-flight run | `void` |
| [`reset()`](#taskreset) | Return to initial state | `void` |
| [`dispose()`](#taskdispose) | Clear subscribers + abort | `void` |

### Methods

#### task.getState

```typescript
task.getState(): TaskState<T>
```

Snapshot read without subscribing.

```typescript
const { data, isLoading } = task.getState();
```

#### task.subscribe

```typescript
task.subscribe((state) => void): Unsubscribe
```

Subscribes to state changes and immediately emits the current state. Returns an unsubscribe function.

```typescript
const unsubscribe = task.subscribe((state) => console.log(state));
```

#### task.run

```typescript
await task.run(...args): Promise<T | undefined>
```

Runs the TaskFn and updates state on completion. Resolves with data on success,
or `undefined` on error, abort, or when superseded by a newer run.

```typescript
await task.run();
await task.run(userId, includeFlags);
```

#### task.define

```typescript
task.define(fn: TaskFn<T, Args>): Task<T, Args>
```

Replaces the TaskFn for subsequent runs and returns the task.

You can also create a blank Task and provide the TaskFn later:

```typescript
const task = new Task<User>();
task.define((signal) => fetch("/api/users/42", { signal }).then((r) => r.json()));
await task.run();
```

#### task.resolveWith

```typescript
task.resolveWith(data: T): void
```

Short-circuits with provided data without running the TaskFn.

State after resolve:
- `data`: provided value
- `error`: `undefined`
- `isLoading`: `false`
- `isStale`: `false`

```typescript
task.resolveWith({ id: "42", name: "Ada" });
```

#### task.cancel

```typescript
task.cancel(): void
```

Cancels the in-flight run via `AbortSignal` if one exists.

```typescript
task.cancel();
```

#### task.reset

```typescript
task.reset(): void
```

Resets state back to the initial stale snapshot.

```typescript
task.reset();
```

#### task.dispose

```typescript
task.dispose(): void
```

Clears subscribers and aborts any in-flight run.

```typescript
task.dispose();
```

### Guarantees

- Latest request wins; older responses are ignored.
- Abort clears `isLoading` while preserving current data.
- Listener errors are isolated from Task state.

### Gotchas

- `subscribe` emits the current state immediately.
- `define` changes behavior for the next `run()` only.
- `resolveWith` skips loading and does not invoke the TaskFn.

## Common patterns

Use these patterns for most usage.

### Using run return values

```typescript
const task = new Task(async () => "ok");

const result = await task.run();
if (result !== undefined) {
  console.log("success", result);
}
```

### Error handling

```typescript
const task = new Task(async () => {
  throw new Error("boom");
});

await task.run();

const { error } = task.getState();
if (error) {
  // always an Error instance
  // report or recover
}
```

### Shared singleton

```typescript
// tasks/user.ts
import { Task } from "@gantryland/task";

export const userTask = new Task<User>((signal) =>
  fetch("/api/user", { signal }).then((r) => r.json())
);
```

### Parameterized task with define

```typescript
import { Task } from "@gantryland/task";

const userTask = new Task<User>((signal) =>
  fetch("/api/users/me", { signal }).then((r) => r.json())
);

export async function runUserTask(id: string) {
  userTask.define((signal) =>
    fetch(`/api/users/${id}`, { signal }).then((r) => r.json())
  );
  await userTask.run();
}
```

### Optimistic resolveWith and fallback fetch

```typescript
import { Task } from "@gantryland/task";

const profileTask = new Task<Profile>((signal) =>
  fetch("/api/profile", { signal }).then((r) => r.json())
);

export async function loadProfile(cached: Profile | null) {
  if (cached) {
    profileTask.resolveWith(cached);
    return;
  }
  await profileTask.run();
}
```

### Explicit cancellation

```typescript
const task = new Task((signal) =>
  fetch("/api/slow", { signal }).then((r) => r.json())
);

task.run();
task.cancel();
```

## Integrations

Compose with other Gantryland utilities. This section shows common pairings.

### Compose TaskFn with task-combinators

```typescript
import { Task } from "@gantryland/task";
import { pipe, timeout, retry, map } from "@gantryland/task-combinators";

const task = new Task(
  pipe(
    (signal) => fetch("/api/search?q=term", { signal }).then((r) => r.json()),
    timeout(4000),
    retry(3),
    map((payload) => payload.items)
  )
);

await task.run();
```

### Cached tasks with task-cache and task-storage

```typescript
import { Task } from "@gantryland/task";
import { MemoryCacheStore, cache } from "@gantryland/task-cache";
import { StorageCacheStore } from "@gantryland/task-storage";
import { pipe } from "@gantryland/task-combinators";

const baseTaskFn = (signal?: AbortSignal) =>
  fetch("/api/projects", { signal }).then((r) => r.json());

const memoryStore = new MemoryCacheStore();
const inMemoryTask = new Task(
  pipe(
    baseTaskFn,
    cache("projects", memoryStore, { ttl: 30_000 })
  )
);

const persistentStore = new StorageCacheStore(localStorage, { prefix: "gantry:" });
const persistentTask = new Task(
  pipe(
    baseTaskFn,
    cache("projects", persistentStore, { ttl: 600_000 })
  )
);
```

### Scheduling with task-scheduler

```typescript
import { Task } from "@gantryland/task";
import { pollTask } from "@gantryland/task-scheduler";

const task = new Task((signal) =>
  fetch("/api/heartbeat", { signal }).then((r) => r.json())
);

const stop = pollTask(task, { intervalMs: 15_000, immediate: true });

// Later
stop();
```

### Validation with task-validate

```typescript
import { Task } from "@gantryland/task";
import { validate, fromPredicate } from "@gantryland/task-validate";
import { pipe } from "@gantryland/task-combinators";

type SaveResponse = { ok: boolean };

const isSaveResponse = (input: unknown): input is SaveResponse =>
  !!input && typeof (input as SaveResponse).ok === "boolean";

const saveTask = new Task(
  pipe(
    (signal) => fetch("/api/save", { method: "POST", signal }).then((r) => r.json()),
    validate(fromPredicate(isSaveResponse))
  )
);

await saveTask.run();
```

### React usage with task-hooks

```tsx
import { Task } from "@gantryland/task";
import { useTask } from "@gantryland/task-hooks";

const userTask = new Task((signal) =>
  fetch("/api/user", { signal }).then((r) => r.json())
);

export function UserPanel() {
  const { data, error, isLoading, isStale, run } = useTask(userTask);

  if (isStale || isLoading) return <Spinner />;
  if (error) return <ErrorView error={error} />;
  return <UserCard user={data} onRefresh={run} />;
}
```

### Observable interop with task-observable

```typescript
import { Task } from "@gantryland/task";
import { fromTaskState } from "@gantryland/task-observable";

const task = new Task((signal) =>
  fetch("/api/stream", { signal }).then((r) => r.json())
);

const observable = fromTaskState(task);
const sub = observable.subscribe((state) => console.log(state));

await task.run();
sub.unsubscribe();
```

### Logging state changes with task-logger

```typescript
import { Task } from "@gantryland/task";
import { logTaskState } from "@gantryland/task-logger";

const task = new Task((signal) =>
  fetch("/api/notes", { signal }).then((r) => r.json())
);

const unsubscribe = logTaskState(task, { label: "notes" });
await task.run();
unsubscribe();
```

### Routing helpers with task-router

```typescript
import { createPathTask } from "@gantryland/task-router";

const userTask = createPathTask(
  "/users/:id",
  (params) => (signal) =>
    fetch(`/api/users/${params.id}`, { signal }).then((r) => r.json())
);

await userTask.runPath("/users/42");
```

## Related packages

- [@gantryland/task-combinators](../task-combinators/) - Composable operators for TaskFn
- [@gantryland/task-hooks](../task-hooks/) - React bindings
- [@gantryland/task-cache](../task-cache/) - Caching primitives and combinators
- [@gantryland/task-storage](../task-storage/) - Persistent CacheStore implementations
- [@gantryland/task-scheduler](../task-scheduler/) - Scheduling utilities and combinators
- [@gantryland/task-observable](../task-observable/) - Minimal observable interop
- [@gantryland/task-logger](../task-logger/) - Logging utilities
- [@gantryland/task-validate](../task-validate/) - Validation combinators
- [@gantryland/task-router](../task-router/) - Route helpers

## Tests

```bash
npm test
npx vitest packages/task/test
```
