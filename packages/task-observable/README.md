# @gantryland/task-observable

Minimal observable primitives for Task. Designed for small, dependency-free interop with libraries that consume observables.

Works in browser and Node.js with no dependencies.

## Installation

```bash
npm install @gantryland/task-observable
```

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
- `fromTask` emits resolved data values only.
- `toTask` converts an observable to a TaskFn and resolves on the first `next`.

## API

### createObservable

Create a minimal observable from a subscribe function.

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

```typescript
const taskFn = toTask(observable)
```

## Practical examples

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

## Notes

- Observers are simple `{ next, error?, complete? }` objects.
- `fromTask` emits only after successful resolution (not on `error` or `cancel`).
- `toTask` resolves on first `next`, rejects on `error`, and respects abort.

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
