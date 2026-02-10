import { describe, expect, it, vi } from "vitest";
import { Task } from "../../task/index";
import { MemoryCacheStore, cache, staleWhileRevalidate } from "../index";

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
  it("stores, retrieves, and deletes entries", () => {
    const store = new MemoryCacheStore();

    store.set("key", { value: 1, updatedAt: 1 });
    expect(store.get<number>("key")?.value).toBe(1);

    store.delete("key");
    expect(store.get("key")).toBeUndefined();
  });
});

describe("Task.pipe integration", () => {
  it("applies cache operator in Task.pipe", async () => {
    const store = new MemoryCacheStore();
    let calls = 0;

    const task = new Task<string, []>(async () => {
      calls += 1;
      return `value-${calls}`;
    }).pipe(cache("key", store, { ttl: 100 }));

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00.000Z"));
    await expect(task.run()).resolves.toBe("value-1");

    vi.setSystemTime(new Date("2024-01-01T00:00:00.050Z"));
    await expect(task.run()).resolves.toBe("value-1");
    expect(calls).toBe(1);
    vi.useRealTimers();
  });

  it("applies staleWhileRevalidate operator in Task.pipe", async () => {
    const store = new MemoryCacheStore();
    const initial = createDeferred<string>();
    const next = createDeferred<string>();
    let calls = 0;

    const task = new Task<string, []>(() => {
      calls += 1;
      return calls === 1 ? initial.promise : next.promise;
    }).pipe(
      staleWhileRevalidate("key", store, {
        ttl: 10,
        staleTtl: 30,
      }),
    );

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00.000Z"));
    initial.resolve("initial");
    await expect(task.run()).resolves.toBe("initial");

    vi.setSystemTime(new Date("2024-01-01T00:00:00.020Z"));
    await expect(task.run()).resolves.toBe("initial");
    expect(calls).toBe(2);

    next.resolve("updated");
    await next.promise;
    await Promise.resolve();
    await expect(task.run()).resolves.toBe("updated");
    vi.useRealTimers();
  });
});

describe("cache", () => {
  it("returns cached data when fresh", async () => {
    const store = new MemoryCacheStore();
    const taskFn = cache<string, []>("key", store, { ttl: 100 })(
      async () => "fresh",
    );

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
    const taskFn = cache<string, []>("key", store, { ttl: 10 })(async () => {
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
    const taskFn = cache<string, []>(
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
    const taskFn = cache<string, []>("key", store)(() => deferred.promise);

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
    const taskFn = cache<string, []>("key", store)(() => deferred.promise);

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
    const taskFn = cache<string, []>("key", store, { dedupe: false })(
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

  it("updates updatedAt when refreshing existing cache entry", async () => {
    const store = new MemoryCacheStore();
    let calls = 0;
    const taskFn = cache<string, []>("key", store, { ttl: 10 })(async () => {
      calls += 1;
      return `value-${calls}`;
    });

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00.000Z"));
    await taskFn();
    const firstUpdatedAt = store.get<string>("key")?.updatedAt;

    vi.setSystemTime(new Date("2024-01-01T00:00:00.050Z"));
    await taskFn();
    expect(store.get<string>("key")?.updatedAt).toBeGreaterThan(
      firstUpdatedAt ?? 0,
    );
    vi.useRealTimers();
  });
});

describe("staleWhileRevalidate", () => {
  it("requires ttl at runtime", async () => {
    const store = new MemoryCacheStore();
    const taskFn = staleWhileRevalidate<string, []>(
      "key",
      store,
      undefined as unknown as { ttl: number },
    )(async () => "data");

    await expect(taskFn()).rejects.toThrow(
      "staleWhileRevalidate requires a non-negative finite ttl",
    );
  });

  it("rejects negative ttl at runtime", async () => {
    const store = new MemoryCacheStore();
    const taskFn = staleWhileRevalidate<string, []>("key", store, {
      ttl: -1,
    })(async () => "data");

    await expect(taskFn()).rejects.toThrow(
      "staleWhileRevalidate requires a non-negative finite ttl",
    );
  });

  it("rejects infinite ttl at runtime", async () => {
    const store = new MemoryCacheStore();
    const taskFn = staleWhileRevalidate<string, []>("key", store, {
      ttl: Number.POSITIVE_INFINITY,
    })(async () => "data");

    await expect(taskFn()).rejects.toThrow(
      "staleWhileRevalidate requires a non-negative finite ttl",
    );
  });

  it("rejects NaN ttl at runtime", async () => {
    const store = new MemoryCacheStore();
    const taskFn = staleWhileRevalidate<string, []>("key", store, {
      ttl: Number.NaN,
    })(async () => "data");

    await expect(taskFn()).rejects.toThrow(
      "staleWhileRevalidate requires a non-negative finite ttl",
    );
  });

  it("returns fresh data without revalidating", async () => {
    const store = new MemoryCacheStore();
    let calls = 0;
    const taskFn = staleWhileRevalidate<string, []>("key", store, {
      ttl: 50,
      staleTtl: 50,
    })(async () => {
      calls += 1;
      return "data";
    });

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00.000Z"));
    await taskFn();

    vi.setSystemTime(new Date("2024-01-01T00:00:00.040Z"));
    await expect(taskFn()).resolves.toBe("data");
    expect(calls).toBe(1);
    vi.useRealTimers();
  });

  it("returns stale data and revalidates in background", async () => {
    const store = new MemoryCacheStore();
    const initial = createDeferred<string>();
    const next = createDeferred<string>();
    let calls = 0;

    const taskFn = staleWhileRevalidate<string, []>("key", store, {
      ttl: 10,
      staleTtl: 30,
    })(() => {
      calls += 1;
      return calls === 1 ? initial.promise : next.promise;
    });

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00.000Z"));
    initial.resolve("initial");
    await expect(taskFn()).resolves.toBe("initial");

    vi.setSystemTime(new Date("2024-01-01T00:00:00.020Z"));
    await expect(taskFn()).resolves.toBe("initial");
    expect(calls).toBe(2);

    next.resolve("updated");
    await next.promise;
    await Promise.resolve();

    expect(store.get<string>("key")?.value).toBe("updated");
    vi.useRealTimers();
  });

  it("dedupes stale-window background revalidations", async () => {
    const store = new MemoryCacheStore();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00.000Z"));
    store.set("key", {
      value: "cached",
      updatedAt: Date.now() - 20,
    });

    const deferred = createDeferred<string>();
    let calls = 0;
    const taskFn = staleWhileRevalidate<string, []>("key", store, {
      ttl: 10,
      staleTtl: 30,
    })(() => {
      calls += 1;
      return deferred.promise;
    });

    await expect(taskFn()).resolves.toBe("cached");
    await expect(taskFn()).resolves.toBe("cached");
    expect(calls).toBe(1);

    deferred.resolve("updated");
    await deferred.promise;
    await Promise.resolve();
    expect(store.get<string>("key")?.value).toBe("updated");
    vi.useRealTimers();
  });

  it("can disable dedupe for stale-window background revalidations", async () => {
    const store = new MemoryCacheStore();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00.000Z"));
    store.set("key", {
      value: "cached",
      updatedAt: Date.now() - 20,
    });

    const deferreds = [createDeferred<string>(), createDeferred<string>()];
    let index = 0;
    let calls = 0;
    const taskFn = staleWhileRevalidate<string, []>("key", store, {
      ttl: 10,
      staleTtl: 30,
      dedupe: false,
    })(() => {
      calls += 1;
      return deferreds[index++].promise;
    });

    await expect(taskFn()).resolves.toBe("cached");
    await expect(taskFn()).resolves.toBe("cached");
    await Promise.resolve();
    await Promise.resolve();
    expect(calls).toBe(2);

    deferreds[0].resolve("updated-1");
    deferreds[1].resolve("updated-2");
    await deferreds[0].promise;
    await deferreds[1].promise;
    await Promise.resolve();
    expect(store.get<string>("key")?.value).toBe("updated-2");
    vi.useRealTimers();
  });

  it("keeps stale value on background failure", async () => {
    const store = new MemoryCacheStore();

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00.000Z"));
    store.set("key", {
      value: "cached",
      updatedAt: Date.now() - 20,
    });

    const deferred = createDeferred<string>();
    const taskFn = staleWhileRevalidate<string, []>("key", store, {
      ttl: 10,
      staleTtl: 30,
    })(() => deferred.promise);

    await expect(taskFn()).resolves.toBe("cached");
    deferred.reject(new Error("boom"));
    await deferred.promise.catch(() => {});
    await Promise.resolve();

    expect(store.get<string>("key")?.value).toBe("cached");
    vi.useRealTimers();
  });

  it("falls through to fetch after stale window", async () => {
    const store = new MemoryCacheStore();
    let calls = 0;
    const taskFn = staleWhileRevalidate<string, []>("key", store, {
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
    const taskFn = staleWhileRevalidate<string, []>("key", store, {
      ttl: 10,
      staleTtl: 10,
    })(async () => {
      throw new Error("boom");
    });

    await expect(taskFn()).rejects.toThrow("boom");
    expect(store.get("key")).toBeUndefined();
  });
});
