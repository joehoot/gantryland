# Task Router

Route helpers for Task. Simple pattern matching plus Task wrappers for route params.

Works in browser and Node.js with no dependencies.

## Quick start

```typescript
import { Task } from "@gantryland/task";
import { createPathTask } from "@gantryland/task-router";

const userTask = createPathTask(
  "/users/:id",
  (params) => () => fetch(`/api/users/${params.id}`).then((r) => r.json())
);

await userTask.runPath("/users/123");
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
const routeTask = createRouteTask((params) => () => fetch(`/api/${params.id}`))
```

### createPathTask

Create a RouteTask from a path pattern.

```typescript
const routeTask = createPathTask("/users/:id", (params) => () => fetch(`/api/${params.id}`))
```

## Notes

- Patterns support `:param` segments.
- `createPathTask` throws if a path does not match the pattern.
- `buildPath` throws if a param is missing.

## Tests

```bash
npm test

npx vitest packages/task-router/test
```
