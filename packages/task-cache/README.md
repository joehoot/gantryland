# @gantryland/task-cache

Cache primitives and combinators for `@gantryland/task`.

Use this package when you want explicit caching at the `TaskFn` layer: predictable TTL behavior, optional stale-while-revalidate, and clear invalidation.

## Installation

```bash
npm install @gantryland/task-cache
```

## Quick start

```typescript
import { Task } from "@gantryland/task";
import { MemoryCacheStore, cache } from "@gantryland/task-cache";
import { pipe } from "@gantryland/task-combinators";

type User = { id: string; name: string };

const store = new MemoryCacheStore();

const usersTask = new Task<User[]>(
  pipe(
    (signal) => fetch("/api/users", { signal }).then((r) => r.json()),
    cache("users", store, { ttl: 60_000, tags: ["users"] })
  )
);

await usersTask.run(); // miss -> fetch -> set
await usersTask.run(); // hit
```

## When to use

- You want cache behavior close to task execution, not hidden in global framework config.
- You need per-key TTL, dedupe, and tag/key invalidation.
- You want a simple in-memory default store that can be replaced.

## When not to use

- You need a full normalized client cache/data framework.
- You cannot tolerate stale reads at all.

## Core types

```typescript
type CacheKey = string | number | symbol;

type CacheEntry<T> = {
  value: T;
  createdAt: number;
  updatedAt: number;
  tags?: string[];
};

type CacheOptions = {
  ttl?: number;
  staleTtl?: number;
  tags?: string[];
  dedupe?: boolean;
};
```

`createdAt` and `updatedAt` are epoch milliseconds.

## Semantics

- `cache(...)`
  - Fresh entry returns immediately.
  - Miss/stale executes source task and stores on success.
  - Rejections (including `AbortError`) do not update cache.
- `staleWhileRevalidate(...)`
  - Fresh entry returns immediately.
  - Stale-within-window returns stale value and triggers background revalidation.
  - Background revalidation errors are ignored and emitted as `revalidateError`.
- Dedupe is enabled by default (`dedupe !== false`).
  - Concurrent calls for the same key share one in-flight promise.
  - In deduped mode, only the first caller signal is used for that shared request.
- `invalidateOnResolve(...)`
  - Invalidates keys/tags only after successful resolution.
  - Failures do not invalidate.

## API

| Export | Purpose | Return |
| --- | --- | --- |
| `new MemoryCacheStore()` | In-memory cache store with tag invalidation and events | `MemoryCacheStore` |
| `cache(key, store, options?)` | TTL cache combinator | `(taskFn) => TaskFn` |
| `staleWhileRevalidate(key, store, options?)` | Serve stale, refresh in background | `(taskFn) => TaskFn` |
| `invalidateOnResolve(target, store)` | Invalidate keys/tags after success | `(taskFn) => TaskFn` |
| `cacheKey(...parts)` | Build stable string keys | `string` |

### MemoryCacheStore methods

```typescript
store.get(key)
store.set(key, entry)
store.delete(key)
store.clear()
store.has(key)
store.keys()
store.subscribe((event) => {})
store.emit(event)
store.invalidateTags(tags)
```

## Patterns

### 1) Stale-while-revalidate for fast UI

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

### 2) Invalidate tagged entries after write

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

await listTask.run();
await createTask.run();
```

### 3) Observe cache events

```typescript
import { MemoryCacheStore } from "@gantryland/task-cache";

const store = new MemoryCacheStore();

const unsubscribe = store.subscribe((event) => {
  console.log(event.type, event.key);
});

unsubscribe();
```

## Related packages

- [@gantryland/task](../task/) - Task execution and state primitive
- [@gantryland/task-combinators](../task-combinators/) - TaskFn composition and control-flow operators
- [@gantryland/task-storage](../task-storage/) - Persistent CacheStore implementations
- [@gantryland/task-logger](../task-logger/) - Task and cache logging helpers

## Test this package

```bash
npx vitest packages/task-cache/test
```
