# @gantryland/task-cache

Cache primitives and combinators for `@gantryland/task`. Compose caching into TaskFn pipelines with minimal surface area and predictable behavior.

## Highlights

- Works with any TaskFn, no framework coupling.
- Built-in in-memory store with tag invalidation and events.
- Stale-while-revalidate and dedupe support out of the box.
- Works in browser and Node.js with no dependencies.

## At a glance

```typescript
import { Task } from "@gantryland/task";
import { MemoryCacheStore, cache } from "@gantryland/task-cache";
import { pipe } from "@gantryland/task-combinators";

const store = new MemoryCacheStore();

const task = new Task(
  pipe(
    (signal) => fetch("/api/users", { signal }).then((r) => r.json()),
    cache("users", store, { ttl: 60_000 })
  )
);

await task.run();
```

## Installation

```bash
npm install @gantryland/task-cache
```

## Contents

- [Highlights](#highlights)
- [At a glance](#at-a-glance)
- [Quick start](#quick-start)
- [Design goals](#design-goals)
- [When to use task-cache](#when-to-use-task-cache)
- [When not to use task-cache](#when-not-to-use-task-cache)
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
import { MemoryCacheStore, cache } from "@gantryland/task-cache";
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
```

This example shows `cache` reuse for fresh data.

## Design goals

- Make caching explicit and composable at the TaskFn level.
- Keep stores minimal so you can swap implementations.
- Provide deterministic cache semantics and clear invalidation paths.

## When to use task-cache

- You want reuse across TaskFn calls with TTLs.
- You need stale-while-revalidate behavior.
- You want tag-based invalidation or cache events.

## When not to use task-cache

- You need a full data layer with automatic normalization.
- You cannot tolerate stale reads of any kind.

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

### CacheEvent

Stores can emit events to power analytics, logging, or invalidation tracing.

Event types: `hit`, `miss`, `stale`, `set`, `invalidate`, `clear`, `revalidate`.

### CacheKey

Cache keys can be strings, numbers, or symbols. Use `cacheKey` for consistent keys across call sites.

## Flow

```text
cache(): fresh -> return
cache(): stale/miss -> fetch -> store -> return

staleWhileRevalidate(): fresh -> return
staleWhileRevalidate(): stale -> return stale -> revalidate in background
staleWhileRevalidate(): miss -> fetch -> store -> return
```

## Run semantics

### cache

- Fresh hit returns cached data and emits `hit`.
- Miss or stale fetches, stores on resolve, and emits `miss` or `stale` then `set`.
- Dedupe is on by default; concurrent calls for the same key share one promise.
- If the task rejects (including AbortError), the cache is not updated.

### staleWhileRevalidate

- Fresh hit returns cached data and emits `hit`.
- Stale within the window returns cached data, emits `stale` then `revalidate`, and revalidates in the background.
- Background revalidation does not use the caller's AbortSignal and errors are ignored.
- Miss or beyond the stale window fetches and stores on resolve.

### invalidateOnResolve

- Invalidates keys or tags only after the task resolves.
- If the task rejects (including AbortError), no invalidation happens.

## API

### API at a glance

| Member | Purpose | Returns |
| --- | --- | --- |
| **Stores** |  |  |
| [`MemoryCacheStore`](#memorycachestore) | In-memory store with tags and events | `MemoryCacheStore` |
| **Combinators** |  |  |
| [`cache`](#cache) | Cache with TTL and dedupe | `(taskFn) => TaskFn` |
| [`staleWhileRevalidate`](#stalewhilerevalidate) | Serve stale and refresh in background | `(taskFn) => TaskFn` |
| [`invalidateOnResolve`](#invalidateonresolve) | Invalidate after TaskFn resolves | `(taskFn) => TaskFn` |
| **Helpers** |  |  |
| [`cacheKey`](#cachekey) | Build consistent cache keys | `string` |

### MemoryCacheStore

In-memory CacheStore with tag invalidation and event emission.

```typescript
const store = new MemoryCacheStore();
```

#### store.get

```typescript
store.get<T>(key: CacheKey): CacheEntry<T> | undefined
```

Read an entry by key.

#### store.set

```typescript
store.set<T>(key: CacheKey, entry: CacheEntry<T>): void
```

Write an entry by key and emit a `set` event.

#### store.delete

```typescript
store.delete(key: CacheKey): void
```

Delete an entry by key and emit an `invalidate` event.

#### store.clear

```typescript
store.clear(): void
```

Clear all entries and emit a `clear` event.

#### store.has

```typescript
store.has(key: CacheKey): boolean
```

Check whether a key exists.

#### store.keys

```typescript
store.keys(): Iterable<CacheKey>
```

Return all keys.

#### store.subscribe

```typescript
store.subscribe(listener: (event: CacheEvent) => void): () => void
```

Listen to cache events. Returns an unsubscribe function.

#### store.emit

```typescript
store.emit(event: CacheEvent): void
```

Emit a cache event to subscribers.

#### store.invalidateTags

```typescript
store.invalidateTags(tags: string[]): void
```

Invalidate all entries matching any tag.

### cache

Return cached data if fresh; otherwise fetch and cache. Dedupe is enabled by default.

```typescript
cache("users", store, { ttl: 60_000, tags: ["users"], dedupe: true })
```

#### CacheOptions

```typescript
type CacheOptions = {
  ttl?: number
  staleTtl?: number
  tags?: string[]
  dedupe?: boolean
}
```

### staleWhileRevalidate

Return stale data (if within the stale window) and refresh in the background.

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

## Common patterns

Use these patterns for most usage.

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
cache("users", store, { ttl: 10_000, dedupe: true });
cache("users", store, { ttl: 10_000, dedupe: false });
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

## Integrations

Compose with other Gantryland utilities. This section shows common pairings.

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
