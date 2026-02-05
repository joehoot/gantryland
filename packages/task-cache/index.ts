import type { TaskFn } from "@gantryland/task";

/**
 * Simple key-value cache with optional TTL support.
 *
 * Stores data with timestamps for time-based expiration. Use with the
 * `cached` combinator to memoize TaskFn results.
 *
 * @example
 * ```typescript
 * const cache = new CacheStore();
 *
 * cache.set('users', [{ id: 1, name: 'Alice' }]);
 * cache.get('users'); // [{ id: 1, name: 'Alice' }]
 * cache.get('users', 60_000); // same, if within 1 minute
 *
 * cache.invalidate('users'); // remove one
 * cache.invalidate(); // clear all
 * ```
 */
export class CacheStore {
  private store = new Map<string, { data: unknown; time: number }>();

  /**
   * Retrieves cached data by key. Returns undefined if not found or expired.
   *
   * @template T - The expected type of the cached data
   * @param key - The cache key
   * @param maxAge - Optional TTL in milliseconds. If provided and the entry
   *                 is older than maxAge, it is deleted and undefined is returned.
   * @returns The cached data or undefined
   *
   * @example
   * ```typescript
   * cache.get<User[]>('users'); // cached forever
   * cache.get<User[]>('users', 60_000); // only if cached within 1 min
   * ```
   */
  get<T>(key: string, maxAge?: number): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (maxAge !== undefined && Date.now() - entry.time > maxAge) {
      this.store.delete(key);
      return undefined;
    }
    return entry.data as T;
  }

  /**
   * Retrieves cached data without TTL eviction.
   *
   * @template T - The expected type of the cached data
   * @param key - The cache key
   * @returns The cached data or undefined
   */
  peek<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    return entry ? (entry.data as T) : undefined;
  }

  /**
   * Stores data with the current timestamp.
   *
   * @param key - The cache key
   * @param data - The data to cache
   *
   * @example
   * ```typescript
   * cache.set('users', users);
   * ```
   */
  set(key: string, data: unknown): void {
    this.store.set(key, { data, time: Date.now() });
  }

  /**
   * Checks if a key exists and is not expired.
   *
   * @param key - The cache key
   * @param maxAge - Optional TTL in milliseconds
   * @returns True if the key exists and is fresh
   *
   * @example
   * ```typescript
   * if (!cache.has('users', 60_000)) {
   *   await fetchUsers();
   * }
   * ```
   */
  has(key: string, maxAge?: number): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (maxAge !== undefined && Date.now() - entry.time > maxAge) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Invalidates cached data. Pass a key to remove one entry, or no
   * arguments to clear the entire cache.
   *
   * @param key - Optional key to invalidate. If omitted, clears all.
   *
   * @example
   * ```typescript
   * cache.invalidate('users'); // remove one
   * cache.invalidate(); // clear all
   * ```
   */
  invalidate(key?: string): void {
    if (key) {
      this.store.delete(key);
    } else {
      this.store.clear();
    }
  }

  /**
   * Alias for invalidate(key).
   *
   * @param key - The cache key to delete
   */
  delete(key: string): void {
    this.invalidate(key);
  }
}

const pendingByStore = new WeakMap<CacheStore, Map<string, Promise<unknown>>>();

/**
 * Cache combinator for TaskFn. Returns cached data if fresh, otherwise
 * executes the TaskFn and caches the result.
 *
 * @template T - The type of the resolved data
 * @param key - The cache key
 * @param store - The CacheStore instance
 * @param maxAge - Optional TTL in milliseconds. If omitted, cached forever
 *                 (until manual invalidation).
 * @returns A combinator that wraps a TaskFn with caching
 *
 * @example
 * ```typescript
 * import { pipe } from '../task-combinators';
 * import { Task } from '../task';
 *
 * const cache = new CacheStore();
 *
 * const task = new Task(
 *   pipe(
 *     (signal) => fetch('/api/users', { signal }).then(r => r.json()),
 *     cached('users', cache, 60_000) // cache for 1 minute
 *   )
 * );
 *
 * await task.run(); // fetches
 * await task.run(); // cache hit, no fetch
 *
 * cache.invalidate('users');
 * await task.run(); // fetches again
 * ```
 */
export const cached =
  <T>(key: string, store: CacheStore, maxAge?: number) =>
  (taskFn: TaskFn<T>): TaskFn<T> =>
  async (signal?: AbortSignal) => {
    if (store.has(key, maxAge)) return store.get<T>(key, maxAge) as T;

    const storePending = pendingByStore.get(store) ?? new Map();
    pendingByStore.set(store, storePending);
    const pending = storePending.get(key) as Promise<T> | undefined;
    if (pending) return pending;

    const promise = taskFn(signal)
      .then((result) => {
        store.set(key, result);
        return result;
      })
      .finally(() => {
        storePending.delete(key);
      });

    storePending.set(key, promise);
    return promise;
  };
