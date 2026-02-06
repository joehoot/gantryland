import type {
  CacheEntry,
  CacheEvent,
  CacheKey,
  CacheStore,
} from "@gantryland/task-cache";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

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

const defaultDeserialize = (raw: string): CacheEntry<unknown> | undefined => {
  const parsed = JSON.parse(raw) as CacheEntry<unknown>;
  if (!parsed || typeof parsed !== "object") return undefined;
  if (!("value" in parsed)) return undefined;
  return parsed;
};

const asStringKey = (key: CacheKey): string => String(key);

/**
 * CacheStore backed by a Storage-like interface.
 * Keys are stringified and prefixed before storage.
 */
export class StorageCacheStore implements CacheStore {
  private storage: StorageLike;
  private prefix: string;
  private listeners = new Set<(event: CacheEvent) => void>();

  /**
   * Create a StorageCacheStore.
   *
   * @param storage - Backing Storage-like implementation.
   * @param options - Prefix options.
   */
  constructor(storage: StorageLike, options: StorageCacheStoreOptions = {}) {
    this.storage = storage;
    this.prefix = options.prefix ?? "task-cache:";
  }

  /**
   * Get a cache entry by key.
   * Invalid or unreadable entries are removed and return undefined.
   *
   * @template T - Cached value type.
   * @param key - Cache key.
   * @returns The cache entry or undefined when missing or invalid.
   */
  get<T>(key: CacheKey): CacheEntry<T> | undefined {
    const entry = this.readEntry(key);
    if (!entry) {
      this.storage.removeItem(this.keyFor(key));
      return undefined;
    }
    return entry as CacheEntry<T>;
  }

  /**
   * Set a cache entry by key.
   *
   * @template T - Cached value type.
   * @param key - Cache key.
   * @param entry - Cache entry to store.
   */
  set<T>(key: CacheKey, entry: CacheEntry<T>): void {
    this.storage.setItem(this.keyFor(key), JSON.stringify(entry));
    this.emit({ type: "set", key, entry });
  }

  /**
   * Delete a cache entry by key.
   *
   * @param key - Cache key.
   */
  delete(key: CacheKey): void {
    const existing = this.readEntry(key);
    this.storage.removeItem(this.keyFor(key));
    this.emit({ type: "invalidate", key, entry: existing });
  }

  /**
   * Clear all entries for the configured prefix.
   */
  clear(): void {
    for (const key of this.listKeys()) this.storage.removeItem(key);
    this.emit({ type: "clear" });
  }

  /**
   * Check if a key exists.
   *
   * @param key - Cache key.
   * @returns True when a raw entry exists in storage.
   */
  has(key: CacheKey): boolean {
    return this.storage.getItem(this.keyFor(key)) !== null;
  }

  /**
   * List keys for the configured prefix.
   *
   * @returns Iterable of cache keys.
   */
  keys(): Iterable<CacheKey> {
    return this.listKeys().map((key) => this.stripPrefix(key));
  }

  /**
   * Subscribe to cache events.
   * Listener errors are caught and logged.
   *
   * @param listener - Event callback.
   * @returns Unsubscribe function.
   */
  subscribe(listener: (event: CacheEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Emit a cache event to subscribers.
   * Listener errors are caught and logged.
   *
   * @param event - Cache event payload.
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
   * Invalidate entries matching any of the provided tags.
   *
   * @param tags - Tags to match against stored entries.
   */
  invalidateTags(tags: string[]): void {
    const keys = [...this.keys()];
    for (const key of keys) {
      const entry = this.get(key);
      if (!entry?.tags) continue;
      if (tags.some((tag) => entry.tags?.includes(tag))) this.delete(key);
    }
  }

  /**
   * Build a storage key with prefix.
   */
  private keyFor(key: CacheKey): string {
    return `${this.prefix}${asStringKey(key)}`;
  }

  /**
   * Read and deserialize an entry.
   */
  private readEntry(key: CacheKey): CacheEntry<unknown> | undefined {
    const raw = this.storage.getItem(this.keyFor(key));
    if (!raw) return undefined;
    try {
      return defaultDeserialize(raw);
    } catch {
      return undefined;
    }
  }

  /**
   * Remove the configured prefix from a key.
   */
  private stripPrefix(key: string): string {
    return key.slice(this.prefix.length);
  }

  /**
   * List raw storage keys that match the prefix.
   */
  private listKeys(): string[] {
    const keys: string[] = [];
    for (let i = 0; i < this.storage.length; i += 1) {
      const key = this.storage.key(i);
      if (key?.startsWith(this.prefix)) keys.push(key);
    }
    return keys;
  }
}

/**
 * CacheStore persisted to a JSON file (Node.js only).
 * The file stores a plain JSON object keyed by the stringified cache key.
 */
export class FileCacheStore implements CacheStore {
  private filePath: string;
  private store = new Map<string, CacheEntry<unknown>>();
  private listeners = new Set<(event: CacheEvent) => void>();

  /**
   * Create a FileCacheStore.
   *
   * @param filePath - JSON file path for persistence.
   */
  constructor(filePath: string) {
    this.filePath = filePath;
    this.load();
  }

  /**
   * Get a cache entry by key.
   *
   * @template T - Cached value type.
   * @param key - Cache key.
   * @returns The cache entry or undefined when missing.
   */
  get<T>(key: CacheKey): CacheEntry<T> | undefined {
    return this.store.get(asStringKey(key)) as CacheEntry<T> | undefined;
  }

  /**
   * Set a cache entry by key.
   *
   * @template T - Cached value type.
   * @param key - Cache key.
   * @param entry - Cache entry to store.
   */
  set<T>(key: CacheKey, entry: CacheEntry<T>): void {
    this.store.set(asStringKey(key), entry);
    this.persist();
    this.emit({ type: "set", key, entry });
  }

  /**
   * Delete a cache entry by key.
   *
   * @param key - Cache key.
   */
  delete(key: CacheKey): void {
    const stringKey = asStringKey(key);
    const existing = this.store.get(stringKey);
    this.store.delete(stringKey);
    this.persist();
    this.emit({ type: "invalidate", key, entry: existing });
  }

  /**
   * Clear all entries.
   */
  clear(): void {
    this.store.clear();
    this.persist();
    this.emit({ type: "clear" });
  }

  /**
   * Check if a key exists.
   *
   * @param key - Cache key.
   * @returns True when an entry exists in memory.
   */
  has(key: CacheKey): boolean {
    return this.store.has(asStringKey(key));
  }

  /**
   * List all keys.
   *
   * @returns Iterable of cache keys.
   */
  keys(): Iterable<CacheKey> {
    return this.store.keys();
  }

  /**
   * Subscribe to cache events.
   * Listener errors are caught and logged.
   *
   * @param listener - Event callback.
   * @returns Unsubscribe function.
   */
  subscribe(listener: (event: CacheEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Emit a cache event to subscribers.
   * Listener errors are caught and logged.
   *
   * @param event - Cache event payload.
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
   * Invalidate entries matching any of the provided tags.
   *
   * @param tags - Tags to match against stored entries.
   */
  invalidateTags(tags: string[]): void {
    const keys = [...this.store.keys()];
    for (const key of keys) {
      const entry = this.store.get(key);
      if (!entry?.tags) continue;
      if (tags.some((tag) => entry.tags?.includes(tag))) this.delete(key);
    }
  }

  /**
   * Load the cache file into memory.
   * Invalid JSON clears the in-memory store.
   */
  private load(): void {
    if (!existsSync(this.filePath)) return;
    try {
      const raw = readFileSync(this.filePath, "utf8");
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, CacheEntry<unknown>>;
      for (const [key, entry] of Object.entries(parsed)) {
        this.store.set(key, entry);
      }
    } catch {
      this.store.clear();
    }
  }

  /**
   * Persist the in-memory cache to disk.
   */
  private persist(): void {
    const data: Record<string, CacheEntry<unknown>> = {};
    for (const [key, entry] of this.store.entries()) {
      data[key] = entry;
    }
    const json = JSON.stringify(data);
    mkdirSync(dirname(this.filePath), { recursive: true });
    writeFileSync(this.filePath, json, "utf8");
  }
}
