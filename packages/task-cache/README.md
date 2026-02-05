# @gantryland/task-cache

Cache primitives and combinators for `@gantryland/task`. Designed to compose with TaskFn pipelines and shared across the Task ecosystem.

Works in browser and Node.js with no dependencies.

## Installation

```bash
npm install @gantryland/task-cache
```

## Quick start

```typescript
import { Task } from "@gantryland/task";
import { MemoryCacheStore, cache, staleWhileRevalidate } from "@gantryland/task-cache";
import { pipe } from "@gantryland/task-combinators";

const store = new MemoryCacheStore();

const usersTask = new Task(
  pipe(
    (signal) => fetch("/api/users", { signal }).then((r) => r.json()),
    cache("users", store, { ttl: 60_000, tags: ["users"] })
  )
);

await usersTask.run(); // fetches and caches
await usersTask.run(); // cache hit

const swrTask = new Task(
  pipe(
    (signal) => fetch("/api/users", { signal }).then((r) => r.json()),
    staleWhileRevalidate("users", store, { ttl: 30_000, staleTtl: 60_000 })
  )
);
```

## Core concepts

### CacheStore

Minimal interface for cache backends.

```typescript
type CacheStore = {
  get<T>(key: CacheKey): CacheEntry<T> | undefined
  set<T>(key: CacheKey, entry: CacheEntry<T>): void
  delete(key: CacheKey): void
  clear(): void
  has(key: CacheKey): boolean
  keys?(): Iterable<CacheKey>
  subscribe?(listener: (event: CacheEvent) => void): () => void
  emit?(event: CacheEvent): void
  invalidateTags?(tags: string[]): void
}
```

### CacheEntry

```typescript
type CacheEntry<T> = {
  value: T
  createdAt: number
  updatedAt: number
  tags?: string[]
}
```

### Cache events

Stores can emit events to power analytics, logging, or invalidation tracing.

Event types: `hit`, `miss`, `stale`, `set`, `invalidate`, `clear`, `revalidate`.

## API

### MemoryCacheStore

In-memory store with tag invalidation and event emission.

```typescript
import { MemoryCacheStore } from "@gantryland/task-cache";

const store = new MemoryCacheStore();
store.subscribe((event) => console.log(event.type, event.key));
store.invalidateTags(["users"]);
```

### cache

Return cached data if fresh, otherwise fetch and cache.

```typescript
cache("users", store, { ttl: 60_000, tags: ["users"] })
```

Options:

```typescript
type CacheOptions = {
  ttl?: number
  staleTtl?: number
  tags?: string[]
  dedupe?: boolean
}
```

### staleWhileRevalidate

Return stale data (if within stale window) and refresh in the background.

```typescript
staleWhileRevalidate("users", store, { ttl: 30_000, staleTtl: 60_000 })
```

### invalidateOnResolve

Invalidate keys or tags after a TaskFn resolves.

```typescript
invalidateOnResolve("users", store)
invalidateOnResolve({ tags: ["users"] }, store)
invalidateOnResolve((result) => ["users", `user:${result.id}`], store)
```

### cacheKey

Helper for consistent cache keys.

```typescript
cacheKey("user", userId)
```

## Practical examples

### Cache with Task and pipe

```typescript
import { Task } from "@gantryland/task";
import { MemoryCacheStore, cache } from "@gantryland/task-cache";
import { pipe } from "@gantryland/task-combinators";

const store = new MemoryCacheStore();

const task = new Task(
  pipe(
    (signal) => fetch("/api/projects", { signal }).then((r) => r.json()),
    cache("projects", store, { ttl: 15_000 })
  )
);

await task.run();
```

### Stale-while-revalidate for fast UI

```typescript
import { Task } from "@gantryland/task";
import { MemoryCacheStore, staleWhileRevalidate } from "@gantryland/task-cache";
import { pipe } from "@gantryland/task-combinators";

const store = new MemoryCacheStore();

const feedTask = new Task(
  pipe(
    (signal) => fetch("/api/feed", { signal }).then((r) => r.json()),
    staleWhileRevalidate("feed", store, { ttl: 10_000, staleTtl: 30_000 })
  )
);

await feedTask.run();
```

### Tag-based invalidation

```typescript
import { Task } from "@gantryland/task";
import { MemoryCacheStore, cache, invalidateOnResolve } from "@gantryland/task-cache";
import { pipe } from "@gantryland/task-combinators";

const store = new MemoryCacheStore();

const listTask = new Task(
  pipe(
    (signal) => fetch("/api/posts", { signal }).then((r) => r.json()),
    cache("posts", store, { ttl: 30_000, tags: ["posts"] })
  )
);

const createTask = new Task(
  pipe(
    (signal) => fetch("/api/posts", { method: "POST", signal }).then((r) => r.json()),
    invalidateOnResolve({ tags: ["posts"] }, store)
  )
);
```

### In-flight dedupe

```typescript
import { cache } from "@gantryland/task-cache";

cache("users", store, { ttl: 10_000, dedupe: true });
cache("users", store, { ttl: 10_000, dedupe: false });
```

### Persist cache with task-storage

```typescript
import { Task } from "@gantryland/task";
import { cache } from "@gantryland/task-cache";
import { StorageCacheStore } from "@gantryland/task-storage";
import { pipe } from "@gantryland/task-combinators";

const store = new StorageCacheStore(localStorage, { prefix: "gantry:" });

const task = new Task(
  pipe(
    (signal) => fetch("/api/settings", { signal }).then((r) => r.json()),
    cache("settings", store, { ttl: 60_000 })
  )
);
```

### Observe cache events

```typescript
const store = new MemoryCacheStore();

const unsub = store.subscribe((event) => {
  console.log(event.type, event.key, event.entry?.updatedAt);
});

// Later
unsub();
```

## Notes

- `cache` is strict: expired entries are re-fetched.
- `staleWhileRevalidate` returns stale data during the stale window and refreshes in the background.
- In-flight dedupe is enabled by default (`dedupe: false` to opt out).
- Tag invalidation requires a store that supports `invalidateTags` (MemoryCacheStore and StorageCacheStore do).

## Related packages

- [@gantryland/task](../task/) - Core Task abstraction
- [@gantryland/task-combinators](../task-combinators/) - Composable TaskFn operators
- [@gantryland/task-storage](../task-storage/) - Persistent CacheStore implementations
- [@gantryland/task-hooks](../task-hooks/) - React bindings
- [@gantryland/task-logger](../task-logger/) - Logging utilities

## Tests

```bash
npm test
npx vitest packages/task-cache/test
```
