import type { TaskFn } from "@gantryland/task";

export type CacheKey = string | number | symbol;

export type CacheEntry<T> = {
  value: T;
  createdAt: number;
  updatedAt: number;
  tags?: string[];
};

export type CacheEventType =
  | "hit"
  | "miss"
  | "stale"
  | "set"
  | "invalidate"
  | "clear"
  | "revalidate";

export type CacheEvent = {
  type: CacheEventType;
  key?: CacheKey;
  entry?: CacheEntry<unknown>;
};

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

export class MemoryCacheStore implements CacheStore {
  private store = new Map<CacheKey, CacheEntry<unknown>>();
  private tagIndex = new Map<string, Set<CacheKey>>();
  private listeners = new Set<(event: CacheEvent) => void>();

  get<T>(key: CacheKey): CacheEntry<T> | undefined {
    return this.store.get(key) as CacheEntry<T> | undefined;
  }

  set<T>(key: CacheKey, entry: CacheEntry<T>): void {
    const existing = this.store.get(key);
    if (existing?.tags) this.removeTags(key, existing.tags);
    if (entry.tags) this.addTags(key, entry.tags);
    this.store.set(key, entry);
    this.emit({ type: "set", key, entry });
  }

  delete(key: CacheKey): void {
    const existing = this.store.get(key);
    if (existing?.tags) this.removeTags(key, existing.tags);
    this.store.delete(key);
    this.emit({ type: "invalidate", key, entry: existing });
  }

  clear(): void {
    this.store.clear();
    this.tagIndex.clear();
    this.emit({ type: "clear" });
  }

  has(key: CacheKey): boolean {
    return this.store.has(key);
  }

  keys(): Iterable<CacheKey> {
    return this.store.keys();
  }

  subscribe(listener: (event: CacheEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(event: CacheEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error("Cache listener error", error);
      }
    }
  }

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

export type CacheOptions = {
  ttl?: number;
  staleTtl?: number;
  tags?: string[];
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

const resolveWithDedupe = async <T>(
  key: CacheKey,
  store: CacheStore,
  taskFn: TaskFn<T>,
  signal?: AbortSignal,
  options: CacheOptions = {},
  previous?: CacheEntry<T>
): Promise<T> => {
  const dedupe = options.dedupe !== false;
  const pending = dedupe ? getPendingMap(store) : undefined;
  if (pending) {
    const inFlight = pending.get(key) as Promise<T> | undefined;
    if (inFlight) return inFlight;
  }

  const promise = taskFn(signal)
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
 */
export const cache =
  <T>(key: CacheKey, store: CacheStore, options: CacheOptions = {}) =>
  (taskFn: TaskFn<T>): TaskFn<T> =>
  async (signal?: AbortSignal) => {
    const entry = store.get<T>(key);
    if (entry && isFresh(entry, options.ttl)) {
      store.emit?.({ type: "hit", key, entry });
      return entry.value;
    }

    store.emit?.({ type: entry ? "stale" : "miss", key, entry });
    return resolveWithDedupe(key, store, taskFn, signal, options, entry);
  };

/**
 * Stale-while-revalidate combinator. Returns cached data immediately if stale
 * within the stale window, and revalidates in the background.
 */
export const staleWhileRevalidate =
  <T>(key: CacheKey, store: CacheStore, options: CacheOptions = {}) =>
  (taskFn: TaskFn<T>): TaskFn<T> =>
  async (signal?: AbortSignal) => {
    const entry = store.get<T>(key);
    if (entry && isFresh(entry, options.ttl)) {
      store.emit?.({ type: "hit", key, entry });
      return entry.value;
    }

    if (entry && isWithinStale(entry, options.ttl, options.staleTtl)) {
      store.emit?.({ type: "stale", key, entry });
      store.emit?.({ type: "revalidate", key, entry });
      void resolveWithDedupe(key, store, taskFn, undefined, options, entry);
      return entry.value;
    }

    store.emit?.({ type: "miss", key, entry });
    return resolveWithDedupe(key, store, taskFn, signal, options, entry);
  };

export type InvalidateTarget<T> =
  | CacheKey
  | CacheKey[]
  | { tags: string[] }
  | ((result: T) => CacheKey | CacheKey[] | { tags: string[] });

/**
 * Invalidates cache entries after a TaskFn resolves.
 */
export const invalidateOnResolve =
  <T>(target: InvalidateTarget<T>, store: CacheStore) =>
  (taskFn: TaskFn<T>): TaskFn<T> =>
  async (signal?: AbortSignal) => {
    const result = await taskFn(signal);
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
