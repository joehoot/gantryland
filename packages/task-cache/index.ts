import type { TaskFn } from "@gantryland/task";

export type CacheKey = string | number | symbol;

export type CacheEntry<T> = {
  value: T;
  createdAt: number;
  updatedAt: number;
};

export type CacheStore = {
  get<T>(key: CacheKey): CacheEntry<T> | undefined;
  set<T>(key: CacheKey, entry: CacheEntry<T>): void;
  delete(key: CacheKey): void;
};

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
  staleTtl?: number;
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
  previous?: CacheEntry<T>,
): CacheEntry<T> => {
  const now = Date.now();
  const entry: CacheEntry<T> = {
    value,
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
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
  previous?: CacheEntry<T>,
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
      setEntry(store, key, value, previous);
      return value;
    })
    .finally(() => {
      pending?.delete(key);
    });

  pending?.set(key, promise);
  return promise;
};

export const cache =
  <T, Args extends unknown[] = []>(
    key: CacheKey,
    store: CacheStore,
    options: CacheOptions = {},
  ) =>
  (taskFn: TaskFn<T, Args>): TaskFn<T, Args> =>
  async (...args: Args) => {
    const entry = store.get<T>(key);
    if (entry && isFresh(entry, options.ttl)) return entry.value;
    return resolveWithDedupe(key, store, taskFn, args, options, entry);
  };

export const staleWhileRevalidate =
  <T, Args extends unknown[] = []>(
    key: CacheKey,
    store: CacheStore,
    options: CacheOptions = {},
  ) =>
  (taskFn: TaskFn<T, Args>): TaskFn<T, Args> =>
  async (...args: Args) => {
    const entry = store.get<T>(key);
    if (entry && isFresh(entry, options.ttl)) return entry.value;

    if (entry && isWithinStale(entry, options.ttl, options.staleTtl)) {
      void resolveWithDedupe(key, store, taskFn, args, options, entry).catch(
        () => {
          // Background revalidation errors are ignored.
        },
      );
      return entry.value;
    }

    return resolveWithDedupe(key, store, taskFn, args, options, entry);
  };
