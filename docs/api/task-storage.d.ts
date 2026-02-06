// API baseline for @gantryland/task-storage
import type { CacheEntry, CacheEvent, CacheKey, CacheStore } from "@gantryland/task-cache";
/**
 * Storage-like interface (localStorage/sessionStorage-compatible).
 */
export type StorageLike = {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
    key(index: number): string | null;
    readonly length: number;
};
/**
 * Options for StorageCacheStore.
 */
export type StorageCacheStoreOptions = {
    /**
     * Key prefix used to scope stored entries.
     */
    prefix?: string;
};
/**
 * CacheStore backed by a Storage-like interface.
 * Keys are stringified and prefixed before storage.
 */
export declare class StorageCacheStore implements CacheStore {
    private storage;
    private prefix;
    private listeners;
    /**
     * Create a StorageCacheStore.
     *
     * @param storage - Backing Storage-like implementation.
     * @param options - Prefix options.
     */
    constructor(storage: StorageLike, options?: StorageCacheStoreOptions);
    /**
     * Get a cache entry by key.
     * Invalid or unreadable entries are removed and return undefined.
     *
     * @template T - Cached value type.
     * @param key - Cache key.
     * @returns The cache entry or undefined when missing or invalid.
     */
    get<T>(key: CacheKey): CacheEntry<T> | undefined;
    /**
     * Set a cache entry by key.
     *
     * @template T - Cached value type.
     * @param key - Cache key.
     * @param entry - Cache entry to store.
     */
    set<T>(key: CacheKey, entry: CacheEntry<T>): void;
    /**
     * Delete a cache entry by key.
     *
     * @param key - Cache key.
     */
    delete(key: CacheKey): void;
    /**
     * Clear all entries for the configured prefix.
     */
    clear(): void;
    /**
     * Check if a key exists.
     *
     * @param key - Cache key.
     * @returns True when a raw entry exists in storage.
     */
    has(key: CacheKey): boolean;
    /**
     * List keys for the configured prefix.
     *
     * @returns Iterable of cache keys.
     */
    keys(): Iterable<CacheKey>;
    /**
     * Subscribe to cache events.
     * Listener errors are caught and logged.
     *
     * @param listener - Event callback.
     * @returns Unsubscribe function.
     */
    subscribe(listener: (event: CacheEvent) => void): () => void;
    /**
     * Emit a cache event to subscribers.
     * Listener errors are caught and logged.
     *
     * @param event - Cache event payload.
     */
    emit(event: CacheEvent): void;
    /**
     * Invalidate entries matching any of the provided tags.
     *
     * @param tags - Tags to match against stored entries.
     */
    invalidateTags(tags: string[]): void;
    /**
     * Build a storage key with prefix.
     */
    private keyFor;
    /**
     * Read and deserialize an entry.
     */
    private readEntry;
    /**
     * Remove the configured prefix from a key.
     */
    private stripPrefix;
    /**
     * List raw storage keys that match the prefix.
     */
    private listKeys;
}
/**
 * CacheStore persisted to a JSON file (Node.js only).
 * The file stores a plain JSON object keyed by the stringified cache key.
 */
export declare class FileCacheStore implements CacheStore {
    private filePath;
    private store;
    private listeners;
    /**
     * Create a FileCacheStore.
     *
     * @param filePath - JSON file path for persistence.
     */
    constructor(filePath: string);
    /**
     * Get a cache entry by key.
     *
     * @template T - Cached value type.
     * @param key - Cache key.
     * @returns The cache entry or undefined when missing.
     */
    get<T>(key: CacheKey): CacheEntry<T> | undefined;
    /**
     * Set a cache entry by key.
     *
     * @template T - Cached value type.
     * @param key - Cache key.
     * @param entry - Cache entry to store.
     */
    set<T>(key: CacheKey, entry: CacheEntry<T>): void;
    /**
     * Delete a cache entry by key.
     *
     * @param key - Cache key.
     */
    delete(key: CacheKey): void;
    /**
     * Clear all entries.
     */
    clear(): void;
    /**
     * Check if a key exists.
     *
     * @param key - Cache key.
     * @returns True when an entry exists in memory.
     */
    has(key: CacheKey): boolean;
    /**
     * List all keys.
     *
     * @returns Iterable of cache keys.
     */
    keys(): Iterable<CacheKey>;
    /**
     * Subscribe to cache events.
     * Listener errors are caught and logged.
     *
     * @param listener - Event callback.
     * @returns Unsubscribe function.
     */
    subscribe(listener: (event: CacheEvent) => void): () => void;
    /**
     * Emit a cache event to subscribers.
     * Listener errors are caught and logged.
     *
     * @param event - Cache event payload.
     */
    emit(event: CacheEvent): void;
    /**
     * Invalidate entries matching any of the provided tags.
     *
     * @param tags - Tags to match against stored entries.
     */
    invalidateTags(tags: string[]): void;
    /**
     * Load the cache file into memory.
     * Invalid JSON clears the in-memory store.
     */
    private load;
    /**
     * Persist the in-memory cache to disk.
     */
    private persist;
}
//# sourceMappingURL=index.d.ts.map