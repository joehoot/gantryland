# @gantryland/task-cache

Cache primitives and combinators for `@gantryland/task`.

This package provides explicit cache behavior at the task-function layer: TTL,
stale-while-revalidate, dedupe, and invalidation.

## Installation

```bash
npm install @gantryland/task @gantryland/task-combinators @gantryland/task-cache
```

## Quick start

```typescript
import { Task } from "@gantryland/task";
import { MemoryCacheStore, cache } from "@gantryland/task-cache";
import { pipe } from "@gantryland/task-combinators";

const store = new MemoryCacheStore();

const usersTask = new Task(
  pipe(
    () => fetch("/api/users").then((r) => r.json()),
    cache("users", store, { ttl: 60_000, tags: ["users"] }),
  ),
);

await usersTask.run();
await usersTask.run();
```

## API

| Export | Signature | Notes |
| --- | --- | --- |
| `MemoryCacheStore` | `new MemoryCacheStore()` | in-memory store with eventing and tag index |
| `cache` | `cache(key, store, options?)` | fresh-hit cache wrapper |
| `staleWhileRevalidate` | `staleWhileRevalidate(key, store, options?)` | return stale value and revalidate in background |
| `invalidateOnResolve` | `invalidateOnResolve(target, store)` | invalidate only after success |
| `CacheKey` | `string \| number \| symbol` | supported keys |
| `CacheEntry<T>` | `{ value, createdAt, updatedAt, tags? }` | cached value with metadata |
| `CacheEvent` | `{ type, key?, entry?, error? }` | emitted store/cache lifecycle event |
| `CacheStore` | cache store interface | minimum methods: `get`, `set`, `delete`, `clear`, `has` |
| `CacheOptions` | `{ ttl?, staleTtl?, tags?, dedupe? }` | cache wrapper options |

`invalidateOnResolve(target, store)` accepts:

- `CacheKey`
- `CacheKey[]`
- `{ tags: string[] }`
- `(result) => CacheKey | CacheKey[] | { tags: string[] }`

## MemoryCacheStore methods

| Method | Purpose |
| --- | --- |
| `get<T>(key)` | read entry |
| `set<T>(key, entry)` | write/replace entry and update tag index |
| `delete(key)` | remove entry and emit `invalidate` |
| `clear()` | clear all entries and emit `clear` |
| `has(key)` | check key presence |
| `keys()` | iterate keys |
| `subscribe(listener)` | observe cache events |
| `emit(event)` | manually emit event |
| `invalidateTags(tags)` | invalidate entries by tag |

## Semantics

- `cache(...)`
  - fresh hit returns cached value immediately
  - stale/miss runs source and writes on success
  - source rejection does not write cache
- `staleWhileRevalidate(...)`
  - fresh hit returns immediately
  - stale-window hit returns stale value, then revalidates in background
  - background failure emits `revalidateError` and is ignored for caller path
- `dedupe` defaults to `true`
  - same key + in-flight call share one promise
- `invalidateOnResolve(...)` only runs invalidation on success

## Test this package

```bash
npx vitest packages/task-cache/test
```
