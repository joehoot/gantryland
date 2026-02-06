# @gantryland/task-logger

Structured logging helpers for `Task`, `TaskFn`, and cache events.

Use this package to instrument task lifecycles with consistent event shape while keeping logger backend choice fully pluggable.

## Installation

```bash
npm install @gantryland/task-logger
```

## Quick start

```typescript
import { Task } from "@gantryland/task";
import { cache, MemoryCacheStore } from "@gantryland/task-cache";
import { pipe } from "@gantryland/task-combinators";
import { createLogger, logCache, logTask, logTaskState } from "@gantryland/task-logger";

const logger = createLogger({ prefix: "[app]" });
const store = new MemoryCacheStore();

const usersTask = new Task(
  pipe(
    (signal) => fetch("/api/users", { signal }).then((r) => r.json()),
    logTask({ label: "users", logger }),
    cache("users", store, { ttl: 60_000 })
  )
);

const stopTaskLogs = logTaskState(usersTask, { label: "users", logger });
const stopCacheLogs = logCache(store, { label: "cache", logger });

await usersTask.run();

stopTaskLogs();
stopCacheLogs();
```

## When to use

- You want consistent lifecycle logs for task execution.
- You want cache event visibility for hit/miss/invalidate flows.
- You want observability without committing to a tracing vendor.

## When not to use

- You need distributed tracing context propagation.
- You do not want runtime logging overhead in this layer.

## Exports

- `consoleLogger(event)`
- `createLogger({ prefix?, logger? })`
- `logTask(options?)`
- `logTaskState(task, options?)`
- `logCache(store, options?)`

Core event types:

```typescript
type LogLevel = "debug" | "info" | "warn" | "error";

type LogEvent = {
  level: LogLevel;
  message: string;
  meta?: Record<string, unknown>;
};

type Logger = (event: LogEvent) => void;
```

## Semantics

- `logTask`
  - Logs `start` before execution.
  - Logs `success` with `durationMs` on resolve.
  - Logs `abort` at `debug` level for `AbortError`.
  - Logs `error` with `durationMs` and `error` metadata for non-abort failures.
  - Always rethrows.
- `logTaskState`
  - Subscribes to task state transitions.
  - Logs `start` when loading begins (including immediate subscribe during in-flight state).
  - Logs terminal transition as `success`/`error`/`abort` based on resulting state.
  - Uses data reference equality to infer success vs abort when no error is present.
- `logCache`
  - Subscribes to cache events and logs `${label} ${event.type}` at `debug` level.
  - Includes `key` in `meta` when present.
  - Returns no-op unsubscribe if store has no `subscribe`.

## Patterns

### 1) JSON logger backend

```typescript
import type { LogEvent } from "@gantryland/task-logger";
import { createLogger } from "@gantryland/task-logger";

const jsonLogger = (event: LogEvent) => {
  console.log(JSON.stringify({ ...event, ts: new Date().toISOString() }));
};

const logger = createLogger({ prefix: "[tasks]", logger: jsonLogger });
```

### 2) TaskFn execution instrumentation

```typescript
import { Task } from "@gantryland/task";
import { pipe, retry } from "@gantryland/task-combinators";
import { logTask } from "@gantryland/task-logger";

const task = new Task(
  pipe(
    (signal) => fetch("/api/search", { signal }).then((r) => r.json()),
    retry(2),
    logTask({ label: "search" })
  )
);
```

### 3) Task state transition logging

```typescript
import { Task } from "@gantryland/task";
import { logTaskState } from "@gantryland/task-logger";

const task = new Task((signal) => fetch("/api/profile", { signal }).then((r) => r.json()));

const unsubscribe = logTaskState(task, { label: "profile" });
await task.run();
unsubscribe();
```

### 4) Cache event logging

```typescript
import { MemoryCacheStore } from "@gantryland/task-cache";
import { logCache } from "@gantryland/task-logger";

const store = new MemoryCacheStore();
const unsubscribe = logCache(store, { label: "cache" });

unsubscribe();
```

## Related packages

- [@gantryland/task](../task/) - Task execution and state primitive
- [@gantryland/task-combinators](../task-combinators/) - TaskFn composition and control-flow operators
- [@gantryland/task-cache](../task-cache/) - Cache combinators and in-memory store
- [@gantryland/task-storage](../task-storage/) - Persistent CacheStore implementations

## Test this package

```bash
npx vitest packages/task-logger/test
```
