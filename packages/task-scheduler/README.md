# Task Scheduler

Scheduling utilities and combinators for Task.

Works in browser and Node.js with no dependencies.

## Quick start

```typescript
import { Task } from "@gantryland/task";
import { debounce, pollTask } from "@gantryland/task-scheduler";

const task = new Task(debounce({ waitMs: 300 })(fetchUsers));

const stop = pollTask(task, { intervalMs: 5000, immediate: true });
// later: stop()
```

## API

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

## Notes

- `pollTask` calls `task.run()` on each interval.
- Debounce rejects superseded calls with AbortError.
- Throttle shares the in-flight call within the window (new signals are ignored).
- Queue respects the configured concurrency.
