import { describe, expect, it, vi } from "vitest";
import { Task } from "../index";

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

const createAbortError = () =>
  Object.assign(new Error("Aborted"), { name: "AbortError" });

describe("Task", () => {
  it("starts stale and idle", () => {
    const task = new Task(async () => "ok");
    expect(task.getState()).toEqual({
      data: undefined,
      error: undefined,
      isLoading: false,
      isStale: true,
    });
  });

  it("notifies immediately and on state updates", async () => {
    const deferred = createDeferred<string>();
    const task = new Task(() => deferred.promise);
    const states: Array<ReturnType<typeof task.getState>> = [];

    const unsub = task.subscribe((state) => {
      states.push({ ...state });
    });

    const runPromise = task.run();
    deferred.resolve("value");
    await runPromise;

    expect(states).toHaveLength(3);
    expect(states[0]).toEqual({
      data: undefined,
      error: undefined,
      isLoading: false,
      isStale: true,
    });
    expect(states[1]?.isLoading).toBe(true);
    expect(states[2]).toEqual({
      data: "value",
      error: undefined,
      isLoading: false,
      isStale: false,
    });

    unsub();
  });

  it("isolates listener errors during initial subscribe emit", () => {
    const task = new Task(async () => "ok");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      task.subscribe(() => {
        throw new Error("listener boom");
      });
    }).not.toThrow();

    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("returns immutable state snapshots", () => {
    const task = new Task(async () => "ok");
    const snapshot = task.getState() as {
      isLoading: boolean;
    };

    expect(() => {
      snapshot.isLoading = true;
    }).toThrow();

    expect(task.getState().isLoading).toBe(false);
  });

  it("forwards run args to the task function", async () => {
    const task = new Task<string, [number, string]>(async (id, label) =>
      Promise.resolve(`${id}:${label}`),
    );

    await expect(task.run(7, "ok")).resolves.toBe("7:ok");
    expect(task.getState().data).toBe("7:ok");
  });

  it("preserves data when later runs fail", async () => {
    let fail = false;
    const error = new Error("boom");
    const task = new Task(async () => {
      if (fail) throw error;
      return "initial";
    });

    await task.run();
    fail = true;
    await expect(task.run()).rejects.toBe(error);

    expect(task.getState().data).toBe("initial");
    expect(task.getState().error).toBe(error);
    expect(task.getState().isLoading).toBe(false);
  });

  it("normalizes non-Error failures", async () => {
    const task = new Task(async () => {
      throw "boom";
    });

    await expect(task.run()).rejects.toMatchObject({ message: "boom" });
    expect(task.getState().error).toBeInstanceOf(Error);
    expect(task.getState().error?.message).toBe("boom");
  });

  it("handles synchronous task function throws", async () => {
    const task = new Task<string>(() => {
      throw new Error("sync boom");
    });

    await expect(task.run()).rejects.toThrow("sync boom");
    expect(task.getState().error?.message).toBe("sync boom");
    expect(task.getState().isLoading).toBe(false);
  });

  it("normalizes null failures", async () => {
    const task = new Task(async () => {
      throw null;
    });

    await expect(task.run()).rejects.toMatchObject({ message: "null" });
    expect(task.getState().error?.message).toBe("null");
  });

  it("clears previous errors when a new run starts", async () => {
    let call = 0;
    const deferred = createDeferred<string>();
    const task = new Task(async () => {
      call += 1;
      if (call === 1) throw new Error("boom");
      return deferred.promise;
    });

    await expect(task.run()).rejects.toThrow("boom");
    const runPromise = task.run();
    expect(task.getState().error).toBe(undefined);
    expect(task.getState().isLoading).toBe(true);

    deferred.resolve("ok");
    await runPromise;
  });

  it("cancel rejects in-flight run and clears loading", async () => {
    const task = new Task(() => new Promise<string>(() => {}));

    const runPromise = task.run();
    task.cancel();

    await expect(runPromise).rejects.toMatchObject({ name: "AbortError" });
    expect(task.getState().isLoading).toBe(false);
    expect(task.getState().error).toBe(undefined);
  });

  it("treats AbortError as cancellation and does not set error", async () => {
    const task = new Task(async () => {
      throw createAbortError();
    });

    await expect(task.run()).rejects.toMatchObject({ name: "AbortError" });
    expect(task.getState().error).toBe(undefined);
    expect(task.getState().isLoading).toBe(false);
  });

  it("uses the latest run when multiple runs overlap", async () => {
    const deferreds: Array<ReturnType<typeof createDeferred<string>>> = [];
    const task = new Task(() => {
      const deferred = createDeferred<string>();
      deferreds.push(deferred);
      return deferred.promise;
    });

    const firstRun = task.run();
    void firstRun.catch(() => {});
    const secondRun = task.run();

    deferreds[0].resolve("first");
    deferreds[1].resolve("second");

    await expect(firstRun).rejects.toMatchObject({ name: "AbortError" });
    await expect(secondRun).resolves.toBe("second");
    expect(task.getState().data).toBe("second");
  });

  it("reset restores the initial state", async () => {
    const task = new Task(async () => "data");
    await task.run();

    task.reset();
    expect(task.getState()).toEqual({
      data: undefined,
      error: undefined,
      isLoading: false,
      isStale: true,
    });
  });

  it("cancel is a no-op when idle", () => {
    const task = new Task(async () => "data");
    task.cancel();
    expect(task.getState()).toEqual({
      data: undefined,
      error: undefined,
      isLoading: false,
      isStale: true,
    });
  });

  it("fulfill sets data immediately", () => {
    const task = new Task<string>(async () => "ignored");

    const result = task.fulfill("ready");

    expect(result).toBe("ready");
    expect(task.getState()).toEqual({
      data: "ready",
      error: undefined,
      isLoading: false,
      isStale: false,
    });
  });

  it("fulfill clears previous error", async () => {
    const task = new Task<string>(async () => {
      throw new Error("boom");
    });

    await expect(task.run()).rejects.toThrow("boom");
    expect(task.getState().error?.message).toBe("boom");

    task.fulfill("recovered");
    expect(task.getState().error).toBe(undefined);
    expect(task.getState().data).toBe("recovered");
  });

  it("fulfill cancels in-flight run and keeps fulfilled data", async () => {
    const task = new Task(() => new Promise<string>(() => {}));

    const runPromise = task.run();
    task.fulfill("manual");

    await expect(runPromise).rejects.toMatchObject({ name: "AbortError" });
    expect(task.getState()).toEqual({
      data: "manual",
      error: undefined,
      isLoading: false,
      isStale: false,
    });
  });

  it("reset cancels in-flight run and restores stale state", async () => {
    const task = new Task(() => new Promise<string>(() => {}));

    const runPromise = task.run();
    task.reset();

    await expect(runPromise).rejects.toMatchObject({ name: "AbortError" });
    expect(task.getState()).toEqual({
      data: undefined,
      error: undefined,
      isLoading: false,
      isStale: true,
    });
  });

  it("isolates listener errors", async () => {
    const task = new Task(async () => "data");
    let callCount = 0;
    let allowThrow = false;
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    task.subscribe(() => {
      callCount += 1;
      if (allowThrow) throw new Error("listener boom");
    });

    task.subscribe(() => {
      callCount += 1;
    });

    allowThrow = true;
    await task.run();

    expect(callCount).toBeGreaterThan(2);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("marks isStale false when run starts", async () => {
    const deferred = createDeferred<string>();
    const task = new Task(() => deferred.promise);

    const runPromise = task.run();
    expect(task.getState().isStale).toBe(false);
    deferred.resolve("value");
    await runPromise;
  });

  it("does not allow older failures to overwrite newer success", async () => {
    const deferreds: Array<ReturnType<typeof createDeferred<string>>> = [];
    const task = new Task(() => {
      const deferred = createDeferred<string>();
      deferreds.push(deferred);
      return deferred.promise;
    });

    const firstRun = task.run();
    void firstRun.catch(() => {});
    const secondRun = task.run();

    deferreds[1].resolve("second");
    deferreds[0].reject(new Error("older"));

    await expect(secondRun).resolves.toBe("second");
    await expect(firstRun).rejects.toMatchObject({ name: "AbortError" });

    expect(task.getState().data).toBe("second");
    expect(task.getState().error).toBe(undefined);
  });
});
