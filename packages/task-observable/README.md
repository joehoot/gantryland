# @gantryland/task-observable

Minimal observable primitives for Task. Designed for small, dependency-free interop with libraries that consume observables.

- Tiny Observable/Observer contracts for easy adapters.
- Convert Task state or results into observables.
- Convert observables into TaskFn.
- Observable -> TaskFn respects AbortSignal.
- Works in browser and Node.js with no dependencies.

## Installation

```bash
npm install @gantryland/task-observable
```

## Contents

- [Quick start](#quick-start)
- [At a glance](#at-a-glance)
- [Design goals](#design-goals)
- [When to use task-observable](#when-to-use-task-observable)
- [When not to use task-observable](#when-not-to-use-task-observable)
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
import { fromTask } from "@gantryland/task-observable";

const task = new Task((signal) =>
  fetch("/api/user", { signal }).then((r) => r.json())
);

const subscription = fromTask(task).subscribe((user) => {
  console.log(user);
});

await task.run();

subscription.unsubscribe();
```

This example shows Task results as an observable stream.

## At a glance

```typescript
import { Task } from "@gantryland/task";
import { createObservable, fromTaskState, toTask } from "@gantryland/task-observable";

const task = new Task(async () => "ready");
const state$ = fromTaskState(task);

const observable = createObservable<string>((observer) => {
  observer.next("first");
});

const taskFn = toTask(observable);
```

## Design goals

- Keep observable contracts tiny and portable.
- Make Task interop explicit and predictable.
- Avoid extra dependencies.

## When to use task-observable

- You need to feed Task state into an observable consumer.
- You want to adapt an observable into a TaskFn.
- You want a minimal observable interface without RxJS.

## When not to use task-observable

- You need full stream operators and schedulers.
- You need multi-cast or hot observable utilities.

## Core concepts

### Minimal observable contract

The observable interface is intentionally small: `subscribe()` returns a `{ unsubscribe }` handle.

```typescript
type Observer<T> = {
  next: (value: T) => void;
  error?: (error: unknown) => void;
  complete?: () => void;
};

type Observable<T> = {
  subscribe: (observer: Observer<T> | ((value: T) => void)) => Subscription;
};
```

### Task interop

- `fromTaskState` emits every Task state change.
- `fromTask` emits when `isLoading` is false, `isStale` is false, and `data` is defined.
- `fromTask` dedupes by reference equality and forwards Task errors.
- `toTask` resolves on the first `next`, rejects on `error`/abort, and cleans up on `complete`.

## Flow

```text
Task -> fromTaskState -> Observable<TaskState>
Task -> fromTask -> Observable<T>
Observable<T> -> toTask -> TaskFn<T>
```

## Run semantics

- `fromTaskState` emits every Task state change in order.
- `fromTask` emits only when `isLoading` is false, `isStale` is false, and `data` is defined.
- `fromTask` dedupes by reference equality and forwards Task errors to `observer.error`.
- `toTask` resolves on the first `next`, rejects on `error`, and rejects with `AbortError` on abort.
- `toTask` does not resolve on `complete`; a complete without a `next` leaves the TaskFn pending.

## API

### API at a glance

| Member | Purpose | Returns |
| --- | --- | --- |
| **Core** |  |  |
| [`createObservable`](#createobservable) | Build an Observable from subscribe | `Observable<T>` |
| **Task -> Observable** |  |  |
| [`fromTaskState`](#fromtaskstate) | Task -> Observable<TaskState> | `Observable<TaskState<T>>` |
| [`fromTask`](#fromtask) | Task -> Observable<T> | `Observable<T>` |
| **Observable -> Task** |  |  |
| [`toTask`](#totask) | Observable -> TaskFn | `TaskFn<T>` |

### createObservable

Create a minimal observable from a subscribe function.
If the subscribe function does not return an unsubscribe callback, the subscription uses a no-op.

```typescript
createObservable((observer) => {
  observer.next("value");
  return () => {
    // cleanup
  };
});
```

### fromTaskState

Convert a Task into an observable of TaskState.

```typescript
fromTaskState(task)
```

### fromTask

Convert a Task into an observable of resolved data.

```typescript
fromTask(task)
```

### toTask

Convert an observable into a TaskFn. Only the first value is used.
Rejects with `AbortError` when aborted and does not resolve on `complete` without a `next` value.

```typescript
const taskFn = toTask(observable)
```

## Common patterns

Use these patterns for most usage.

### Stream Task state to an observable

```typescript
import { Task } from "@gantryland/task";
import { fromTaskState } from "@gantryland/task-observable";

const task = new Task((signal) =>
  fetch("/api/users", { signal }).then((r) => r.json())
);

const subscription = fromTaskState(task).subscribe((state) => {
  console.log(state.isLoading, state.error, state.data);
});

await task.run();
subscription.unsubscribe();
```

### Emit only resolved data

```typescript
import { Task } from "@gantryland/task";
import { fromTask } from "@gantryland/task-observable";

const task = new Task((signal) =>
  fetch("/api/projects", { signal }).then((r) => r.json())
);

const subscription = fromTask(task).subscribe((projects) => {
  console.log("projects", projects.length);
});

await task.run();
```

### Convert an observable to a TaskFn

```typescript
import { Task } from "@gantryland/task";
import { createObservable, toTask } from "@gantryland/task-observable";

const observable = createObservable<string>((observer) => {
  observer.next("ready");
});

const task = new Task(toTask(observable));
await task.run();
```

### Use with task-combinators

```typescript
import { Task } from "@gantryland/task";
import { toTask } from "@gantryland/task-observable";
import { timeout, pipe } from "@gantryland/task-combinators";

const task = new Task(
  pipe(
    toTask(observable),
    timeout(2000)
  )
);
```

## Integrations

Compose with other Gantryland utilities. This section shows common pairings.

### Integrate with task-hooks (React)

```tsx
import { Task } from "@gantryland/task";
import { fromTaskState } from "@gantryland/task-observable";
import { useEffect, useState } from "react";

const task = new Task((signal) =>
  fetch("/api/user", { signal }).then((r) => r.json())
);

export function UserPanel() {
  const [state, setState] = useState(task.getState());

  useEffect(() => {
    const sub = fromTaskState(task).subscribe(setState);
    return () => sub.unsubscribe();
  }, []);

  return <pre>{JSON.stringify(state, null, 2)}</pre>;
}
```

## Related packages

- [@gantryland/task](../task/) - Core Task abstraction
- [@gantryland/task-hooks](../task-hooks/) - React bindings
- [@gantryland/task-combinators](../task-combinators/) - Composable TaskFn operators
- [@gantryland/task-logger](../task-logger/) - Logging utilities

## Tests

```bash
npm test
npx vitest packages/task-observable/test
```
