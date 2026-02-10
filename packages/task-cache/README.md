# @gantryland/task-cache

Cache primitives and combinators for `@gantryland/task`.

This package provides explicit cache behavior at the task-function layer: TTL,
stale-while-revalidate, and dedupe.

## Installation

```bash
npm install @gantryland/task @gantryland/task-cache
```

## Quick start

```typescript
import { Task } from "@gantryland/task";
import { MemoryCacheStore, cache } from "@gantryland/task-cache";

const store = new MemoryCacheStore();
const usersTaskFn = cache("users", store, { ttl: 60_000 })(
  () => fetch("/api/users").then((r) => r.json()),
);

const usersTask = new Task(usersTaskFn);

await usersTask.run();
await usersTask.run();
```

## API

| Export | Signature | Notes |
| --- | --- | --- |
| `MemoryCacheStore` | `new MemoryCacheStore()` | in-memory store |
| `cache` | `cache(key, store, options?)` | fresh-hit cache wrapper |
| `staleWhileRevalidate` | `staleWhileRevalidate(key, store, options?)` | return stale value and revalidate in background |
| `CacheKey` | `string \| number \| symbol` | supported keys |
| `CacheEntry<T>` | `{ value, createdAt, updatedAt }` | cached value with metadata |
| `CacheStore` | cache store interface | minimum methods: `get`, `set`, `delete` |
| `CacheOptions` | `{ ttl?, staleTtl?, dedupe? }` | cache wrapper options |

## MemoryCacheStore methods

| Method | Purpose |
| --- | --- |
| `get<T>(key)` | read entry |
| `set<T>(key, entry)` | write/replace entry |
| `delete(key)` | remove entry |

## Semantics

- `cache(...)`
  - fresh hit returns cached value immediately
  - stale/miss runs source and writes on success
  - source rejection does not write cache
- `staleWhileRevalidate(...)`
  - fresh hit returns immediately
  - stale-window hit returns stale value, then revalidates in background
  - background failure is ignored for caller path
- `dedupe` defaults to `true`
  - same key + in-flight call share one promise

## Test this package

```bash
npx vitest packages/task-cache/test
```
