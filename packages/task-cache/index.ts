import type { TaskFn } from "@gantryland/task";

/**
 * Supported cache key types.
 */
export type CacheKey = string | number | symbol;

/**
 * Cache entry payload with metadata.
 */
export type CacheEntry<T> = {
  value: T;
  createdAt: number;
  updatedAt: number;
  tags?: string[];
};

/**
 * Cache event names emitted by stores.
 */
export type CacheEventType =
  | "hit"
  | "miss"
  | "stale"
  | "set"
  | "invalidate"
  | "clear"
  | "revalidate";

/**
 * Cache event payload.
 */
export type CacheEvent = {
  type: CacheEventType;
  key?: CacheKey;
  entry?: CacheEntry<unknown>;
};

/**
 * Minimal cache store interface.
 */
export type CacheStore = {
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

/**
 * In-memory CacheStore with tag support.
 */
export class MemoryCacheStore implements CacheStore {
  private store = new Map<CacheKey, CacheEntry<unknown>>();
  private tagIndex = new Map<string, Set<CacheKey>>();
  private listeners = new Set<(event: CacheEvent) => void>();

  /**
   * Get a cache entry by key.
   */
  get<T>(key: CacheKey): CacheEntry<T> | undefined {
    return this.store.get(key) as CacheEntry<T> | undefined;
  }

  /**
   * Set a cache entry by key.
   */
  set<T>(key: CacheKey, entry: CacheEntry<T>): void {
    const existing = this.store.get(key);
    if (existing?.tags) this.removeTags(key, existing.tags);
    if (entry.tags) this.addTags(key, entry.tags);
    this.store.set(key, entry);
    this.emit({ type: "set", key, entry });
  }

  /**
   * Delete a cache entry by key.
   */
  delete(key: CacheKey): void {
    const existing = this.store.get(key);
    if (existing?.tags) this.removeTags(key, existing.tags);
    this.store.delete(key);
    this.emit({ type: "invalidate", key, entry: existing });
  }

  /**
   * Clear all entries.
   */
  clear(): void {
    this.store.clear();
    this.tagIndex.clear();
    this.emit({ type: "clear" });
  }

  /**
   * Check whether a key exists.
   */
  has(key: CacheKey): boolean {
    return this.store.has(key);
  }

  /**
   * List all keys.
   */
  keys(): Iterable<CacheKey> {
    return this.store.keys();
  }

  /**
   * Subscribe to cache events.
   */
  subscribe(listener: (event: CacheEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Emit a cache event to listeners.
   */
  emit(event: CacheEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error("Cache listener error", error);
      }
    }
  }

  /**
   * Invalidate entries matching any tag.
   */
  invalidateTags(tags: string[]): void {
    for (const tag of tags) {
      const keys = this.tagIndex.get(tag);
      if (!keys) continue;
      for (const key of keys) this.delete(key);
      this.tagIndex.delete(tag);
    }
  }

  private addTags(key: CacheKey, tags: string[]): void {
    for (const tag of tags) {
      const set = this.tagIndex.get(tag) ?? new Set<CacheKey>();
      set.add(key);
      this.tagIndex.set(tag, set);
    }
  }

  private removeTags(key: CacheKey, tags: string[]): void {
    for (const tag of tags) {
      const set = this.tagIndex.get(tag);
      if (!set) continue;
      set.delete(key);
      if (set.size === 0) this.tagIndex.delete(tag);
    }
  }
}

/**
 * Options for cache and stale-while-revalidate.
 */
export type CacheOptions = {
  /**
   * Time-to-live in milliseconds. When undefined, entries are always fresh.
   */
  ttl?: number;
  /**
   * Additional stale window in milliseconds after ttl expires.
   */
  staleTtl?: number;
  /**
   * Tags to associate with stored entries for invalidation.
   */
  tags?: string[];
  /**
   * Dedupe in-flight requests for the same key. Defaults to true.
   */
  dedupe?: boolean;
};

type PendingMap = Map<CacheKey, Promise<unknown>>;
const pendingByStore = new WeakMap<CacheStore, PendingMap>();

const getPendingMap = (store: CacheStore): PendingMap => {
  const existing = pendingByStore.get(store);
  if (existing) return existing;
  const map: PendingMap = new Map();
  pendingByStore.set(store, map);
  return map;
};

const isFresh = (entry: CacheEntry<unknown>, ttl?: number): boolean => {
  if (ttl === undefined) return true;
  return Date.now() - entry.updatedAt <= ttl;
};

const isWithinStale = (
  entry: CacheEntry<unknown>,
  ttl?: number,
  staleTtl?: number
): boolean => {
  if (ttl === undefined) return false;
  const age = Date.now() - entry.updatedAt;
  return age > ttl && age <= ttl + (staleTtl ?? 0);
};


const setEntry = <T>(
  store: CacheStore,
  key: CacheKey,
  value: T,
  tags?: string[],
  previous?: CacheEntry<T>
): CacheEntry<T> => {
  const now = Date.now();
  const entry: CacheEntry<T> = {
    value,
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
    tags,
  };
  store.set(key, entry);
  return entry;
};

const resolveWithDedupe = async <T, Args extends unknown[] = []>(
  key: CacheKey,
  store: CacheStore,
  taskFn: TaskFn<T, Args>,
  signal: AbortSignal | undefined,
  args: Args,
  options: CacheOptions = {},
  previous?: CacheEntry<T>
): Promise<T> => {
  const dedupe = options.dedupe !== false;
  const pending = dedupe ? getPendingMap(store) : undefined;
  if (pending) {
    const inFlight = pending.get(key) as Promise<T> | undefined;
    if (inFlight) return inFlight;
  }

  const promise = taskFn(signal, ...args)
    .then((value) => {
      setEntry(store, key, value, options.tags, previous);
      return value;
    })
    .finally(() => {
      pending?.delete(key);
    });

  pending?.set(key, promise);
  return promise;
};

/**
 * Cache combinator. Returns cached data if fresh, otherwise fetches and caches.
 *
 * - Resolves to cached data on hit.
 * - Fetches on miss or stale and stores the resolved value.
 * - Dedupe is enabled by default; concurrent calls share the same promise.
 * - If the task rejects (including AbortError), the cache is not updated.
 */
export const cache =
  <T, Args extends unknown[] = []>(key: CacheKey, store: CacheStore, options: CacheOptions = {}) =>
  (taskFn: TaskFn<T, Args>): TaskFn<T, Args> =>
  async (signal?: AbortSignal, ...args: Args) => {
    const entry = store.get<T>(key);
    if (entry && isFresh(entry, options.ttl)) {
      store.emit?.({ type: "hit", key, entry });
      return entry.value;
    }

    store.emit?.({ type: entry ? "stale" : "miss", key, entry });
    return resolveWithDedupe(key, store, taskFn, signal, args, options, entry);
  };

/**
 * Stale-while-revalidate combinator. Returns cached data immediately if stale
 * within the stale window, and revalidates in the background.
 *
 * - Fresh entries are returned immediately.
 * - Stale entries within the stale window return cached data and revalidate.
 * - Background revalidation does not use the caller's AbortSignal.
 * - Background errors are ignored and do not update the cache.
 */
export const staleWhileRevalidate =
  <T, Args extends unknown[] = []>(key: CacheKey, store: CacheStore, options: CacheOptions = {}) =>
  (taskFn: TaskFn<T, Args>): TaskFn<T, Args> =>
  async (signal?: AbortSignal, ...args: Args) => {
    const entry = store.get<T>(key);
    if (entry && isFresh(entry, options.ttl)) {
      store.emit?.({ type: "hit", key, entry });
      return entry.value;
    }

    if (entry && isWithinStale(entry, options.ttl, options.staleTtl)) {
      store.emit?.({ type: "stale", key, entry });
      store.emit?.({ type: "revalidate", key, entry });
      void resolveWithDedupe(key, store, taskFn, undefined, args, options, entry).catch(() => {
        // Background revalidation errors are ignored.
      });
      return entry.value;
    }

    store.emit?.({ type: "miss", key, entry });
    return resolveWithDedupe(key, store, taskFn, signal, args, options, entry);
  };

/**
 * Target(s) to invalidate after a task resolves.
 */
export type InvalidateTarget<T> =
  | CacheKey
  | CacheKey[]
  | { tags: string[] }
  | ((result: T) => CacheKey | CacheKey[] | { tags: string[] });

/**
 * Invalidates cache entries after a TaskFn resolves.
 *
 * If the task rejects (including AbortError), no invalidation happens.
 */
export const invalidateOnResolve =
  <T, Args extends unknown[] = []>(target: InvalidateTarget<T>, store: CacheStore) =>
  (taskFn: TaskFn<T, Args>): TaskFn<T, Args> =>
  async (signal?: AbortSignal, ...args: Args) => {
    const result = await taskFn(signal, ...args);
    const resolved = typeof target === "function" ? target(result) : target;
    if (typeof resolved === "object" && !Array.isArray(resolved) && "tags" in resolved) {
      store.invalidateTags?.(resolved.tags);
      return result;
    }
    const keys = Array.isArray(resolved) ? resolved : [resolved];
    for (const key of keys) store.delete(key);
    return result;
  };

/**
 * Helper for consistent cache keys.
 */
export const cacheKey = (
  ...parts: Array<string | number | boolean | null | undefined>
): string => parts.map((part) => String(part)).join(":");
