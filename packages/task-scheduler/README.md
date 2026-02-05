# @gantryland/task-scheduler

Scheduling utilities and combinators for Task. Includes polling, debouncing, throttling, and queueing TaskFns.

- Task-level polling helpers.
- TaskFn combinators for debounce, throttle, and queue.
- Abort-aware behavior across schedulers.
- Works in browser and Node.js with no dependencies.

## Installation

```bash
npm install @gantryland/task-scheduler
```

## Contents

- [Quick start](#quick-start)
- [Design goals](#design-goals)
- [When to use task-scheduler](#when-to-use-task-scheduler)
- [When not to use task-scheduler](#when-not-to-use-task-scheduler)
- [Core concepts](#core-concepts)
- [Flow](#flow)
- [API](#api)
- [Common patterns](#common-patterns)
- [Integrations](#integrations)
- [Related packages](#related-packages)
- [Tests](#tests)

## Quick start

```typescript
import { Task } from "@gantryland/task";
import { debounce, pollTask } from "@gantryland/task-scheduler";

const task = new Task(debounce({ waitMs: 300 })(fetchUsers));

const stop = pollTask(task, { intervalMs: 5000, immediate: true });
// later: stop()
```

This example shows a debounced TaskFn and a polled Task.

## Design goals

- Keep schedulers small and composable.
- Separate Task-level polling from TaskFn-level scheduling.
- Respect cancellation signals and predictable timing.

## When to use task-scheduler

- You want to poll Tasks on an interval.
- You need debounce or throttle for user-driven TaskFns.
- You need limited concurrency with queueing.

## When not to use task-scheduler

- You need a full job queue or cron system.
- You want complex scheduling semantics (priority, retries, persistence).

## Core concepts

### Task vs TaskFn utilities

- `pollTask` works on a Task instance and calls `task.run(...args)` on an interval.
- `debounce`, `throttle`, and `queue` wrap TaskFn and return a new TaskFn.

### Abort behavior

Debounced and queued TaskFns respect `AbortSignal`. Debounce rejects superseded calls with AbortError.

## Flow

```text
TaskFn -> debounce/throttle/queue -> Task
Task -> pollTask -> run(...args) on interval
```

## API

### API at a glance

| Member | Purpose | Returns |
| --- | --- | --- |
| **Task** |  |  |
| [`pollTask`](#polltask) | Poll a Task on an interval | `() => void` |
| **TaskFn** |  |  |
| [`debounce`](#debounce) | Debounce a TaskFn | `(taskFn) => TaskFn` |
| [`throttle`](#throttle) | Throttle a TaskFn | `(taskFn) => TaskFn` |
| [`queue`](#queue) | Queue a TaskFn | `(taskFn) => TaskFn` |

### pollTask

Start polling a Task on an interval. Returns a stop function.

```typescript
pollTask(task, { intervalMs: 5000, immediate: true })
```

### debounce

Debounce a TaskFn. Only the last call within the window executes.

```typescript
debounce({ waitMs: 250 })
```

### throttle

Throttle a TaskFn. Executes at most once per window.

```typescript
throttle({ windowMs: 1000 })
```

### queue

Queue a TaskFn with limited concurrency.

```typescript
queue({ concurrency: 2 })
```

### Guarantees

- `pollTask` calls `task.run(...args)` on each interval tick.
- Debounce rejects superseded calls with AbortError.
- Queue respects configured concurrency.

### Gotchas

- `pollTask` does not catch Task errors; handle errors in Task state.
- Throttle shares the in-flight call within the window.

## Common patterns

Use these patterns for most usage.

### Debounce search input

```typescript
import { Task } from "@gantryland/task";
import { debounce } from "@gantryland/task-scheduler";

const searchTask = new Task(
  debounce({ waitMs: 300 })((signal) =>
    fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal }).then((r) => r.json())
  )
);

await searchTask.run();
```

### Throttle telemetry

```typescript
import { throttle } from "@gantryland/task-scheduler";

const sendTelemetry = throttle({ windowMs: 1000 })((signal) =>
  fetch("/api/telemetry", { method: "POST", signal }).then((r) => r.json())
);
```

### Queue concurrent writes

```typescript
import { Task } from "@gantryland/task";
import { queue } from "@gantryland/task-scheduler";

const writeTask = new Task(
  queue({ concurrency: 2 })((signal) =>
    fetch("/api/write", { method: "POST", signal }).then((r) => r.json())
  )
);
```

### Poll a Task for updates

```typescript
import { Task } from "@gantryland/task";
import { pollTask } from "@gantryland/task-scheduler";

const statusTask = new Task((signal) =>
  fetch("/api/status", { signal }).then((r) => r.json())
);

const stop = pollTask(statusTask, { intervalMs: 10_000, immediate: true });

// Later
stop();
```

### Combine with task-combinators

```typescript
import { Task } from "@gantryland/task";
import { debounce } from "@gantryland/task-scheduler";
import { pipe, retry, timeout } from "@gantryland/task-combinators";

const task = new Task(
  debounce({ waitMs: 300 })(
    pipe(
      (signal) => fetch("/api/search", { signal }).then((r) => r.json()),
      retry(1),
      timeout(4000)
    )
  )
);
```

## Integrations

Compose with other Gantryland utilities. This section shows common pairings.

### React usage with task-hooks

```tsx
import { Task } from "@gantryland/task";
import { pollTask } from "@gantryland/task-scheduler";
import { useTaskState } from "@gantryland/task-hooks";
import { useEffect } from "react";

const statusTask = new Task((signal) =>
  fetch("/api/status", { signal }).then((r) => r.json())
);

export function StatusPanel() {
  const state = useTaskState(statusTask);

  useEffect(() => {
    const stop = pollTask(statusTask, { intervalMs: 5000, immediate: true });
    return () => stop();
  }, []);

  if (state.isLoading) return <Spinner />;
  return <StatusView status={state.data} />;
}
```

## Related packages

- [@gantryland/task](../task/) - Core Task abstraction
- [@gantryland/task-combinators](../task-combinators/) - Composable TaskFn operators
- [@gantryland/task-hooks](../task-hooks/) - React bindings
- [@gantryland/task-cache](../task-cache/) - Cache combinators and stores
- [@gantryland/task-logger](../task-logger/) - Logging utilities

## Tests

```bash
npm test
npx vitest packages/task-scheduler/test
```
