# @gantryland/task-logger

Logging utilities for Task and task-cache. Capture TaskFn execution timing, Task state transitions, and cache events with a consistent logger interface.

- Structured log events with customizable logger backends.
- TaskFn wrappers and Task state subscriptions.
- Cache event logging with optional labels.
- Works in browser and Node.js with no dependencies.

## Installation

```bash
npm install @gantryland/task-logger
```

## Contents

- [Quick start](#quick-start)
- [At a glance](#at-a-glance)
- [Design goals](#design-goals)
- [When to use task-logger](#when-to-use-task-logger)
- [When not to use task-logger](#when-not-to-use-task-logger)
- [Core concepts](#core-concepts)
- [Flow](#flow)
- [Run semantics](#run-semantics)
- [API](#api)
- [Common patterns](#common-patterns)
- [Integrations](#integrations)
- [Related packages](#related-packages)
- [Tests](#tests)

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

This example shows TaskFn execution, Task state transitions, and cache events.

## At a glance

```typescript
import { Task } from "@gantryland/task";
import { logTask, logTaskState } from "@gantryland/task-logger";

const task = new Task(
  logTask({ label: "profile" })((signal) =>
    fetch("/api/profile", { signal }).then((r) => r.json())
  )
);

const unsubscribe = logTaskState(task, { label: "profile" });
await task.run();
unsubscribe();
```

## Design goals

- Make logging opt-in and composable.
- Keep log payloads structured and consistent.
- Avoid coupling to specific logging vendors.

## When to use task-logger

- You want structured logs for Task execution.
- You need cache event logging.
- You want minimal instrumentation overhead.

## When not to use task-logger

- You need full tracing with distributed context.
- You do not want logging in production at all.

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

### Cache logging

`logCache` listens to CacheStore events and logs them. It requires a store that implements `subscribe`.

## Flow

```text
logTask: TaskFn -> start -> success/error/abort
logTaskState: Task -> subscribe -> transitions
logCache: CacheStore -> subscribe -> events
```

## Run semantics

- `logTask` logs `start` before calling the TaskFn and always rethrows errors.
- AbortError is logged as `debug` with an `abort` message.
- `logTaskState` infers success vs abort from TaskState changes; a completion without error that keeps the same data reference logs as `abort`.
- `logTaskState` logs `start` immediately if you subscribe while a run is already in-flight.
- `logCache` returns a no-op unsubscribe when the store does not expose `subscribe`.

## API

### API at a glance

| Member | Purpose | Returns |
| --- | --- | --- |
| **Loggers** |  |  |
| [`consoleLogger`](#consolelogger) | Console logger backend | `Logger` |
| [`createLogger`](#createlogger) | Prefix and wrap a logger | `Logger` |
| **Task logging** |  |  |
| [`logTask`](#logtask) | Log TaskFn execution | `(taskFn) => TaskFn` |
| [`logTaskState`](#logtaskstate) | Log Task state transitions | `() => void` |
| **Cache logging** |  |  |
| [`logCache`](#logcache) | Log cache events | `() => void` |

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

### Guarantees

- `logTask` always rethrows errors after logging.
- AbortError is logged as `debug` with an `abort` message.
- `logCache` is a no-op if the store does not support `subscribe`.
- `logTaskState` logs `start` immediately if you subscribe while a run is already in-flight.

### Gotchas

- `logTaskState` infers aborts from state changes; it does not inspect AbortSignal.
- If a run resolves to the same data reference as the previous success, `logTaskState` logs it as `abort`.
- Logging adds minimal overhead, but it is still I/O.

## Common patterns

Use these patterns for most usage.

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

## Integrations

Compose with other Gantryland utilities. This section shows common pairings.

### Use with task-cache

```typescript
import { MemoryCacheStore, cache } from "@gantryland/task-cache";
import { logCache } from "@gantryland/task-logger";

const store = new MemoryCacheStore();
const unsubscribe = logCache(store, { label: "cache" });

// Wrap TaskFns with cache(...) and logTask(...) as needed.
```

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
