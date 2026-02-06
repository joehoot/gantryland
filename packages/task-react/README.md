# @gantryland/task-react

Minimal React hooks for `@gantryland/task`.

Use this package for direct `Task` to React interop with no policy layer.

## Installation

```bash
npm install @gantryland/task-react @gantryland/task react
```

## Quick start

```typescript
import { Task } from "@gantryland/task";
import { useTask } from "@gantryland/task-react";

const userTask = new Task(async (signal, id: string) =>
  fetch(`/api/users/${id}`, { signal }).then((r) => r.json()),
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

- `useTaskState(task)` -> `TaskState<T>`
- `useTask(task)` -> `TaskState<T> & { run, cancel, reset }`

## Semantics

- Subscriptions use `useSyncExternalStore` for React 18+ correctness.
- Hooks do not add retries, caching, or scheduling policy.
- `run`, `cancel`, and `reset` proxy directly to the `Task` instance.

## Related packages

- [@gantryland/task](../task/) - Task execution and state primitive
- [@gantryland/task-combinators](../task-combinators/) - TaskFn composition and control-flow operators
- [@gantryland/task-cache](../task-cache/) - Cache combinators and in-memory store

## Test this package

```bash
npx vitest packages/task-react/test
```
