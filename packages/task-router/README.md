# @gantryland/task-router

Route helpers for Task. Simple pattern matching plus Task wrappers for route params, without bringing in a full router.

Works in browser and Node.js with no dependencies.

## Installation

```bash
npm install @gantryland/task-router
```

## Quick start

```typescript
import { createPathTask } from "@gantryland/task-router";

const userTask = createPathTask(
  "/users/:id",
  (params) => (signal) =>
    fetch(`/api/users/${params.id}`, { signal }).then((r) => r.json())
);

await userTask.runPath("/users/123");
```

## Core concepts

### Patterns and params

Patterns support `:param` segments. `matchRoute` returns `{ params, path }` when a pattern matches.

### RouteTask

`createRouteTask` and `createPathTask` return a `RouteTask`, a small wrapper around a `Task` with param helpers.

```typescript
type RouteTask<T> = {
  task: Task<T>;
  getParams: () => RouteParams;
  setParams: (params: RouteParams) => void;
  run: (params?: RouteParams) => Promise<void>;
};
```

## API

### matchRoute

Match a path against a pattern like `/users/:id`.

```typescript
matchRoute("/users/:id", "/users/123")
```

### buildPath

Build a path from a pattern and params.

```typescript
buildPath("/users/:id", { id: "123" })
```

### createRouteTask

Create a Task wrapper that reads params from a mutable source.

```typescript
const routeTask = createRouteTask((params) => (signal) =>
  fetch(`/api/${params.id}`, { signal }).then((r) => r.json())
);
```

### createPathTask

Create a RouteTask from a path pattern. Adds `runPath` convenience.

```typescript
const routeTask = createPathTask(
  "/users/:id",
  (params) => (signal) => fetch(`/api/${params.id}`, { signal }).then((r) => r.json())
);
```

## Practical examples

### Use in a minimal client-side router

```typescript
import { createPathTask, matchRoute } from "@gantryland/task-router";

const userTask = createPathTask(
  "/users/:id",
  (params) => (signal) => fetch(`/api/users/${params.id}`, { signal }).then((r) => r.json())
);

const settingsTask = createPathTask(
  "/settings",
  () => (signal) => fetch("/api/settings", { signal }).then((r) => r.json())
);

const runForPath = async (path: string) => {
  if (matchRoute("/users/:id", path)) return userTask.runPath(path);
  if (matchRoute("/settings", path)) return settingsTask.runPath(path);
};
```

### Combine with Task state and UI

```typescript
import { createPathTask } from "@gantryland/task-router";

const userTask = createPathTask(
  "/users/:id",
  (params) => (signal) => fetch(`/api/users/${params.id}`, { signal }).then((r) => r.json())
);

const unsub = userTask.task.subscribe(({ data, isLoading, error }) => {
  if (isLoading) return showSpinner();
  if (error) return showError(error);
  renderUser(data);
});

await userTask.runPath("/users/42");
unsub();
```

### Prebuild and reuse paths

```typescript
import { buildPath } from "@gantryland/task-router";

const path = buildPath("/teams/:teamId/projects/:id", {
  teamId: "a1",
  id: "p7",
});
```

### Use with task-combinators

```typescript
import { createPathTask } from "@gantryland/task-router";
import { pipe, retry, timeout } from "@gantryland/task-combinators";

const task = createPathTask(
  "/users/:id",
  (params) =>
    pipe(
      (signal) => fetch(`/api/users/${params.id}`, { signal }).then((r) => r.json()),
      retry(2),
      timeout(4000)
    )
);
```

### React usage with task-hooks

```tsx
import { createPathTask } from "@gantryland/task-router";
import { useTaskState, useTaskRun } from "@gantryland/task-hooks";

const routeTask = createPathTask(
  "/users/:id",
  (params) => (signal) => fetch(`/api/users/${params.id}`, { signal }).then((r) => r.json())
);

export function UserRoute({ id }: { id: string }) {
  const state = useTaskState(routeTask.task);
  const run = useTaskRun(routeTask.task, { auto: true, deps: [id] });

  if (state.isLoading) return <Spinner />;
  if (state.error) return <ErrorView error={state.error} />;
  return <UserCard user={state.data} />;
}
```

## Notes

- Patterns support `:param` segments only (no wildcards).
- `createPathTask` throws if a path does not match the pattern.
- `buildPath` throws if a param is missing.

## Related packages

- [@gantryland/task](../task/) - Core Task abstraction
- [@gantryland/task-combinators](../task-combinators/) - Composable TaskFn operators
- [@gantryland/task-hooks](../task-hooks/) - React bindings
- [@gantryland/task-logger](../task-logger/) - Logging utilities

## Tests

```bash
npm test
npx vitest packages/task-router/test
```
