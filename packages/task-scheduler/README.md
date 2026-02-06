# @gantryland/task-scheduler

Scheduling utilities and combinators for Task and TaskFn. Use this package to poll Tasks on a fixed interval and to debounce, throttle, or queue TaskFns with explicit AbortSignal behavior.

- Poll Tasks on a fixed interval with a stop handle.
- Debounce TaskFns with latest-wins semantics and AbortError supersession.
- Throttle TaskFns with shared in-flight promises per window.
- Queue TaskFns with bounded concurrency and pre-start abort handling.
- Works in browser and Node.js with no dependencies.

## Installation

```bash
npm install @gantryland/task-scheduler
```

## Contents

- [Quick start](#quick-start)
- [At a glance](#at-a-glance)
- [Design goals](#design-goals)
- [When to use task-scheduler](#when-to-use-task-scheduler)
- [When not to use task-scheduler](#when-not-to-use-task-scheduler)
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
import { debounce, pollTask } from "@gantryland/task-scheduler";
import { pipe } from "@gantryland/task-combinators";

const fetchUsers = (signal?: AbortSignal) =>
  fetch("/api/users", { signal }).then((r) => r.json());

const task = new Task(pipe(fetchUsers, debounce({ waitMs: 300 })));

const stop = pollTask(task, { intervalMs: 5000, immediate: true });
// later
stop();
```

## At a glance

```typescript
import { debounce, pollTask, queue, throttle } from "@gantryland/task-scheduler";

const debounced = debounce({ waitMs: 300 });
const throttled = throttle({ windowMs: 1000 });
const queued = queue({ concurrency: 2 });
const stop = pollTask(task, { intervalMs: 5000, immediate: true });
```

## Design goals

- Keep schedulers small and composable.
- Separate Task-level polling from TaskFn-level scheduling.
- Make AbortSignal behavior explicit and predictable.

## When to use task-scheduler

- You want to poll a Task on a fixed interval.
- You want debounce or throttle for user-driven TaskFns.
- You need bounded concurrency with a FIFO queue.

## When not to use task-scheduler

- You need a full job queue or cron system.
- You need retries, persistence, or priority scheduling.

## Core concepts

### Task vs TaskFn utilities

- `pollTask` works on a Task instance and calls `task.run(...args)` on an interval.
- `debounce`, `throttle`, and `queue` wrap a TaskFn and return a new TaskFn.

### Abort behavior

- Debounce rejects superseded calls with AbortError.
- Throttle reuses the in-flight promise within the window and ignores later signals.
- Queue removes entries that abort before start and rejects with AbortError.

## Flow

```text
TaskFn -> debounce/throttle/queue -> Task
Task -> pollTask -> run(...args) on interval
```

## Run semantics

- `pollTask` calls `task.run(...args)` on each tick. If `task.run` throws (for example, no TaskFn is defined), the polling loop stops.
- `debounce` is latest-wins. Superseded calls reject with AbortError, and the last call executes after `waitMs`.
- `throttle` shares one in-flight promise per window. Later calls within the window ignore their signal and args.
- `queue` runs in FIFO order with bounded concurrency. If a signal aborts before start, the call is removed and rejects with AbortError.
- If a wrapped TaskFn throws synchronously, the returned promise rejects with that error.

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
const stop = pollTask(task, { intervalMs: 5000, immediate: true });
```

### debounce

Debounce a TaskFn. Only the last call within the window executes.

```typescript
const debounced = debounce({ waitMs: 250 });
```

### throttle

Throttle a TaskFn. At most one in-flight call per window.

```typescript
const throttled = throttle({ windowMs: 1000 });
```

### queue

Queue a TaskFn with limited concurrency.

```typescript
const queued = queue({ concurrency: 2 });
```

## Common patterns

### Debounce search input

```typescript
import { Task } from "@gantryland/task";
import { debounce } from "@gantryland/task-scheduler";
import { pipe } from "@gantryland/task-combinators";

const search = (signal: AbortSignal, query: string) =>
  fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal }).then((r) => r.json());

const searchTask = new Task(pipe(search, debounce({ waitMs: 300 })));

await searchTask.run("shoes");
```

### Throttle telemetry

```typescript
import { throttle } from "@gantryland/task-scheduler";
import { pipe } from "@gantryland/task-combinators";

const sendTelemetry = (signal?: AbortSignal) =>
  fetch("/api/telemetry", { method: "POST", signal }).then((r) => r.json());

const throttled = pipe(sendTelemetry, throttle({ windowMs: 1000 }));
```

### Queue concurrent writes

```typescript
import { Task } from "@gantryland/task";
import { queue } from "@gantryland/task-scheduler";
import { pipe } from "@gantryland/task-combinators";

type Payload = { id: string };

const write = (signal: AbortSignal, payload: Payload) =>
  fetch("/api/write", {
    method: "POST",
    body: JSON.stringify(payload),
    signal,
  }).then((r) => r.json());

const writeTask = new Task(pipe(write, queue({ concurrency: 2 })));
```

### Poll a Task for updates

```typescript
import { Task } from "@gantryland/task";
import { pollTask } from "@gantryland/task-scheduler";

const statusTask = new Task((signal) =>
  fetch("/api/status", { signal }).then((r) => r.json())
);

const stop = pollTask(statusTask, { intervalMs: 10_000, immediate: true });

// later
stop();
```

### Combine with task-combinators

```typescript
import { Task } from "@gantryland/task";
import { debounce } from "@gantryland/task-scheduler";
import { pipe, retry, timeout } from "@gantryland/task-combinators";

const task = new Task(
  pipe(
    (signal) => fetch("/api/search", { signal }).then((r) => r.json()),
    retry(1),
    timeout(4000),
    debounce({ waitMs: 300 })
  )
);
```

## Integrations

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
