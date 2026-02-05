# @gantryland/task-logger

Logging utilities for Task and task-cache. Capture TaskFn execution timing, Task state transitions, and cache events with a consistent logger interface.

Works in browser and Node.js with no dependencies.

## Installation

```bash
npm install @gantryland/task-logger
```

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
    (signal) => fetch("/api/users", { signal }).then((r) => r.json()),
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

## Core concepts

### Logger and LogEvent

You provide a `Logger` function that receives structured `LogEvent` objects.

```typescript
type LogEvent = {
  level: "debug" | "info" | "warn" | "error";
  message: string;
  meta?: Record<string, unknown>;
};

type Logger = (event: LogEvent) => void;
```

### TaskFn vs Task instance logging

- `logTask` wraps a TaskFn and logs start/success/error/abort with duration.
- `logTaskState` subscribes to a Task instance and logs state transitions.

## API

### consoleLogger

Console-based logger implementation.

```typescript
import { consoleLogger } from "@gantryland/task-logger";
```

### createLogger

Create a logger with an optional prefix.

```typescript
const logger = createLogger({ prefix: "[api]", logger: consoleLogger });
```

### logTask

Wrap a TaskFn and log start/success/error/abort with duration metadata.

```typescript
logTask({ label: "users", logger })
```

### logTaskState

Subscribe to a Task instance and log lifecycle transitions. Returns an unsubscribe function.

```typescript
const unsubscribe = logTaskState(task, { label: "users", logger });
```

### logCache

Subscribe to cache events and log them. Returns an unsubscribe function.

```typescript
const unsubscribe = logCache(store, { label: "cache", logger });
```

## Practical examples

### Custom logger with structured output

```typescript
import type { LogEvent } from "@gantryland/task-logger";

const jsonLogger = (event: LogEvent) => {
  const payload = { ...event, ts: new Date().toISOString() };
  console.log(JSON.stringify(payload));
};

const logger = createLogger({ prefix: "[tasks]", logger: jsonLogger });
```

### Logging TaskFn execution

```typescript
import { Task } from "@gantryland/task";
import { logTask } from "@gantryland/task-logger";
import { pipe, retry } from "@gantryland/task-combinators";

const task = new Task(
  pipe(
    (signal) => fetch("/api/search", { signal }).then((r) => r.json()),
    retry(2),
    logTask({ label: "search" })
  )
);
```

### Logging Task state transitions

```typescript
import { Task } from "@gantryland/task";
import { logTaskState } from "@gantryland/task-logger";

const task = new Task((signal) =>
  fetch("/api/profile", { signal }).then((r) => r.json())
);

const unsubscribe = logTaskState(task, { label: "profile" });
await task.run();
unsubscribe();
```

### Logging cache events

```typescript
import { MemoryCacheStore } from "@gantryland/task-cache";
import { logCache } from "@gantryland/task-logger";

const store = new MemoryCacheStore();
const unsubscribe = logCache(store, { label: "cache" });

store.set("users", { value: [], createdAt: Date.now(), updatedAt: Date.now() });
unsubscribe();
```

### Combined Task + cache logging

```typescript
import { Task } from "@gantryland/task";
import { MemoryCacheStore, cache } from "@gantryland/task-cache";
import { logTask, logCache, createLogger } from "@gantryland/task-logger";
import { pipe } from "@gantryland/task-combinators";

const logger = createLogger({ prefix: "[app]" });
const store = new MemoryCacheStore();

const task = new Task(
  pipe(
    (signal) => fetch("/api/users", { signal }).then((r) => r.json()),
    logTask({ label: "users", logger }),
    cache("users", store, { ttl: 60_000 })
  )
);

const unsubscribeCache = logCache(store, { label: "cache", logger });
await task.run();
unsubscribeCache();
```

## Notes

- `logTask` is for TaskFn composition and logs duration metadata.
- `logTaskState` attaches to a Task instance and infers start/success/error/abort from state transitions.
- Cache logging requires a store that supports `subscribe` (MemoryCacheStore and StorageCacheStore do).

## Related packages

- [@gantryland/task](../task/) - Core Task abstraction
- [@gantryland/task-combinators](../task-combinators/) - Composable TaskFn operators
- [@gantryland/task-cache](../task-cache/) - Cache combinators and stores
- [@gantryland/task-storage](../task-storage/) - Persistent CacheStore implementations
- [@gantryland/task-hooks](../task-hooks/) - React bindings

## Tests

```bash
npm test
npx vitest packages/task-logger/test
```
