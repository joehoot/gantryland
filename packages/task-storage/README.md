# @gantryland/task-storage

Persistent `CacheStore` implementations for `@gantryland/task-cache`.

Use this package when in-memory cache is not enough and you need cache entries to survive browser reloads or Node.js restarts.

## Installation

```bash
npm install @gantryland/task-storage
```

## Quick start

```typescript
import { Task } from "@gantryland/task";
import { cache } from "@gantryland/task-cache";
import { StorageCacheStore } from "@gantryland/task-storage";
import { pipe } from "@gantryland/task-combinators";

type Settings = { theme: string };

const store = new StorageCacheStore(localStorage, { prefix: "app:" });

const settingsTask = new Task<Settings>(
  pipe(
    (signal) => fetch("/api/settings", { signal }).then((r) => r.json()),
    cache("settings", store, { ttl: 300_000, tags: ["settings"] })
  )
);

await settingsTask.run();
```

## Stores

### `StorageCacheStore`

`Storage`-backed store (`localStorage`/`sessionStorage` or compatible).

- Prefix-scoped keys (default prefix: `task-cache:`)
- JSON serialization
- Invalid/unreadable entries are removed on read
- Supports cache events and tag invalidation

Constructor:

```typescript
new StorageCacheStore(storage, {
  prefix?: string,
})
```

### `FileCacheStore` (Node.js)

File-backed JSON store persisted with synchronous I/O.

- Loads cache file into memory on construction
- Persists on every `set`/`delete`/`clear`
- Creates parent directories as needed
- Supports cache events and tag invalidation

Constructor:

```typescript
new FileCacheStore(filePath)
```

## API

Both stores implement `CacheStore` methods used by `@gantryland/task-cache`:

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

Storage-compatible interface expected by `StorageCacheStore`:

```typescript
type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  key(index: number): string | null;
  readonly length: number;
};
```

## Semantics

- `StorageCacheStore` scopes all keys by prefix and removes invalid entries on read.
- `FileCacheStore` loads from disk on construction and persists synchronously on write/delete/clear.
- Both stores support cache events and tag invalidation.
- Listener errors are isolated and logged.

## Patterns

### 1) Persist browser cache with localStorage

```typescript
import { StorageCacheStore } from "@gantryland/task-storage";

const store = new StorageCacheStore(localStorage, { prefix: "gantry:" });
```

### 2) Persist Node.js cache to disk

```typescript
import { FileCacheStore } from "@gantryland/task-storage";

const store = new FileCacheStore("./.cache/task-cache.json");
```

## Operational notes

- `FileCacheStore` uses synchronous file I/O; use with awareness in latency-sensitive paths.
- Storage quota limits still apply for `StorageCacheStore` backends.

## Related packages

- [@gantryland/task-cache](../task-cache/) - Cache combinators and in-memory store
- [@gantryland/task](../task/) - Task execution and state primitive
- [@gantryland/task-combinators](../task-combinators/) - TaskFn composition and control-flow operators
- [@gantryland/task-logger](../task-logger/) - Task and cache logging helpers

## Test this package

```bash
npx vitest packages/task-storage/test
```
