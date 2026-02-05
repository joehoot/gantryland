import { describe, expect, it, vi } from "vitest";
import { Task } from "@gantryland/task";
import { MemoryCacheStore, type CacheStore } from "@gantryland/task-cache";
import { consoleLogger, createLogger, logCache, logTask, logTaskState } from "../index";

const createDeferred = <T,>() => {
  let resolve: (value: T) => void;
  let reject: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve: resolve!, reject: reject! };
};

const createAbortError = () => Object.assign(new Error("Aborted"), { name: "AbortError" });

describe("consoleLogger", () => {
  it("uses console method and forwards meta", () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const meta = { value: 1 };

    consoleLogger({ level: "info", message: "hello", meta });

    expect(infoSpy).toHaveBeenCalledWith("hello", meta);
    infoSpy.mockRestore();
  });
});

describe("createLogger", () => {
  it("prefixes messages and forwards events", () => {
    const events: Array<{ message: string }> = [];
    const logger = createLogger({
      prefix: "[app]",
      logger: (event) => events.push(event),
    });

    logger({ level: "info", message: "ready", meta: { ok: true } });

    expect(events).toEqual([
      {
        level: "info",
        message: "[app] ready",
        meta: { ok: true },
      },
    ]);
  });
});

describe("logTask", () => {
  it("logs start and success with timing", async () => {
    const events: Array<{ message: string; level: string; meta?: Record<string, unknown> }> = [];
    const now = vi.fn().mockReturnValueOnce(10).mockReturnValueOnce(40);
    const taskFn = vi.fn(async () => "ok");

    const wrapped = logTask({ label: "job", logger: (event) => events.push(event), now })(taskFn);
    await wrapped();

    expect(taskFn).toHaveBeenCalledTimes(1);
    expect(events).toEqual([
      { level: "info", message: "job start" },
      { level: "info", message: "job success", meta: { durationMs: 30 } },
    ]);
  });

  it("forwards the AbortSignal to the TaskFn", async () => {
    const signal = new AbortController().signal;
    const taskFn = vi.fn(async () => "ok");

    const wrapped = logTask({ label: "job", logger: () => {} })(taskFn);
    await wrapped(signal);

    expect(taskFn).toHaveBeenCalledWith(signal);
  });

  it("logs errors and rethrows", async () => {
    const events: Array<{ message: string; level: string; meta?: Record<string, unknown> }> = [];
    const now = vi.fn().mockReturnValueOnce(5).mockReturnValueOnce(25);
    const error = new Error("boom");

    const wrapped = logTask({ label: "job", logger: (event) => events.push(event), now })(
      async () => {
        throw error;
      }
    );

    await expect(wrapped()).rejects.toBe(error);
    expect(events).toEqual([
      { level: "info", message: "job start" },
      { level: "error", message: "job error", meta: { durationMs: 20, error } },
    ]);
  });

  it("logs aborts as debug", async () => {
    const events: Array<{ message: string; level: string; meta?: Record<string, unknown> }> = [];
    const now = vi.fn().mockReturnValueOnce(1).mockReturnValueOnce(9);

    const wrapped = logTask({ label: "job", logger: (event) => events.push(event), now })(
      async () => {
        throw createAbortError();
      }
    );

    await expect(wrapped()).rejects.toMatchObject({ name: "AbortError" });
    expect(events).toEqual([
      { level: "info", message: "job start" },
      { level: "debug", message: "job abort", meta: { durationMs: 8 } },
    ]);
  });
});

describe("logTaskState", () => {
  it("logs start and success transitions", async () => {
    const events: Array<{ message: string; level: string; meta?: Record<string, unknown> }> = [];
    const now = vi.fn().mockReturnValueOnce(100).mockReturnValueOnce(130);
    const deferred = createDeferred<string>();
    const task = new Task(() => deferred.promise);

    const unsubscribe = logTaskState(task, {
      label: "users",
      logger: (event) => events.push(event),
      now,
    });

    const runPromise = task.run();
    deferred.resolve("ok");
    await runPromise;

    expect(events).toEqual([
      { level: "info", message: "users start" },
      { level: "info", message: "users success", meta: { durationMs: 30 } },
    ]);

    unsubscribe();
  });

  it("logs error transitions", async () => {
    const events: Array<{ message: string; level: string; meta?: Record<string, unknown> }> = [];
    const now = vi.fn().mockReturnValueOnce(5).mockReturnValueOnce(8);
    const error = new Error("fail");
    const task = new Task(async () => {
      throw error;
    });

    const unsubscribe = logTaskState(task, {
      label: "users",
      logger: (event) => events.push(event),
      now,
    });

    await task.run();

    expect(events).toEqual([
      { level: "info", message: "users start" },
      { level: "error", message: "users error", meta: { durationMs: 3, error } },
    ]);

    unsubscribe();
  });

  it("logs abort transitions", async () => {
    const events: Array<{ message: string; level: string; meta?: Record<string, unknown> }> = [];
    const now = vi.fn().mockReturnValueOnce(0).mockReturnValueOnce(6);
    const task = new Task((signal) =>
      new Promise<string>((_, reject) => {
        signal?.addEventListener("abort", () => reject(createAbortError()), { once: true });
      })
    );

    const unsubscribe = logTaskState(task, {
      label: "users",
      logger: (event) => events.push(event),
      now,
    });

    const runPromise = task.run();
    task.cancel();
    await runPromise;

    expect(events).toEqual([
      { level: "info", message: "users start" },
      { level: "debug", message: "users abort", meta: { durationMs: 6 } },
    ]);

    unsubscribe();
  });
});

describe("logCache", () => {
  it("logs cache events with label and key", () => {
    const events: Array<{ message: string; level: string; meta?: Record<string, unknown> }> = [];
    const store = new MemoryCacheStore();

    const unsubscribe = logCache(store, {
      label: "cache",
      logger: (event) => events.push(event),
    });

    store.set("users", { value: 1, createdAt: 1, updatedAt: 1 });

    expect(events).toEqual([
      { level: "debug", message: "cache set", meta: { key: "users" } },
    ]);

    unsubscribe();
  });

  it("returns a no-op when store has no subscribe", () => {
    const store = {
      get: () => undefined,
      set: () => undefined,
      delete: () => undefined,
      clear: () => undefined,
      has: () => false,
    } as CacheStore;

    const unsubscribe = logCache(store, { logger: () => {} });
    expect(() => unsubscribe()).not.toThrow();
  });
});
