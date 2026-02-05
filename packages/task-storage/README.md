# Task Storage

Persistent cache stores that implement `CacheStore` from `@gantryland/task-cache`.

Works in browser and Node.js with no dependencies.

## Quick start (browser)

```typescript
import { cache } from "@gantryland/task-cache";
import { StorageCacheStore } from "@gantryland/task-storage";
import { Task } from "@gantryland/task";
import { pipe } from "@gantryland/task-combinators";

const store = new StorageCacheStore(window.localStorage, { prefix: "app:" });

const task = new Task(
  pipe(
    () => fetch("/api/users").then((r) => r.json()),
    cache("users", store, { ttl: 60_000 })
  )
);
```

## Quick start (Node.js)

```typescript
import { FileCacheStore } from "@gantryland/task-storage";

const store = new FileCacheStore("./.cache/tasks.json", { pretty: true });
```

## API

### StorageCacheStore

Persistent cache backed by a `Storage`-like interface (localStorage/sessionStorage).

```typescript
new StorageCacheStore(storage, {
  prefix?: string,
  serialize?: (entry) => string,
  deserialize?: (raw) => CacheEntry | undefined
})
```

### FileCacheStore (Node.js only)

Cache persisted to a JSON file on disk.

```typescript
new FileCacheStore(filePath, { pretty?: boolean })
```

### StorageLike

Minimal interface for a storage backend.

```typescript
type StorageLike = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
  key(index: number): string | null
  readonly length: number
}
```

## Notes

- `StorageCacheStore` serializes entries with JSON by default.
- `FileCacheStore` uses synchronous file I/O; intended for Node.js.
- Use `@gantryland/task-cache` combinators (`cache`, `staleWhileRevalidate`) with these stores.
