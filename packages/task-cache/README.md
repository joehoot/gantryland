# @gantryland/task-cache

Task-function cache wrappers with TTL, stale-while-revalidate, and in-flight dedupe.

## Installation

```bash
npm install @gantryland/task @gantryland/task-cache
```

## Quick Start

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

## Exports

- `MemoryCacheStore`
- `cache`
- `staleWhileRevalidate`
- `CacheKey`
- `CacheEntry`
- `CacheStore`
- `CacheOptions`
- `StaleWhileRevalidateOptions`

## API Reference

### `MemoryCacheStore`

Provides an in-memory `CacheStore` implementation backed by `Map`.

| Method | Signature | Description |
| --- | --- | --- |
| `get` | `<T>(key: CacheKey) => CacheEntry<T> \| undefined` | Returns cached entry for `key`, if present. |
| `set` | `<T>(key: CacheKey, entry: CacheEntry<T>) => void` | Stores or replaces entry for `key`. |
| `delete` | `(key: CacheKey) => void` | Removes entry for `key`. |

### `cache`

```typescript
cache<T, Args extends unknown[] = []>(
  key: CacheKey,
  store: CacheStore,
  options?: CacheOptions,
): (taskFn: (...args: Args) => Promise<T>) => (...args: Args) => Promise<T>
```

Returns a wrapper that serves fresh cache hits and resolves source on miss or stale entry.

### `staleWhileRevalidate`

```typescript
staleWhileRevalidate<T, Args extends unknown[] = []>(
  key: CacheKey,
  store: CacheStore,
  options: StaleWhileRevalidateOptions,
): (taskFn: (...args: Args) => Promise<T>) => (...args: Args) => Promise<T>
```

Returns a wrapper that can return stale values within `staleTtl` while refreshing in background.

### Types

```typescript
type CacheKey = string | number | symbol;

type CacheEntry<T> = {
  value: T;
  updatedAt: number;
};

type CacheStore = {
  get<T>(key: CacheKey): CacheEntry<T> | undefined;
  set<T>(key: CacheKey, entry: CacheEntry<T>): void;
  delete(key: CacheKey): void;
};

type CacheOptions = {
  ttl?: number;
  dedupe?: boolean;
};

type StaleWhileRevalidateOptions = CacheOptions & {
  ttl: number;
  staleTtl?: number;
};
```

## Practical Use Cases

### Example: TTL Cache for List Endpoints

```typescript
const store = new MemoryCacheStore();

const listUsers = cache("users:list", store, { ttl: 30_000 })(() =>
  fetch("/api/users").then((r) => r.json()),
);
```

### Example: Stale-While-Revalidate for Dashboards

```typescript
const getStats = staleWhileRevalidate("stats", store, {
  ttl: 10_000,
  staleTtl: 50_000,
})(() => fetch("/api/stats").then((r) => r.json()));
```

### Example: Disable Dedupe for Independent Refreshes

```typescript
const getFeed = cache("feed", store, { ttl: 5_000, dedupe: false })(() =>
  fetch("/api/feed").then((r) => r.json()),
);
```

## Runtime Semantics

- `cache` returns cached value when entry is fresh; otherwise it executes and stores on success.
- `staleWhileRevalidate` requires `ttl` as a non-negative finite number.
- Fresh SWR hit returns immediately without background work.
- Stale-window SWR hit returns stale value and triggers background revalidation.
- Background revalidation errors are ignored for the caller path.
- `dedupe` defaults to `true` so same key and in-flight requests share one promise.
