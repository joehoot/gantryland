# Task Cache

Cache combinator for Task. Skip fetches when data is fresh.

Works in browser and Node.js with no dependencies.

## Quick start

```typescript
import { CacheStore, cached } from "@gantryland/task-cache";
import { Task } from "@gantryland/task";
import { pipe } from "@gantryland/task-combinators";

const cache = new CacheStore();

const task = new Task(
  pipe(
    () => fetch("/api/users").then((r) => r.json()),
    cached("users", cache, 60_000) // skip fetch if cached within 1 min
  )
);

await task.run(); // fetches
await task.run(); // cache hit, no fetch

cache.invalidate("users");
await task.run(); // fetches again
```

## API

### CacheStore

```typescript
const cache = new CacheStore();

cache.get<T>(key, maxAge?): T | undefined
cache.set(key, data): void
cache.has(key, maxAge?): boolean
cache.invalidate(key?): void  // no key = clear all
```

### cached combinator

```typescript
cached<T>(key: string, store: CacheStore, maxAge?: number)
```

Wraps a TaskFn. Returns cached data if fresh, otherwise fetches and caches.

## Patterns

### Shared cache across tasks

```typescript
import { pipe, map } from "@gantryland/task-combinators";

const cache = new CacheStore();

const usersTask = new Task(pipe(fetchUsers, cached("users", cache)));
const activeUsersTask = new Task(
  pipe(fetchUsers, cached("users", cache), map(u => u.filter(x => x.active)))
);
// Both hit the same cache entry
```

### Invalidate on mutation

```typescript
async function deleteUser(id: string) {
  await api.deleteUser(id);
  cache.invalidate("users");
  await usersTask.run();
}
```

### TTL-based freshness

```typescript
// Cache for 5 minutes
cached("users", cache, 5 * 60 * 1000)

// Cache forever (until manual invalidation)
cached("users", cache)
```
