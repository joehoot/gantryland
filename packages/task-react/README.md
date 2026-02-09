# @gantryland/task-react

Minimal React hooks for `@gantryland/task`.

Use this package for direct `Task` + React interop with no extra policy layer.

## Installation

```bash
npm install @gantryland/task-react @gantryland/task react
```

## Quick start

```typescript
import { Task } from "@gantryland/task";
import { useTask } from "@gantryland/task-react";

const userTask = new Task(async (id: string) =>
  fetch(`/api/users/${id}`).then((r) => r.json()),
);

export function UserPanel({ id }: { id: string }) {
  const { data, error, isLoading, run } = useTask(userTask);

  return (
    <section>
      <button disabled={isLoading} onClick={() => run(id)} type="button">
        Load user
      </button>
      {isLoading && <p>Loading...</p>}
      {error && <p>{error.message}</p>}
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
    </section>
  );
}
```

## API

- `useTaskState(task)` returns `TaskState<T>`.
- `useTask(task)` returns `UseTaskResult<T, Args>`.
- `UseTaskResult.run(...args)` returns `Promise<T>` and rejects on failure/cancel.
- `UseTaskResult.cancel()` proxies `task.cancel()`.
- `UseTaskResult.reset()` proxies `task.reset()`.

## Semantics

- Uses `useSyncExternalStore` for React 18+ correctness.
- Hooks do not add retry/cache/scheduling policy.
- Pass a stable `Task` instance to avoid resubscribe churn.

## Test this package

```bash
npx vitest packages/task-react/test
```
