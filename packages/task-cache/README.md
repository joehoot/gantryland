# @gantryland/task-cache

Cache primitives and combinators for `@gantryland/task`.

This package provides explicit cache behavior at the task-function layer: TTL, stale-while-revalidate, dedupe, and invalidation.

## Installation

```bash
npm install @gantryland/task-cache
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

- `MemoryCacheStore`
- `cache(key, store, options?)`
- `staleWhileRevalidate(key, store, options?)`
- `invalidateOnResolve(target, store)`
- types: `CacheKey`, `CacheEntry`, `CacheEvent`, `CacheStore`, `CacheOptions`

## Semantics

- `cache(...)`
  - fresh entry: immediate return
  - stale/miss: execute source and write on success
  - rejection: no cache write
- `staleWhileRevalidate(...)`
  - fresh entry: immediate return
  - stale in window: return stale value and revalidate in background
  - background errors emit `revalidateError` and are ignored
- dedupe is on by default; concurrent callers share one in-flight promise per key
- `invalidateOnResolve(...)` runs only after successful resolution

## Test this package

```bash
npx vitest packages/task-cache/test
```
