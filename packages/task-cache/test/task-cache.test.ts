import { describe, expect, it, vi } from "vitest";
import {
  MemoryCacheStore,
  cache,
  invalidateOnResolve,
  staleWhileRevalidate,
} from "../index";

const createDeferred = <T>() => {
  let resolve: (value: T) => void = (_value) => {
    throw new Error("Deferred resolve before initialization");
  };
  let reject: (reason?: unknown) => void = (_reason) => {
    throw new Error("Deferred reject before initialization");
  };
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
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

  it("invalidates by tags", () => {
    const store = new MemoryCacheStore();
    store.set("a", { value: 1, createdAt: 1, updatedAt: 1, tags: ["t1"] });
    store.set("b", {
      value: 2,
      createdAt: 1,
      updatedAt: 1,
      tags: ["t1", "t2"],
    });

    store.invalidateTags(["t1"]);

    expect(store.has("a")).toBe(false);
    expect(store.has("b")).toBe(false);
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
    store.delete("key");
    store.clear();

    expect(events).toEqual([
      "set",
      "ok:set",
      "invalidate",
      "ok:invalidate",
      "clear",
      "ok:clear",
    ]);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
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
    let calls = 0;
    const taskFn = cache("key", store, { ttl: 10 })(async () => {
      calls += 1;
      return `value-${calls}`;
    });

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00.000Z"));
    await expect(taskFn()).resolves.toBe("value-1");

    vi.setSystemTime(new Date("2024-01-01T00:00:00.050Z"));
    await expect(taskFn()).resolves.toBe("value-2");
    vi.useRealTimers();
  });

  it("does not cache when task rejects", async () => {
    const store = new MemoryCacheStore();
    const taskFn = cache(
      "key",
      store,
    )(async () => {
      throw new Error("nope");
    });

    await expect(taskFn()).rejects.toThrow("nope");
    expect(store.get("key")).toBeUndefined();
  });

  it("dedupes in-flight requests by default", async () => {
    const store = new MemoryCacheStore();
    const deferred = createDeferred<string>();
    const taskFn = cache("key", store)(() => deferred.promise);

    const first = taskFn();
    const second = taskFn();

    deferred.resolve("value");
    await expect(Promise.all([first, second])).resolves.toEqual([
      "value",
      "value",
    ]);
  });

  it("shares rejection across deduped callers", async () => {
    const store = new MemoryCacheStore();
    const deferred = createDeferred<string>();
    const taskFn = cache("key", store)(() => deferred.promise);

    const first = taskFn();
    const second = taskFn();
    deferred.reject(new Error("boom"));

    await expect(first).rejects.toThrow("boom");
    await expect(second).rejects.toThrow("boom");
    expect(store.get("key")).toBeUndefined();
  });

  it("can disable dedupe", async () => {
    const store = new MemoryCacheStore();
    const deferreds = [createDeferred<string>(), createDeferred<string>()];
    let index = 0;
    const taskFn = cache("key", store, { dedupe: false })(
      () => deferreds[index++].promise,
    );

    const first = taskFn();
    const second = taskFn();

    deferreds[0].resolve("first");
    deferreds[1].resolve("second");

    await expect(Promise.all([first, second])).resolves.toEqual([
      "first",
      "second",
    ]);
  });

  it("preserves createdAt when refreshing existing cache entry", async () => {
    const store = new MemoryCacheStore();
    let calls = 0;
    const taskFn = cache("key", store, { ttl: 10 })(async () => {
      calls += 1;
      return `value-${calls}`;
    });

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00.000Z"));
    await taskFn();
    const createdAt = store.get<string>("key")?.createdAt;

    vi.setSystemTime(new Date("2024-01-01T00:00:00.050Z"));
    await taskFn();
    expect(store.get<string>("key")?.createdAt).toBe(createdAt);
    vi.useRealTimers();
  });
});

describe("staleWhileRevalidate", () => {
  it("returns fresh data without revalidating", async () => {
    const store = new MemoryCacheStore();
    const taskFn = staleWhileRevalidate("key", store, {
      ttl: 50,
      staleTtl: 50,
    })(async () => "data");

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
    const taskFn = staleWhileRevalidate("key", store, {
      ttl: 10,
      staleTtl: 30,
    })(() => deferred.promise);

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00.000Z"));
    deferred.resolve("initial");
    await taskFn();

    await Promise.resolve();

    const revalidated = createDeferred<void>();
    const unsubscribe = store.subscribe((event) => {
      if (event.type === "set" && event.entry?.value === "updated") {
        revalidated.resolve();
      }
    });

    const next = createDeferred<string>();
    const nextTaskFn = staleWhileRevalidate("key", store, {
      ttl: 10,
      staleTtl: 30,
    })(() => next.promise);

    vi.setSystemTime(new Date("2024-01-01T00:00:00.020Z"));
    await expect(nextTaskFn()).resolves.toBe("initial");

    next.resolve("updated");
    await next.promise;
    await revalidated.promise;
    unsubscribe();
    expect(store.get<string>("key")?.value).toBe("updated");
    vi.useRealTimers();
  });

  it("emits stale and revalidate events in stale window", async () => {
    const store = new MemoryCacheStore();
    const events: string[] = [];
    store.subscribe((event) => events.push(event.type));
    const seed = staleWhileRevalidate("key", store, { ttl: 10, staleTtl: 30 })(
      async () => "initial",
    );

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00.000Z"));
    await seed();

    vi.setSystemTime(new Date("2024-01-01T00:00:00.020Z"));
    await seed();

    expect(events).toContain("stale");
    expect(events).toContain("revalidate");
    vi.useRealTimers();
  });

  it("emits revalidateError and keeps stale value on background failure", async () => {
    const store = new MemoryCacheStore();
    const events: string[] = [];
    store.subscribe((event) => events.push(event.type));

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00.000Z"));
    store.set("key", {
      value: "cached",
      createdAt: Date.now(),
      updatedAt: Date.now() - 20,
    });

    const deferred = createDeferred<string>();
    const taskFn = staleWhileRevalidate("key", store, {
      ttl: 10,
      staleTtl: 30,
    })(() => deferred.promise);

    await expect(taskFn()).resolves.toBe("cached");
    deferred.reject(new Error("boom"));
    await deferred.promise.catch(() => {});
    await Promise.resolve();

    expect(events).toContain("revalidateError");
    expect(store.get<string>("key")?.value).toBe("cached");
    vi.useRealTimers();
  });

  it("attaches onError for deduped stale revalidations", async () => {
    const store = new MemoryCacheStore();
    const events: string[] = [];
    store.subscribe((event) => events.push(event.type));

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00.000Z"));
    store.set("key", {
      value: "cached",
      createdAt: Date.now(),
      updatedAt: Date.now() - 20,
    });

    const deferred = createDeferred<string>();
    let calls = 0;
    const taskFn = staleWhileRevalidate("key", store, {
      ttl: 10,
      staleTtl: 30,
    })(() => {
      calls += 1;
      return deferred.promise;
    });

    await expect(taskFn()).resolves.toBe("cached");
    await expect(taskFn()).resolves.toBe("cached");
    expect(calls).toBe(1);

    deferred.reject(new Error("boom"));
    await deferred.promise.catch(() => {});
    await Promise.resolve();

    const revalidations = events.filter((type) => type === "revalidate");
    expect(revalidations.length).toBe(1);

    const revalidateErrors = events.filter(
      (type) => type === "revalidateError",
    );
    expect(revalidateErrors.length).toBe(1);
    expect(store.get<string>("key")?.value).toBe("cached");
    vi.useRealTimers();
  });

  it("falls through to fetch after stale window", async () => {
    const store = new MemoryCacheStore();
    let calls = 0;
    const taskFn = staleWhileRevalidate("key", store, {
      ttl: 10,
      staleTtl: 10,
    })(async () => {
      calls += 1;
      return `value-${calls}`;
    });

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00.000Z"));
    await expect(taskFn()).resolves.toBe("value-1");

    vi.setSystemTime(new Date("2024-01-01T00:00:00.050Z"));
    await expect(taskFn()).resolves.toBe("value-2");
    vi.useRealTimers();
  });

  it("rejects and does not cache when miss fetch fails", async () => {
    const store = new MemoryCacheStore();
    const taskFn = staleWhileRevalidate("key", store, {
      ttl: 10,
      staleTtl: 10,
    })(async () => {
      throw new Error("boom");
    });

    await expect(taskFn()).rejects.toThrow("boom");
    expect(store.get("key")).toBeUndefined();
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

    const taskFn = invalidateOnResolve(
      { tags: ["t1"] },
      store,
    )(async () => "ok");
    await taskFn();

    expect(store.has("a")).toBe(false);
    expect(store.has("b")).toBe(false);
  });

  it("supports dynamic targets", async () => {
    const store = new MemoryCacheStore();
    store.set("user:1", { value: 1, createdAt: 1, updatedAt: 1 });

    const taskFn = invalidateOnResolve(
      (id: number) => `user:${id}`,
      store,
    )(async () => 1);
    await taskFn();

    expect(store.has("user:1")).toBe(false);
  });

  it("does not invalidate when task rejects", async () => {
    const store = new MemoryCacheStore();
    store.set("a", { value: 1, createdAt: 1, updatedAt: 1 });

    const taskFn = invalidateOnResolve(
      "a",
      store,
    )(async () => {
      throw new Error("boom");
    });

    await expect(taskFn()).rejects.toThrow("boom");
    expect(store.has("a")).toBe(true);
  });
});
