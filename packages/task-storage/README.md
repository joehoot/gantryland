# @gantryland/task-storage

Persistent cache stores that implement `CacheStore` from `@gantryland/task-cache`. Use these to keep cache entries across sessions or processes.

Works in browser and Node.js with no dependencies.

## Installation

```bash
npm install @gantryland/task-storage
```

## Quick start (browser)

```typescript
import { Task } from "@gantryland/task";
import { cache } from "@gantryland/task-cache";
import { StorageCacheStore } from "@gantryland/task-storage";
import { pipe } from "@gantryland/task-combinators";

const store = new StorageCacheStore(window.localStorage, { prefix: "app:" });

const task = new Task(
  pipe(
    (signal) => fetch("/api/users", { signal }).then((r) => r.json()),
    cache("users", store, { ttl: 60_000 })
  )
);
```

## Quick start (Node.js)

```typescript
import { FileCacheStore } from "@gantryland/task-storage";

const store = new FileCacheStore("./.cache/tasks.json", { pretty: true });
```

## Core concepts

### StorageCacheStore

Wraps a `Storage`-like interface (localStorage/sessionStorage). Entries are serialized to JSON by default and keyed with a prefix.

### FileCacheStore

Persists a cache map to disk as JSON using synchronous I/O. Intended for Node.js processes.

## API

### StorageCacheStore

```typescript
new StorageCacheStore(storage, {
  prefix?: string,
  serialize?: (entry) => string,
  deserialize?: (raw) => CacheEntry | undefined,
})
```

### FileCacheStore (Node.js only)

```typescript
new FileCacheStore(filePath, { pretty?: boolean })
```

### StorageLike

Minimal interface for a storage backend.

```typescript
type StorageLike = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
  key(index: number): string | null
  readonly length: number
}
```

## Practical examples

### Persist Task cache to localStorage

```typescript
import { Task } from "@gantryland/task";
import { cache } from "@gantryland/task-cache";
import { StorageCacheStore } from "@gantryland/task-storage";
import { pipe } from "@gantryland/task-combinators";

const store = new StorageCacheStore(localStorage, { prefix: "gantry:" });

const task = new Task(
  pipe(
    (signal) => fetch("/api/settings", { signal }).then((r) => r.json()),
    cache("settings", store, { ttl: 300_000, tags: ["settings"] })
  )
);
```

### Share cache across Node.js processes

```typescript
import { FileCacheStore } from "@gantryland/task-storage";

const store = new FileCacheStore("./.cache/tasks.json", { pretty: true });

// Combine with task-cache when creating TaskFns
```

### Custom serialization

```typescript
import { StorageCacheStore } from "@gantryland/task-storage";

const store = new StorageCacheStore(localStorage, {
  prefix: "app:",
  serialize: (entry) => JSON.stringify({ ...entry, v: 1 }),
  deserialize: (raw) => {
    const parsed = JSON.parse(raw);
    return parsed?.value ? parsed : undefined;
  },
});
```

### Use with task-cache and task-hooks

```tsx
import { Task } from "@gantryland/task";
import { cache } from "@gantryland/task-cache";
import { StorageCacheStore } from "@gantryland/task-storage";
import { pipe } from "@gantryland/task-combinators";
import { useTask, useTaskOnce } from "@gantryland/task-hooks";

const store = new StorageCacheStore(localStorage, { prefix: "app:" });

const [task, state] = useTask(
  () =>
    new Task(
      pipe(
        (signal) => fetch("/api/projects", { signal }).then((r) => r.json()),
        cache("projects", store, { ttl: 60_000 })
      )
    ),
  { mode: "factory" }
);

useTaskOnce(task);
```

### Log cache events

```typescript
import { StorageCacheStore } from "@gantryland/task-storage";
import { logCache } from "@gantryland/task-logger";

const store = new StorageCacheStore(localStorage, { prefix: "app:" });
const unsubscribe = logCache(store, { label: "storage" });

// Later
unsubscribe();
```

## Notes

- `StorageCacheStore` serializes entries with JSON by default.
- `FileCacheStore` uses synchronous file I/O; intended for Node.js.
- Use `@gantryland/task-cache` combinators (`cache`, `staleWhileRevalidate`) with these stores.

## Related packages

- [@gantryland/task-cache](../task-cache/) - Cache combinators and stores
- [@gantryland/task](../task/) - Core Task abstraction
- [@gantryland/task-combinators](../task-combinators/) - Composable TaskFn operators
- [@gantryland/task-hooks](../task-hooks/) - React bindings
- [@gantryland/task-logger](../task-logger/) - Logging utilities

## Tests

```bash
npm test
npx vitest packages/task-storage/test
```
