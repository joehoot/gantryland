// API baseline for @gantryland/task-cache
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
    type: "hit" | "miss" | "stale" | "set" | "invalidate" | "clear" | "revalidate" | "revalidateError";
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
export declare class MemoryCacheStore implements CacheStore {
    private store;
    private tagIndex;
    private listeners;
    /**
     * Get a cache entry by key.
     *
     * @template T - Cached value type
     * @param key - Cache key
     * @returns The cache entry, or undefined when missing
     */
    get<T>(key: CacheKey): CacheEntry<T> | undefined;
    /**
     * Set a cache entry by key.
     *
     * Replaces any existing entry and updates tag indices.
     *
     * @template T - Cached value type
     * @param key - Cache key
     * @param entry - Entry to store
     */
    set<T>(key: CacheKey, entry: CacheEntry<T>): void;
    /**
     * Delete a cache entry by key.
     *
     * Emits an `invalidate` event with the previous entry when present.
     *
     * @param key - Cache key
     */
    delete(key: CacheKey): void;
    /**
     * Clear all entries.
     *
     * @returns Returns nothing.
     */
    clear(): void;
    /**
     * Check whether a key exists.
     *
     * @param key - Cache key
     * @returns True when the key exists
     */
    has(key: CacheKey): boolean;
    /**
     * List all keys.
     *
     * @returns Iterable of cache keys
     */
    keys(): Iterable<CacheKey>;
    /**
     * Subscribe to cache events.
     *
     * @param listener - Event listener
     * @returns Unsubscribe function
     */
    subscribe(listener: (event: CacheEvent) => void): () => void;
    /**
     * Emit a cache event to listeners.
     *
     * Listener errors are caught and logged to `console.error`.
     *
     * @param event - Cache event payload
     */
    emit(event: CacheEvent): void;
    /**
     * Invalidate entries matching any tag.
     *
     * @param tags - Tags to invalidate
     */
    invalidateTags(tags: string[]): void;
    private addTags;
    private removeTags;
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
/**
 * Cache TaskFn results by key and store.
 *
 * Returns cached data when fresh; otherwise runs the TaskFn and stores the result.
 * If the TaskFn rejects, the cache is not updated.
 * Dedupe is enabled by default; deduped callers share the same in-flight promise.
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
 *   () => fetch("/api/users").then((r) => r.json()),
 *   cache("users", store, { ttl: 10_000 })
 * );
 * const users = await taskFn();
 * ```
 */
export declare const cache: <T, Args extends unknown[] = []>(key: CacheKey, store: CacheStore, options?: CacheOptions) => (taskFn: TaskFn<T, Args>) => TaskFn<T, Args>;
/**
 * Return cached data and refresh in the background when stale.
 *
 * Returns cached data when fresh, or when within the stale window.
 * If the TaskFn rejects, the cache is not updated.
 * Dedupe is enabled by default; deduped callers share the same in-flight promise.
 * Background revalidation runs independently of the active caller.
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
 *   () => fetch("/api/feed").then((r) => r.json()),
 *   staleWhileRevalidate("feed", store, { ttl: 5_000, staleTtl: 30_000 })
 * );
 * const feed = await taskFn();
 * ```
 */
export declare const staleWhileRevalidate: <T, Args extends unknown[] = []>(key: CacheKey, store: CacheStore, options?: CacheOptions) => (taskFn: TaskFn<T, Args>) => TaskFn<T, Args>;
/**
 * Invalidate cache entries after a TaskFn resolves.
 *
 * Supports keys, key arrays, tags, or a resolver function.
 * If the TaskFn rejects, no invalidation happens.
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
 *   () => fetch("/api/posts", { method: "POST" }).then((r) => r.json()),
 *   invalidateOnResolve({ tags: ["posts"] }, store)
 * );
 * await taskFn();
 * ```
 */
export declare const invalidateOnResolve: <T, Args extends unknown[] = []>(target: CacheKey | CacheKey[] | {
    tags: string[];
} | ((result: T) => CacheKey | CacheKey[] | {
    tags: string[];
}), store: CacheStore) => (taskFn: TaskFn<T, Args>) => TaskFn<T, Args>;
//# sourceMappingURL=index.d.ts.map