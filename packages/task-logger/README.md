# Task Logger

Logging utilities for Task and task-cache.

Works in browser and Node.js with no dependencies.

## Quick start

```typescript
import { Task } from "@gantryland/task";
import { logTask, logTaskState, logCache, createLogger } from "@gantryland/task-logger";
import { MemoryCacheStore, cache } from "@gantryland/task-cache";
import { pipe } from "@gantryland/task-combinators";

const logger = createLogger({ prefix: "[app]" });
const store = new MemoryCacheStore();

const task = new Task(
  pipe(
    () => fetch("/api/users").then((r) => r.json()),
    logTask({ label: "users", logger }),
    cache("users", store, { ttl: 60_000 })
  )
);

const unsubscribeTask = logTaskState(task, { label: "users", logger });
const unsubscribeCache = logCache(store, { label: "cache", logger });

await task.run();

unsubscribeTask();
unsubscribeCache();
```

## API

### createLogger

Create a logger with an optional prefix.

```typescript
createLogger({ prefix: "[app]", logger: consoleLogger })
```

### logTask

Wrap a TaskFn and log start/success/error/abort.

```typescript
logTask({ label: "users" })
```

### logTaskState

Subscribe to a Task and log lifecycle transitions.

```typescript
const unsubscribe = logTaskState(task, { label: "users" })
```

### logCache

Subscribe to cache events and log them.

```typescript
const unsubscribe = logCache(store, { label: "cache" })
```

## Notes

- `logTask` is for TaskFn composition.
- `logTaskState` attaches to a Task instance.
- Cache logging requires a store that supports `subscribe`.
