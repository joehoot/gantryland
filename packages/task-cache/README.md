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

`CacheEvent` shape:

```typescript
type CacheEvent = {
  type: "hit" | "miss" | "stale" | "set" | "invalidate" | "clear" | "revalidate" | "revalidateError";
  key?: CacheKey;
  entry?: CacheEntry<unknown>;
  error?: unknown;
};
```

`CacheStore` shape:

```typescript
type CacheStore = {
  get<T>(key: CacheKey): CacheEntry<T> | undefined;
  set<T>(key: CacheKey, entry: CacheEntry<T>): void;
  delete(key: CacheKey): void;
  clear(): void;
  has(key: CacheKey): boolean;
  keys?(): Iterable<CacheKey>;
  subscribe?(listener: (event: CacheEvent) => void): () => void;
  emit?(event: CacheEvent): void;
  invalidateTags?(tags: string[]): void;
};
```

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
- When using wrapped cache/combinator TaskFns with parameterized `Task.run(...args)`, prefer `new Task(fn, { mode: "signal" })`.
- `invalidateOnResolve(...)`
  - Invalidates keys/tags only after successful resolution.
  - Failures do not invalidate.

## Constructor mode with cache combinators

Cache combinators return signal-aware `TaskFn`s. For parameterized tasks, prefer explicit signal mode:

```typescript
import { Task } from "@gantryland/task";
import { MemoryCacheStore, cache } from "@gantryland/task-cache";
import { pipe } from "@gantryland/task-combinators";

const store = new MemoryCacheStore();

const fn = pipe(
  (signal: AbortSignal | null, id: string) => fetch(`/api/users/${id}`, { signal }).then((r) => r.json()),
  cache("user", store)
);

const task = new Task(fn, { mode: "signal" });
```

## API

| Export | Signature | Notes |
| --- | --- | --- |
| `MemoryCacheStore` | `new MemoryCacheStore()` | In-memory `CacheStore` with eventing and tag invalidation |
| `cache` | `cache(key, store, options?)` | TTL cache combinator |
| `staleWhileRevalidate` | `staleWhileRevalidate(key, store, options?)` | Return stale data while revalidating in background |
| `invalidateOnResolve` | `invalidateOnResolve(target, store)` | Invalidate keys/tags only after success |
| `CacheKey` | `string \| number \| symbol` | Supported key types |
| `CacheEntry<T>` | `{ value, createdAt, updatedAt, tags? }` | Stored value + metadata |
| `CacheEvent` | `{ type, key?, entry?, error? }` | Event payload for cache observability |
| `CacheStore` | cache store interface | Required methods: `get`, `set`, `delete`, `clear`, `has` |
| `CacheOptions` | `{ ttl?, staleTtl?, tags?, dedupe? }` | Shared options for `cache`/`staleWhileRevalidate` |

`invalidateOnResolve(target, store)` accepts:

- single key: `CacheKey`
- key list: `CacheKey[]`
- tags object: `{ tags: string[] }`
- resolver: `(result) => CacheKey | CacheKey[] | { tags: string[] }`

### MemoryCacheStore methods

| Method | Signature | Purpose |
| --- | --- | --- |
| `get` | `get<T>(key)` | Read entry by key |
| `set` | `set<T>(key, entry)` | Write/replace entry and update tag index |
| `delete` | `delete(key)` | Remove entry and emit `invalidate` |
| `clear` | `clear()` | Remove all entries and emit `clear` |
| `has` | `has(key)` | Check key existence |
| `keys` | `keys()` | Iterate all keys |
| `subscribe` | `subscribe((event) => void)` | Listen to cache events |
| `emit` | `emit(event)` | Emit event to subscribers |
| `invalidateTags` | `invalidateTags(tags)` | Invalidate all keys that match tags |

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

## Test this package

```bash
npx vitest packages/task-cache/test
```
