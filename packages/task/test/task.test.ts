import { describe, expect, it, vi } from "vitest";
import { Task } from "../index";

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

describe("Task", () => {
  it("starts with a stale, idle state", () => {
    const task = new Task(async () => "ok");
    expect(task.getState()).toEqual({
      data: undefined,
      error: undefined,
      isLoading: false,
      isStale: true,
    });
  });

  it("notifies subscribers immediately and on updates", async () => {
    const deferred = createDeferred<string>();
    const task = new Task(() => deferred.promise);
    const states: Array<ReturnType<typeof task.getState>> = [];

    const unsub = task.subscribe((state) => {
      states.push({ ...state });
    });

    expect(states).toHaveLength(1);
    expect(states[0].isStale).toBe(true);

    const runPromise = task.run();
    expect(task.getState().isLoading).toBe(true);
    deferred.resolve("value");
    await runPromise;

    expect(states.at(-1)?.data).toBe("value");
    expect(states.at(-1)?.isLoading).toBe(false);
    expect(states.at(-1)?.isStale).toBe(false);

    unsub();
  });

  it("passes args to run", async () => {
    const task = new Task<string, [number, string]>(async (_signal, id, label) =>
      Promise.resolve(`${id}:${label}`)
    );

    await task.run(7, "ok");

    expect(task.getState().data).toBe("7:ok");
  });

  it("throws when run is called without a TaskFn", async () => {
    const task = new Task<string>();
    await expect(task.run()).rejects.toThrow("TaskFn is not set");
  });

  it("preserves data when run fails", async () => {
    const task = new Task(async () => "initial");
    await task.run();
    expect(task.getState().data).toBe("initial");

    const error = new Error("boom");
    task.define(async () => {
      throw error;
    });

    await task.run();
    expect(task.getState().data).toBe("initial");
    expect(task.getState().error).toBe(error);
    expect(task.getState().isLoading).toBe(false);
  });

  it("normalizes non-Error failures", async () => {
    const task = new Task(async () => {
      throw "boom";
    });

    await task.run();

    const { error } = task.getState();
    expect(error).toBeInstanceOf(Error);
    expect(error?.message).toBe("boom");
  });

  it("clears loading without error on abort", async () => {
    const task = new Task((signal) =>
      new Promise<string>((_, reject) => {
        if (signal?.aborted) {
          reject(createAbortError());
          return;
        }
        signal?.addEventListener("abort", () => reject(createAbortError()), { once: true });
      })
    );

    const runPromise = task.run();
    expect(task.getState().isLoading).toBe(true);
    task.cancel();
    await expect(runPromise).resolves.toBe(undefined);

    expect(task.getState().isLoading).toBe(false);
    expect(task.getState().error).toBe(undefined);
  });

  it("resolves undefined when canceled immediately after run starts", async () => {
    const task = new Task((signal) =>
      new Promise<string>((_, reject) => {
        signal?.addEventListener("abort", () => reject(createAbortError()), { once: true });
      })
    );

    const runPromise = task.run();
    task.cancel();

    await expect(runPromise).resolves.toBe(undefined);
    expect(task.getState().error).toBe(undefined);
  });

  it("ignores AbortError thrown by the TaskFn", async () => {
    const task = new Task(async () => {
      throw createAbortError();
    });

    const result = await task.run();

    expect(result).toBe(undefined);
    expect(task.getState().error).toBe(undefined);
  });

  it("resolves undefined on error", async () => {
    const task = new Task(async () => {
      throw new Error("boom");
    });

    const result = await task.run();

    expect(result).toBe(undefined);
  });

  it("resolveWith settles immediately and ignores in-flight work", async () => {
    const deferred = createDeferred<string>();
    const task = new Task(() => deferred.promise);

    const runPromise = task.run();
    expect(task.getState().isLoading).toBe(true);

    task.resolveWith("cached");
    expect(task.getState().isLoading).toBe(false);
    expect(task.getState().data).toBe("cached");

    deferred.resolve("late");
    await runPromise;
    expect(task.getState().data).toBe("cached");
  });

  it("uses the latest run when multiple requests complete", async () => {
    const deferreds: Array<ReturnType<typeof createDeferred<string>>> = [];
    const task = new Task(() => {
      const deferred = createDeferred<string>();
      deferreds.push(deferred);
      return deferred.promise;
    });

    const firstRun = task.run();
    const secondRun = task.run();

    deferreds[0].resolve("first");
    deferreds[1].resolve("second");

    await firstRun;
    await secondRun;

    expect(task.getState().data).toBe("second");
  });

  it("resolves undefined for superseded runs", async () => {
    const deferreds: Array<ReturnType<typeof createDeferred<string>>> = [];
    const task = new Task(() => {
      const deferred = createDeferred<string>();
      deferreds.push(deferred);
      return deferred.promise;
    });

    const firstRun = task.run();
    const secondRun = task.run();

    deferreds[0].resolve("first");
    deferreds[1].resolve("second");

    await expect(firstRun).resolves.toBe(undefined);
    await expect(secondRun).resolves.toBe("second");
  });

  it("reset returns to the initial state", async () => {
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

  it("define cancels in-flight work and uses the latest function", async () => {
    const first = createDeferred<string>();
    const task = new Task(() => first.promise);

    const firstRun = task.run();
    expect(task.getState().isLoading).toBe(true);

    task.define(async () => "second");
    first.resolve("first");
    await firstRun;

    expect(task.getState().isLoading).toBe(false);
    const secondRun = task.run();
    await secondRun;
    expect(task.getState().data).toBe("second");
  });

  it("cancel is a no-op when idle and preserves data when loading", async () => {
    const task = new Task(async () => "data");
    task.cancel();
    expect(task.getState()).toEqual({
      data: undefined,
      error: undefined,
      isLoading: false,
      isStale: true,
    });

    await task.run();
    expect(task.getState().data).toBe("data");

    const pending = new Task((signal) =>
      new Promise<string>((_, reject) => {
        signal?.addEventListener("abort", () => reject(createAbortError()), { once: true });
      })
    );
    pending.resolveWith("cached");
    const runPromise = pending.run();
    expect(pending.getState().isLoading).toBe(true);
    pending.cancel();
    await runPromise;

    expect(pending.getState().data).toBe("cached");
    expect(pending.getState().isLoading).toBe(false);
  });

  it("isolates listener errors during notifications", async () => {
    const task = new Task(async () => "data");
    let callCount = 0;
    let allowThrow = false;
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    task.subscribe(() => {
      callCount += 1;
      if (allowThrow) {
        throw new Error("listener boom");
      }
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

  it("dispose removes listeners and aborts in-flight work", async () => {
    const task = new Task((signal) =>
      new Promise<string>((_, reject) => {
        signal?.addEventListener("abort", () => reject(createAbortError()), { once: true });
      })
    );
    let notified = 0;

    task.subscribe(() => {
      notified += 1;
    });

    const runPromise = task.run();
    task.dispose();
    await runPromise;

    expect(notified).toBe(2);
  });

  it("marks isStale false as soon as run starts", async () => {
    const deferred = createDeferred<string>();
    const task = new Task(() => deferred.promise);

    const runPromise = task.run();
    expect(task.getState().isStale).toBe(false);
    deferred.resolve("value");
    await runPromise;
  });

  it("does not overwrite newer state with older failures", async () => {
    const deferreds: Array<ReturnType<typeof createDeferred<string>>> = [];
    const task = new Task(() => {
      const deferred = createDeferred<string>();
      deferreds.push(deferred);
      return deferred.promise;
    });

    const firstRun = task.run();
    const secondRun = task.run();

    deferreds[1].resolve("second");
    deferreds[0].reject(new Error("older"));

    await secondRun;
    await firstRun;

    expect(task.getState().data).toBe("second");
    expect(task.getState().error).toBe(undefined);
  });
});
