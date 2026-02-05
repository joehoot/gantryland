# Task Observable

Minimal observable primitives for Task. Designed for small, dependency-free interop.

Works in browser and Node.js with no dependencies.

## Quick start

```typescript
import { Task } from "@gantryland/task";
import { fromTask } from "@gantryland/task-observable";

const task = new Task(() => fetch("/api/user").then((r) => r.json()));

const subscription = fromTask(task).subscribe((user) => {
  console.log(user);
});

await task.run();

subscription.unsubscribe();
```

## API

### createObservable

Create a minimal observable from a subscribe function.

```typescript
createObservable((observer) => {
  observer.next("value");
  return () => {
    // cleanup
  };
})
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

## Notes

- Observers are simple `{ next, error?, complete? }` objects.
- `fromTask` emits when a task resolves successfully.
- `toTask` resolves on first `next`, rejects on `error`.

## Tests

```bash
npm test

npx vitest packages/task-observable/test
```
