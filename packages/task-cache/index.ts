import type { TaskFn } from "@gantryland/task";

/** Supported cache key types. */
export type CacheKey = string | number | symbol;

/**
 * Cache entry payload with metadata.
 *
 * Timestamps use epoch milliseconds.
 *
 * @template T - Cached value type
 *
 * @property value - Cached value
 * @property createdAt - Epoch timestamp of initial write
 * @property updatedAt - Epoch timestamp of last update
 * @property tags - Optional tags for invalidation
 */
export type CacheEntry<T> = {
  value: T;
  createdAt: number;
  updatedAt: number;
  tags?: string[];
};

/**
 * Cache event payload.
 *
 * `error` is set for `revalidateError` events.
 *
 * @property type - Event type
 * @property key - Cache key involved in the event
 * @property entry - Cache entry involved in the event
 * @property error - Error for `revalidateError` events
 */
export type CacheEvent = {
  type:
    | "hit"
    | "miss"
    | "stale"
    | "set"
    | "invalidate"
    | "clear"
    | "revalidate"
    | "revalidateError";
  key?: CacheKey;
  entry?: CacheEntry<unknown>;
  error?: unknown;
};

/**
 * Minimal cache store interface.
 *
 * Optional methods enable eventing and tag invalidation.
 *
 * @property get - Return a cache entry by key
 * @property set - Store a cache entry by key
 * @property delete - Remove a cache entry by key
 * @property clear - Remove all cache entries
 * @property has - Check whether a key exists
 * @property keys - Return all cache keys
 * @property subscribe - Subscribe to cache events
 * @property emit - Emit a cache event to subscribers
 * @property invalidateTags - Remove entries matching tags
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
 *
 * Emits cache events on set, delete, clear, and tag invalidation.
 * Listener errors are caught and logged.
 *
 * @example
 * ```typescript
 * const store = new MemoryCacheStore();
 * store.set("user:1", { value: { id: 1 }, createdAt: Date.now(), updatedAt: Date.now() });
 * const entry = store.get<{ id: number }>("user:1");
 * ```
 */
export class MemoryCacheStore implements CacheStore {
  private store = new Map<CacheKey, CacheEntry<unknown>>();
  private tagIndex = new Map<string, Set<CacheKey>>();
  private listeners = new Set<(event: CacheEvent) => void>();

  /**
   * Get a cache entry by key.
   *
   * @template T - Cached value type
   * @param key - Cache key
   * @returns The cache entry, or undefined when missing
   */
  get<T>(key: CacheKey): CacheEntry<T> | undefined {
    return this.store.get(key) as CacheEntry<T> | undefined;
  }

  /**
   * Set a cache entry by key.
   *
   * Replaces any existing entry and updates tag indices.
   *
   * @template T - Cached value type
   * @param key - Cache key
   * @param entry - Entry to store
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
   *
   * Emits an `invalidate` event with the previous entry when present.
   *
   * @param key - Cache key
   */
  delete(key: CacheKey): void {
    const existing = this.store.get(key);
    if (existing?.tags) this.removeTags(key, existing.tags);
    this.store.delete(key);
    this.emit({ type: "invalidate", key, entry: existing });
  }

  /**
   * Clear all entries.
   *
   * @returns Returns nothing.
   */
  clear(): void {
    this.store.clear();
    this.tagIndex.clear();
    this.emit({ type: "clear" });
  }

  /**
   * Check whether a key exists.
   *
   * @param key - Cache key
   * @returns True when the key exists
   */
  has(key: CacheKey): boolean {
    return this.store.has(key);
  }

  /**
   * List all keys.
   *
   * @returns Iterable of cache keys
   */
  keys(): Iterable<CacheKey> {
    return this.store.keys();
  }

  /**
   * Subscribe to cache events.
   *
   * @param listener - Event listener
   * @returns Unsubscribe function
   */
  subscribe(listener: (event: CacheEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Emit a cache event to listeners.
   *
   * Listener errors are caught and logged to `console.error`.
   *
   * @param event - Cache event payload
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
   *
   * @param tags - Tags to invalidate
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
 *
 * @property ttl - Time-to-live in milliseconds (fresh window)
 * @property staleTtl - Additional stale window after ttl expires
 * @property tags - Tags to associate with stored entries
 * @property dedupe - Share in-flight requests for the same key
 */
export type CacheOptions = {
  /**
   * Time-to-live in milliseconds. When undefined, entries are always fresh.
   */
  ttl?: number;
  /**
   * Additional stale window after ttl expires.
   */
  staleTtl?: number;
  /**
   * Tags to associate with stored entries.
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
  staleTtl?: number,
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
  previous?: CacheEntry<T>,
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
  signal: AbortSignal | null,
  args: Args,
  options: CacheOptions = {},
  previous?: CacheEntry<T>,
  onError?: (error: unknown) => void,
): Promise<T> => {
  const dedupe = options.dedupe !== false;
  const pending = dedupe ? getPendingMap(store) : undefined;
  if (pending) {
    const inFlight = pending.get(key) as Promise<T> | undefined;
    if (inFlight) {
      if (onError) {
        inFlight.catch((error) => {
          onError(error);
        });
      }
      return inFlight;
    }
  }

  const promise = Promise.resolve()
    .then(() => taskFn(signal, ...args))
    .then((value) => {
      setEntry(store, key, value, options.tags, previous);
      return value;
    })
    .catch((error) => {
      onError?.(error);
      throw error;
    })
    .finally(() => {
      pending?.delete(key);
    });

  pending?.set(key, promise);
  return promise;
};

/**
 * Cache TaskFn results by key and store.
 *
 * Returns cached data when fresh; otherwise runs the TaskFn and stores the result.
 * If the TaskFn rejects (including AbortError), the cache is not updated.
 * Dedupe is enabled by default; when deduped, only the first caller's AbortSignal is used.
 * The returned TaskFn rejects when the underlying TaskFn rejects.
 *
 * @template T - Resolved data type
 * @template Args - TaskFn argument tuple
 * @param key - Cache key for the entry
 * @param store - CacheStore implementation
 * @param options - Cache behavior options
 * @returns A combinator that returns a TaskFn resolving to cached or fresh data
 *
 * @example
 * ```typescript
 * const store = new MemoryCacheStore();
 * const taskFn = pipe(
 *   (signal) => fetch("/api/users", { signal }).then((r) => r.json()),
 *   cache("users", store, { ttl: 10_000 })
 * );
 * const users = await taskFn(null);
 * ```
 */
export const cache =
  <T, Args extends unknown[] = []>(
    key: CacheKey,
    store: CacheStore,
    options: CacheOptions = {},
  ) =>
  (taskFn: TaskFn<T, Args>): TaskFn<T, Args> =>
  async (signal: AbortSignal | null, ...args: Args) => {
    const entry = store.get<T>(key);
    if (entry && isFresh(entry, options.ttl)) {
      store.emit?.({ type: "hit", key, entry });
      return entry.value;
    }

    store.emit?.({ type: entry ? "stale" : "miss", key, entry });
    return resolveWithDedupe(key, store, taskFn, signal, args, options, entry);
  };

/**
 * Return cached data and refresh in the background when stale.
 *
 * Returns cached data when fresh, or when within the stale window.
 * If the TaskFn rejects (including AbortError), the cache is not updated.
 * Dedupe is enabled by default; when deduped, only the first caller's AbortSignal is used.
 * Background revalidation does not use the caller's AbortSignal.
 * Background errors emit `revalidateError`, are ignored, and do not update the cache.
 * The returned TaskFn rejects when the underlying TaskFn rejects.
 *
 * @template T - Resolved data type
 * @template Args - TaskFn argument tuple
 * @param key - Cache key for the entry
 * @param store - CacheStore implementation
 * @param options - Cache behavior options
 * @returns A combinator that returns a TaskFn resolving to cached or fresh data
 *
 * @example
 * ```typescript
 * const store = new MemoryCacheStore();
 * const taskFn = pipe(
 *   (signal) => fetch("/api/feed", { signal }).then((r) => r.json()),
 *   staleWhileRevalidate("feed", store, { ttl: 5_000, staleTtl: 30_000 })
 * );
 * const feed = await taskFn(null);
 * ```
 */
export const staleWhileRevalidate =
  <T, Args extends unknown[] = []>(
    key: CacheKey,
    store: CacheStore,
    options: CacheOptions = {},
  ) =>
  (taskFn: TaskFn<T, Args>): TaskFn<T, Args> =>
  async (signal: AbortSignal | null, ...args: Args) => {
    const entry = store.get<T>(key);
    if (entry && isFresh(entry, options.ttl)) {
      store.emit?.({ type: "hit", key, entry });
      return entry.value;
    }

    if (entry && isWithinStale(entry, options.ttl, options.staleTtl)) {
      store.emit?.({ type: "stale", key, entry });
      store.emit?.({ type: "revalidate", key, entry });
      void resolveWithDedupe(
        key,
        store,
        taskFn,
        null,
        args,
        options,
        entry,
        (error) => {
          store.emit?.({ type: "revalidateError", key, entry, error });
        },
      ).catch(() => {
        // Background revalidation errors are ignored.
      });
      return entry.value;
    }

    store.emit?.({ type: "miss", key, entry });
    return resolveWithDedupe(key, store, taskFn, signal, args, options, entry);
  };

/**
 * Invalidate cache entries after a TaskFn resolves.
 *
 * Supports keys, key arrays, tags, or a resolver function.
 * If the TaskFn rejects (including AbortError), no invalidation happens.
 * The returned TaskFn rejects when the underlying TaskFn rejects.
 *
 * @template T - Resolved data type
 * @template Args - TaskFn argument tuple
 * @param target - Keys, tags, or resolver for invalidation
 * @param store - CacheStore implementation
 * @returns A combinator that returns a TaskFn resolving to the original result
 *
 * @example
 * ```typescript
 * const store = new MemoryCacheStore();
 * const taskFn = pipe(
 *   (signal) => fetch("/api/posts", { method: "POST", signal }).then((r) => r.json()),
 *   invalidateOnResolve({ tags: ["posts"] }, store)
 * );
 * await taskFn(null);
 * ```
 */
export const invalidateOnResolve =
  <T, Args extends unknown[] = []>(
    target:
      | CacheKey
      | CacheKey[]
      | { tags: string[] }
      | ((result: T) => CacheKey | CacheKey[] | { tags: string[] }),
    store: CacheStore,
  ) =>
  (taskFn: TaskFn<T, Args>): TaskFn<T, Args> =>
  async (signal: AbortSignal | null, ...args: Args) => {
    const result = await taskFn(signal, ...args);
    const resolved = typeof target === "function" ? target(result) : target;
    if (
      typeof resolved === "object" &&
      !Array.isArray(resolved) &&
      "tags" in resolved
    ) {
      store.invalidateTags?.(resolved.tags);
      return result;
    }
    const keys = Array.isArray(resolved) ? resolved : [resolved];
    for (const key of keys) store.delete(key);
    return result;
  };
