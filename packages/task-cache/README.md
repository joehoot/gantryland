# Task Cache

Cache primitives and combinators for Task. Designed to compose with
`@gantryland/task` and `@gantryland/task-combinators`.

Works in browser and Node.js with no dependencies.

## Quick start

```typescript
import { MemoryCacheStore, cache, staleWhileRevalidate } from "@gantryland/task-cache";
import { Task } from "@gantryland/task";
import { pipe } from "@gantryland/task-combinators";

const store = new MemoryCacheStore();

const task = new Task(
  pipe(
    () => fetch("/api/users").then((r) => r.json()),
    cache("users", store, { ttl: 60_000 })
  )
);

await task.run(); // fetches
await task.run(); // cache hit

const swrTask = new Task(
  pipe(
    () => fetch("/api/users").then((r) => r.json()),
    staleWhileRevalidate("users", store, { ttl: 30_000, staleTtl: 60_000 })
  )
);
```

## API

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

### MemoryCacheStore

In-memory store with tag invalidation and event emission.

```typescript
const store = new MemoryCacheStore();
store.invalidateTags(["users"]);
store.subscribe((event) => console.log(event.type));
```

Events include: `hit`, `miss`, `stale`, `set`, `invalidate`, `clear`, `revalidate`.

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

Return stale data if within the stale window and refresh in the background.

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

## Notes

- `cache` is strict: expired entries are re-fetched.
- `staleWhileRevalidate` returns stale data during the stale window and refreshes in the background.
- In-flight dedupe is enabled by default (`dedupe: false` to opt out).
- Tag invalidation requires a store that supports `invalidateTags` (MemoryCacheStore does).

## See also

- [task-storage](../task-storage/) - Persistent CacheStore implementations
