# @gantryland/task-scheduler

Scheduling utilities for `Task` and `TaskFn`.

Use this package for polling, debouncing, throttling, and queueing while keeping abort behavior explicit.

## Installation

```bash
npm install @gantryland/task-scheduler
```

## Quick start

```typescript
import { Task } from "@gantryland/task";
import { debounce, pollTask } from "@gantryland/task-scheduler";
import { pipe } from "@gantryland/task-combinators";

const searchTask = new Task(
  pipe(
    (signal, query: string) =>
      fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal }).then((r) =>
        r.json()
      ),
    debounce({ waitMs: 250 })
  )
);

await searchTask.run("shoe");

const stop = pollTask(searchTask, { intervalMs: 10_000, immediate: true }, "shoe");
stop();
```

## When to use

- You want a tiny scheduling layer for existing tasks.
- You need latest-wins debounce for user-driven input.
- You need simple throttle or bounded FIFO concurrency.
- You want fixed-interval polling with an explicit stop handle.

## When not to use

- You need distributed job queues or cron orchestration.
- You need persistence/priority/retry policy in the scheduler itself.

## Exports

- `pollTask(task, options, ...args)`
- `debounce(options)`
- `throttle(options)`
- `queue(options?)`

Options are inline object params on each API:

- `pollTask(task, { intervalMs, immediate? }, ...args)`
- `debounce({ waitMs })`
- `throttle({ windowMs })`
- `queue({ concurrency? })`

## Semantics

- `pollTask`
  - Calls `task.run(...args)` each interval.
  - Starts immediately unless `immediate: false`.
  - If `task.run` rejects, polling loop stops.
- `debounce`
  - Latest call wins within `waitMs`.
  - Superseded calls reject with `AbortError`.
- `throttle`
  - Shares one in-flight promise per throttle window.
  - Calls inside the window reuse the first call's args/signal.
- `queue`
  - FIFO execution with bounded concurrency.
  - If signal aborts before start, entry is removed and rejects with `AbortError`.

## Patterns

### 1) Debounced search task

```typescript
import { Task } from "@gantryland/task";
import { debounce } from "@gantryland/task-scheduler";
import { pipe } from "@gantryland/task-combinators";

const searchTask = new Task(
  pipe(
    (signal, q: string) =>
      fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal }).then((r) => r.json()),
    debounce({ waitMs: 300 })
  )
);

await searchTask.run("laptop");
```

### 2) Throttled telemetry

```typescript
import { pipe } from "@gantryland/task-combinators";
import { throttle } from "@gantryland/task-scheduler";

const sendTelemetry = (signal?: AbortSignal) =>
  fetch("/api/telemetry", { method: "POST", signal }).then((r) => r.json());

const throttledTelemetry = pipe(sendTelemetry, throttle({ windowMs: 1_000 }));
```

### 3) Queued writes with concurrency

```typescript
import { Task } from "@gantryland/task";
import { queue } from "@gantryland/task-scheduler";
import { pipe } from "@gantryland/task-combinators";

type Payload = { id: string };

const writeTask = new Task(
  pipe(
    (signal, payload: Payload) =>
      fetch("/api/write", {
        method: "POST",
        signal,
        body: JSON.stringify(payload),
      }).then((r) => r.json()),
    queue({ concurrency: 2 })
  )
);

await writeTask.run({ id: "p1" });
```

### 4) Poll a status task

```typescript
import { Task } from "@gantryland/task";
import { pollTask } from "@gantryland/task-scheduler";

const statusTask = new Task((signal) =>
  fetch("/api/status", { signal }).then((r) => r.json())
);

const stop = pollTask(statusTask, { intervalMs: 5_000, immediate: true });

stop();
```

## Related packages

- [@gantryland/task](../task/) - Task execution and state primitive
- [@gantryland/task-combinators](../task-combinators/) - TaskFn composition and control-flow operators
- [@gantryland/task-cache](../task-cache/) - Cache combinators and in-memory store
- [@gantryland/task-hooks](../task-hooks/) - React bindings for Task state

## Test this package

```bash
npx vitest packages/task-scheduler/test
```
