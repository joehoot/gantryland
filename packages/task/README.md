# Task

Minimal async task with reactive state. The instance is the identity.

Works in browser and Node.js (17+) with no dependencies.

## Quick start

```typescript
import { Task } from "@gantryland/task";
import { pipe, map, retry } from "@gantryland/task-combinators";

const userTask = new Task(
  pipe(
    () => fetch("/api/user").then((r) => r.json()),
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

## API

### Constructor

```typescript
new Task<T>(fn)
```

### TaskFn

The async function signature. Receives an optional `AbortSignal` for cancellation.

```typescript
type TaskFn<T> = (signal?: AbortSignal) => Promise<T>;
```

### TaskState

```typescript
type TaskState<T> = {
  data: T | undefined;
  error: unknown | undefined;
  isLoading: boolean;
  isStale: boolean;
};
```

`isStale` is true until the first run starts.
Together with `isLoading`, this is enough to model empty/loading states.

### Methods

```typescript
task.getState(): TaskState<T>
task.subscribe((state) => void): Unsubscribe
await task.run(): Promise<void>
task.setFn((signal?) => Promise<T>)
task.resolve(data: T)
task.cancel()
task.reset()
task.dispose()
```

`setFn` lets you swap the task function at runtime while keeping the same Task instance.

`resolve` short-circuits: it aborts in-flight work, marks the task settled, and uses the provided data.

`cancel` aborts in-flight work and sets `isLoading: false` while preserving existing data.

## Notes

- Latest request wins; older responses are ignored.
- Abort clears `isLoading` while preserving data.
- Listener errors are isolated.

## Patterns

### Shared singleton

```typescript
// tasks/user.ts
export const userTask = new Task<User>(() =>
  fetch("/api/user").then((r) => r.json())
);
```

### Parameterized tasks

```typescript
const userTask = new Task<User>(() => fetch("/api/users/me").then((r) => r.json()));

export async function runUserTask(id: string) {
  userTask.setFn(() => fetch(`/api/users/${id}`).then((r) => r.json()));
  await userTask.run();
}
```

## See also

- [task-combinators](../task-combinators/) - Composable operators for TaskFn
- [task-hooks](../task-hooks/) - React bindings
- [task-cache](../task-cache/) - Caching primitives and combinators
- [task-storage](../task-storage/) - Persistent CacheStore implementations
- [task-scheduler](../task-scheduler/) - Scheduling utilities and combinators
- [task-observable](../task-observable/) - Minimal observable interop
- [task-logger](../task-logger/) - Logging utilities
- [task-validate](../task-validate/) - Validation combinators
- [task-router](../task-router/) - Route helpers

## Tests

```bash
npm test

npx vitest packages/task/test
```
