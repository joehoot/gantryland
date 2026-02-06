# @gantryland/task-router

Route helpers for `@gantryland/task`.

This package gives you small route-pattern utilities (`:param` segments) and task wrappers that keep params and execution tied together, without pulling in a full router.

## Installation

```bash
npm install @gantryland/task-router
```

## Quick start

```typescript
import { createPathTask } from "@gantryland/task-router";

type User = { id: string; name: string };

const userTask = createPathTask<User>(
  "/users/:id",
  (params) => (signal) =>
    fetch(`/api/users/${params.id}`, { signal }).then((r) => r.json())
);

await userTask.runPath("/users/123");
```

## When to use

- You want path matching and param extraction for Task-based data flows.
- You want route-param aware tasks without adding a router framework.
- You need path building from params with URL encoding.

## When not to use

- You need full routing features (history, nested routes, loaders, transitions).
- You need wildcard or regex route matching.

## Exports

- `matchRoute(pattern, path)`
- `buildPath(pattern, params)`
- `createRouteTask(taskForParams, initialParams?)`
- `createPathTask(pattern, taskForParams, initialPath?)`

Core types:

```typescript
type RouteParams = Record<string, string>;

type RouteMatch = {
  params: RouteParams;
  path: string;
};

type RouteTask<T, Args extends unknown[] = []> = {
  task: Task<T, Args>;
  getParams: () => RouteParams;
  setParams: (params: RouteParams) => void;
  run: (params?: RouteParams, ...args: Args) => Promise<T | undefined>;
};
```

## Semantics

- `matchRoute`
  - Full-segment match only; returns `null` on mismatch.
  - Decodes params with `decodeURIComponent`.
  - Invalid encoding returns `null`.
- `buildPath`
  - Encodes param values with `encodeURIComponent`.
  - Throws when required params are missing.
  - Always returns a leading slash.
- `createRouteTask`
  - Uses the latest stored params snapshot for execution.
  - `run(params)` updates params before delegating to `task.run(...)`.
  - `getParams()` returns a copy.
- `createPathTask`
  - Adds `runPath(path, ...args)` that validates/matches the path.
  - Throws if `runPath` receives a non-matching path.

Like `Task`, `run` and `runPath` resolve to `undefined` on error, abort, or superseded runs.

## Patterns

### 1) Match first, route task execution

```typescript
import { createPathTask, matchRoute } from "@gantryland/task-router";

const userTask = createPathTask(
  "/users/:id",
  (params) => (signal) =>
    fetch(`/api/users/${params.id}`, { signal }).then((r) => r.json())
);

async function runForPath(path: string) {
  if (matchRoute("/users/:id", path)) {
    return userTask.runPath(path);
  }
}
```

### 2) Build stable links from params

```typescript
import { buildPath } from "@gantryland/task-router";

const path = buildPath("/teams/:teamId/projects/:projectId", {
  teamId: "alpha",
  projectId: "p42",
});
```

### 3) Keep params and task state together

```typescript
import { createPathTask } from "@gantryland/task-router";

const userTask = createPathTask(
  "/users/:id",
  (params) => (signal) =>
    fetch(`/api/users/${params.id}`, { signal }).then((r) => r.json())
);

const unsubscribe = userTask.task.subscribe((state) => {
  console.log(userTask.getParams(), state);
});

await userTask.runPath("/users/42");
unsubscribe();
```

### 4) Compose task function with combinators

```typescript
import { createPathTask } from "@gantryland/task-router";
import { pipe, retry, timeout } from "@gantryland/task-combinators";

const routeTask = createPathTask(
  "/users/:id",
  (params) =>
    pipe(
      (signal) => fetch(`/api/users/${params.id}`, { signal }).then((r) => r.json()),
      retry(2),
      timeout(4_000)
    )
);

await routeTask.runPath("/users/99");
```

## Related packages

- [@gantryland/task](../task/) - Task execution and state primitive
- [@gantryland/task-combinators](../task-combinators/) - TaskFn composition and control-flow operators
- [@gantryland/task-hooks](../task-hooks/) - React bindings for Task state

## Test this package

```bash
npx vitest packages/task-router/test
```
