import { describe, expect, it, vi } from "vitest";
import {
  MemoryCacheStore,
  cache,
  cacheKey,
  invalidateOnResolve,
  staleWhileRevalidate,
} from "../index";

const createDeferred = <T,>() => {
  let resolve: (value: T) => void;
  let reject: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve: resolve!, reject: reject! };
};

describe("MemoryCacheStore", () => {
  it("stores and retrieves entries", () => {
    const store = new MemoryCacheStore();
    store.set("key", { value: 1, createdAt: 1, updatedAt: 1 });

    expect(store.has("key")).toBe(true);
    expect(store.get("key")?.value).toBe(1);
    expect(Array.from(store.keys())).toEqual(["key"]);
  });

  it("deletes and clears entries", () => {
    const store = new MemoryCacheStore();
    store.set("a", { value: "a", createdAt: 1, updatedAt: 1 });
    store.set("b", { value: "b", createdAt: 1, updatedAt: 1 });

    store.delete("a");
    expect(store.has("a")).toBe(false);
    expect(store.has("b")).toBe(true);

    store.clear();
    expect(Array.from(store.keys())).toEqual([]);
  });

  it("emits events and isolates listener errors", () => {
    const store = new MemoryCacheStore();
    const events: string[] = [];
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    store.subscribe((event) => {
      events.push(event.type);
      throw new Error("listener boom");
    });
    store.subscribe((event) => events.push(`ok:${event.type}`));

    store.set("key", { value: 1, createdAt: 1, updatedAt: 1 });

    expect(events).toEqual(["set", "ok:set"]);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("invalidates by tags and cleans tag index", () => {
    const store = new MemoryCacheStore();
    store.set("a", { value: 1, createdAt: 1, updatedAt: 1, tags: ["t1"] });
    store.set("b", { value: 2, createdAt: 1, updatedAt: 1, tags: ["t1", "t2"] });

    store.invalidateTags(["t1"]);

    expect(store.has("a")).toBe(false);
    expect(store.has("b")).toBe(false);
  });
});

describe("cache", () => {
  it("returns cached data when fresh", async () => {
    const store = new MemoryCacheStore();
    const taskFn = cache("key", store, { ttl: 100 })(async () => "fresh");

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00.000Z"));

    await expect(taskFn()).resolves.toBe("fresh");
    vi.setSystemTime(new Date("2024-01-01T00:00:00.050Z"));
    await expect(taskFn()).resolves.toBe("fresh");

    vi.useRealTimers();
  });

  it("refetches when stale", async () => {
    const store = new MemoryCacheStore();
    const taskFn = cache("key", store, { ttl: 10 })(async () => "new");

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00.000Z"));
    await taskFn();

    vi.setSystemTime(new Date("2024-01-01T00:00:00.050Z"));
    await expect(taskFn()).resolves.toBe("new");
    vi.useRealTimers();
  });

  it("dedupes in-flight requests by default", async () => {
    const store = new MemoryCacheStore();
    const deferred = createDeferred<string>();
    const taskFn = cache("key", store)(() => deferred.promise);

    const first = taskFn();
    const second = taskFn();

    deferred.resolve("value");
    await expect(Promise.all([first, second])).resolves.toEqual(["value", "value"]);
  });

  it("can disable dedupe", async () => {
    const store = new MemoryCacheStore();
    const deferreds = [createDeferred<string>(), createDeferred<string>()];
    let index = 0;
    const taskFn = cache("key", store, { dedupe: false })(
      () => deferreds[index++].promise
    );

    const first = taskFn();
    const second = taskFn();

    deferreds[0].resolve("first");
    deferreds[1].resolve("second");

    await expect(Promise.all([first, second])).resolves.toEqual(["first", "second"]);
  });
});

describe("staleWhileRevalidate", () => {
  it("returns fresh data without revalidating", async () => {
    const store = new MemoryCacheStore();
    const taskFn = staleWhileRevalidate("key", store, { ttl: 50, staleTtl: 50 })(
      async () => "data"
    );

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00.000Z"));
    await taskFn();

    vi.setSystemTime(new Date("2024-01-01T00:00:00.040Z"));
    await expect(taskFn()).resolves.toBe("data");
    vi.useRealTimers();
  });

  it("returns stale data and revalidates in background", async () => {
    const store = new MemoryCacheStore();
    const deferred = createDeferred<string>();
    const taskFn = staleWhileRevalidate("key", store, { ttl: 10, staleTtl: 30 })(
      () => deferred.promise
    );

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00.000Z"));
    deferred.resolve("initial");
    await taskFn();

    await Promise.resolve();

    const next = createDeferred<string>();
    const nextTaskFn = staleWhileRevalidate("key", store, { ttl: 10, staleTtl: 30 })(
      () => next.promise
    );

    vi.setSystemTime(new Date("2024-01-01T00:00:00.020Z"));
    const result = await nextTaskFn();
    expect(result).toBe("initial");

    next.resolve("updated");
    await next.promise;
    expect(store.get<string>("key")?.value).toBe("updated");
    vi.useRealTimers();
  });

  it("falls through to fetch when beyond stale window", async () => {
    const store = new MemoryCacheStore();
    const taskFn = staleWhileRevalidate("key", store, { ttl: 10, staleTtl: 10 })(
      async () => "new"
    );

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00.000Z"));
    await taskFn();

    vi.setSystemTime(new Date("2024-01-01T00:00:00.050Z"));
    await expect(taskFn()).resolves.toBe("new");
    vi.useRealTimers();
  });
});

describe("invalidateOnResolve", () => {
  it("invalidates by key or keys", async () => {
    const store = new MemoryCacheStore();
    store.set("a", { value: 1, createdAt: 1, updatedAt: 1 });
    store.set("b", { value: 2, createdAt: 1, updatedAt: 1 });

    const taskFn = invalidateOnResolve(["a", "b"], store)(async () => "ok");
    await taskFn();

    expect(store.has("a")).toBe(false);
    expect(store.has("b")).toBe(false);
  });

  it("invalidates by tags", async () => {
    const store = new MemoryCacheStore();
    store.set("a", { value: 1, createdAt: 1, updatedAt: 1, tags: ["t1"] });
    store.set("b", { value: 2, createdAt: 1, updatedAt: 1, tags: ["t1"] });

    const taskFn = invalidateOnResolve({ tags: ["t1"] }, store)(async () => "ok");
    await taskFn();

    expect(store.has("a")).toBe(false);
    expect(store.has("b")).toBe(false);
  });

  it("supports dynamic targets", async () => {
    const store = new MemoryCacheStore();
    store.set("user:1", { value: 1, createdAt: 1, updatedAt: 1 });

    const taskFn = invalidateOnResolve((id: number) => `user:${id}`, store)(
      async () => 1
    );
    await taskFn();

    expect(store.has("user:1")).toBe(false);
  });
});

describe("cacheKey", () => {
  it("joins parts with colons", () => {
    expect(cacheKey("user", 1, true, null)).toBe("user:1:true:null");
  });
});
