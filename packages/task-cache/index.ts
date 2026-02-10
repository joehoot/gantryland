import type { TaskFn, TaskOperator } from "@gantryland/task";

/** Cache key type used by cache stores and wrappers. */
export type CacheKey = string | number | symbol;

/** Stored cache value with last update timestamp. */
export type CacheEntry<T> = {
  value: T;
  updatedAt: number;
};

/** Minimal cache store contract used by this package. */
export type CacheStore = {
  get<T>(key: CacheKey): CacheEntry<T> | undefined;
  set<T>(key: CacheKey, entry: CacheEntry<T>): void;
  delete(key: CacheKey): void;
};

/** In-memory `CacheStore` backed by `Map`. */
export class MemoryCacheStore implements CacheStore {
  private store = new Map<CacheKey, CacheEntry<unknown>>();

  get<T>(key: CacheKey): CacheEntry<T> | undefined {
    return this.store.get(key) as CacheEntry<T> | undefined;
  }

  set<T>(key: CacheKey, entry: CacheEntry<T>): void {
    this.store.set(key, entry);
  }

  delete(key: CacheKey): void {
    this.store.delete(key);
  }
}

export type CacheOptions = {
  ttl?: number;
  dedupe?: boolean;
};

/** Options for stale-while-revalidate behavior. */
export type StaleWhileRevalidateOptions = CacheOptions & {
  ttl: number;
  staleTtl?: number;
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

const toValidTtl = (ttl: unknown): number => {
  if (typeof ttl !== "number" || !Number.isFinite(ttl) || ttl < 0) {
    throw new Error("staleWhileRevalidate requires a non-negative finite ttl");
  }
  return ttl;
};

const isWithinStale = (
  entry: CacheEntry<unknown>,
  ttl: number,
  staleTtl?: number,
): boolean => {
  const age = Date.now() - entry.updatedAt;
  return age > ttl && age <= ttl + (staleTtl ?? 0);
};

const setEntry = <T>(
  store: CacheStore,
  key: CacheKey,
  value: T,
): CacheEntry<T> => {
  const entry: CacheEntry<T> = {
    value,
    updatedAt: Date.now(),
  };
  store.set(key, entry);
  return entry;
};

const resolveWithDedupe = async <T, Args extends unknown[] = []>(
  key: CacheKey,
  store: CacheStore,
  taskFn: TaskFn<T, Args>,
  args: Args,
  options: CacheOptions = {},
): Promise<T> => {
  const dedupe = options.dedupe !== false;
  const pending = dedupe ? getPendingMap(store) : undefined;
  if (pending) {
    const inFlight = pending.get(key) as Promise<T> | undefined;
    if (inFlight) return inFlight;
  }

  const promise = Promise.resolve()
    .then(() => taskFn(...args))
    .then((value) => {
      setEntry(store, key, value);
      return value;
    })
    .finally(() => {
      pending?.delete(key);
    });

  pending?.set(key, promise);
  return promise;
};

/** Cache wrapper with optional TTL and in-flight deduplication. */
export const cache =
  <T, Args extends unknown[] = []>(
    key: CacheKey,
    store: CacheStore,
    options: CacheOptions = {},
  ): TaskOperator<T, T, Args> =>
  (taskFn: TaskFn<T, Args>): TaskFn<T, Args> =>
  async (...args: Args) => {
    const entry = store.get<T>(key);
    if (entry && isFresh(entry, options.ttl)) return entry.value;
    return resolveWithDedupe(key, store, taskFn, args, options);
  };

/**
 * Return stale values within a stale window and refresh in background.
 */
export const staleWhileRevalidate =
  <T, Args extends unknown[] = []>(
    key: CacheKey,
    store: CacheStore,
    options: StaleWhileRevalidateOptions,
  ): TaskOperator<T, T, Args> =>
  (taskFn: TaskFn<T, Args>): TaskFn<T, Args> =>
  async (...args: Args) => {
    const ttl = toValidTtl((options as { ttl?: unknown } | undefined)?.ttl);
    const entry = store.get<T>(key);
    if (entry && isFresh(entry, ttl)) return entry.value;

    if (entry && isWithinStale(entry, ttl, options.staleTtl)) {
      void resolveWithDedupe(key, store, taskFn, args, options).catch(() => {
        // Background revalidation errors are ignored.
      });
      return entry.value;
    }

    return resolveWithDedupe(key, store, taskFn, args, options);
  };
