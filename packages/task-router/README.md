# @gantryland/task-router

Route helpers for Task. Simple pattern matching plus Task wrappers for route params, without bringing in a full router.

- Lightweight pattern matching with `:param` segments.
- Task wrappers that keep params and execution together.
- Helpers to build paths from params.
- Works in browser and Node.js with no dependencies.

## Installation

```bash
npm install @gantryland/task-router
```

## Contents

- [Quick start](#quick-start)
- [Design goals](#design-goals)
- [When to use task-router](#when-to-use-task-router)
- [When not to use task-router](#when-not-to-use-task-router)
- [Core concepts](#core-concepts)
- [Flow](#flow)
- [API](#api)
- [Common patterns](#common-patterns)
- [Integrations](#integrations)
- [Related packages](#related-packages)
- [Tests](#tests)

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

This example shows a route pattern bound to a Task and run by path.

## Design goals

- Keep routing helpers tiny and composable.
- Avoid a full router dependency.
- Make params explicit and easy to reuse.

## When to use task-router

- You want a small route matcher for Task.
- You need param-driven TaskFns.
- You want to build or validate paths with params.

## When not to use task-router

- You need nested routes, loaders, or history management.
- You need wildcard or regex route matching.

## Core concepts

### Patterns and params

Patterns support `:param` segments. `matchRoute` returns `{ params, path }` when a pattern matches.

### RouteTask

`createRouteTask` and `createPathTask` return a `RouteTask`, a wrapper around a Task with param helpers.

```typescript
type RouteTask<T> = {
  task: Task<T>;
  getParams: () => RouteParams;
  setParams: (params: RouteParams) => void;
  run: (params?: RouteParams) => Promise<T | undefined>;
};
```

## Flow

```text
pattern + params -> TaskFn -> Task
path -> matchRoute -> params -> run(params)
```

## API

### API at a glance

| Member | Purpose | Returns |
| --- | --- | --- |
| **Routing** |  |  |
| [`matchRoute`](#matchroute) | Match a path to params | `RouteMatch | null` |
| [`buildPath`](#buildpath) | Build path from params | `string` |
| **Tasks** |  |  |
| [`createRouteTask`](#createroutetask) | Task wrapper with params | `RouteTask<T>` |
| [`createPathTask`](#createpathtask) | RouteTask + runPath | `RouteTask<T> & { runPath }` |

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

### Guarantees

- `matchRoute` returns `null` for non-matching paths.
- `buildPath` encodes params.
- `createPathTask` throws if a path does not match the pattern.

### Gotchas

- Patterns support `:param` segments only (no wildcards).
- `buildPath` throws if a param is missing.

## Common patterns

Use these patterns for most usage.

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

## Integrations

Compose with other Gantryland utilities. This section shows common pairings.

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
