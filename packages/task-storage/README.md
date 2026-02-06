# @gantryland/task-storage

Persistent cache stores that implement `CacheStore` from `@gantryland/task-cache`. Use these to keep cache entries across browser sessions or on-disk Node.js processes.

- Storage-backed cache for browser environments.
- File-backed cache for Node.js processes.
- Tag invalidation and cache events supported.
- Custom serialization for storage formats.
- Works with task-cache combinators.

## Installation

```bash
npm install @gantryland/task-storage
```

## Contents

- [Quick start](#quick-start)
- [At a glance](#at-a-glance)
- [Design goals](#design-goals)
- [When to use task-storage](#when-to-use-task-storage)
- [When not to use task-storage](#when-not-to-use-task-storage)
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

await task.run();
```

## At a glance

```typescript
import { StorageCacheStore, FileCacheStore } from "@gantryland/task-storage";

const browserStore = new StorageCacheStore(localStorage, { prefix: "app:" });
const fileStore = new FileCacheStore("./.cache/tasks.json", { pretty: true });
```

## Design goals

- Provide drop-in persistent CacheStore implementations.
- Keep storage formats simple and inspectable.
- Remain compatible with task-cache combinators.

## When to use task-storage

- You want cache persistence across browser sessions.
- You need a shared on-disk cache in Node.js.
- You want CacheStore events and tag invalidation.

## When not to use task-storage

- You need distributed caching across machines.
- You need async streaming or very large payloads.

## Core concepts

### StorageCacheStore

Wraps a `Storage`-like interface (localStorage/sessionStorage). Entries are serialized to strings by default and keyed with a prefix. Invalid or unreadable entries are removed when read.

### FileCacheStore

Persists a cache map to disk as JSON using synchronous I/O. Invalid JSON clears the in-memory store.

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

## Flow

```text
TaskFn -> cache(...) -> StorageCacheStore
TaskFn -> cache(...) -> FileCacheStore
```

## API

### API at a glance

| Member | Purpose | Returns |
| --- | --- | --- |
| **Stores** |  |  |
| [`StorageCacheStore`](#storagecachestore) | Storage-backed cache store | `StorageCacheStore` |
| [`FileCacheStore`](#filecachestore) | File-backed cache store | `FileCacheStore` |
| **Interfaces** |  |  |
| [`StorageLike`](#storagelike) | Storage interface | `type` |

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

### Guarantees

- StorageCacheStore scopes keys by prefix.
- StorageCacheStore removes invalid entries when read.
- FileCacheStore persists on every write.
- Both stores emit cache events when entries change.
- Listener errors are caught and logged.

### Gotchas

- FileCacheStore uses synchronous file I/O.
- StorageCacheStore serializes values to JSON by default.

## Common patterns

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

## Integrations

### Use with task-cache and task-hooks

```tsx
import { Task } from "@gantryland/task";
import { cache } from "@gantryland/task-cache";
import { StorageCacheStore } from "@gantryland/task-storage";
import { pipe } from "@gantryland/task-combinators";
import { useTask, useTaskOnce } from "@gantryland/task-hooks";

const store = new StorageCacheStore(localStorage, { prefix: "app:" });

const [task] = useTask(
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

unsubscribe();
```

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
