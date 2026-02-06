# @gantryland/task-observable

Minimal observable primitives and Task interop.

Use this package when you need lightweight observable adaptation without bringing in a full stream library.

## Installation

```bash
npm install @gantryland/task-observable
```

## Quick start

```typescript
import { Task } from "@gantryland/task";
import { fromTaskState } from "@gantryland/task-observable";

type User = { id: string; name: string };

const userTask = new Task<User>((signal) =>
  fetch("/api/user", { signal }).then((r) => r.json())
);

const sub = fromTaskState(userTask).subscribe({
  next: (state) => {
    if (state.data) {
      console.log(state.data.name);
    }
  },
});

await userTask.run();
sub.unsubscribe();
```

## When to use

- You need a tiny observable interface for adapters.
- You want to expose task state to observable consumers.
- You want to adapt an observable source into a `TaskFn`.

## When not to use

- You need a full stream operator ecosystem.
- You need advanced multicasting/scheduling primitives.

## Exports

- `fromTaskState(task)`
- `toTask(observable)`

Core types:

```typescript
type Observer<T> = {
  next: (value: T) => void;
  error?: (error: unknown) => void;
  complete?: () => void;
};

type Subscription = { unsubscribe: () => void };

type Observable<T> = {
  subscribe: (observer: Observer<T>) => Subscription;
};
```

## Semantics

- `fromTaskState`
  - Emits every task state transition in order.
- `toTask`
  - Resolves on first `next`.
  - Rejects on `error`.
  - Rejects with `AbortError` on abort.
  - Unsubscribes on resolve/reject/abort.
  - `complete` without `next` does not resolve.

## Patterns

### 1) Stream full task state

```typescript
import { Task } from "@gantryland/task";
import { fromTaskState } from "@gantryland/task-observable";

const task = new Task((signal) =>
  fetch("/api/projects", { signal }).then((r) => r.json())
);

const sub = fromTaskState(task).subscribe((state) => {
  console.log(state.isLoading, state.error, state.data);
});

await task.run();
sub.unsubscribe();
```

### 2) Adapt observable source to task

```typescript
import { Task } from "@gantryland/task";
import { toTask } from "@gantryland/task-observable";

const source$ = {
  subscribe: (observer: { next: (value: string) => void }) => {
    observer.next("ready");
    return { unsubscribe: () => {} };
  },
};

const task = new Task(toTask(source$));
await task.run();
```

### 3) Compose with combinators

```typescript
import { Task } from "@gantryland/task";
import { pipe, timeout } from "@gantryland/task-combinators";
import { toTask } from "@gantryland/task-observable";

const task = new Task(
  pipe(
    toTask(source$),
    timeout(2_000)
  )
);
```

## Related packages

- [@gantryland/task](../task/) - Task execution and state primitive
- [@gantryland/task-hooks](../task-hooks/) - React bindings for Task state
- [@gantryland/task-combinators](../task-combinators/) - TaskFn composition and control-flow operators
- [@gantryland/task-logger](../task-logger/) - Task and cache logging helpers

## Test this package

```bash
npx vitest packages/task-observable/test
```
