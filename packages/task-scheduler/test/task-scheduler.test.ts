import { describe, expect, it, vi } from "vitest";
import { Task } from "@gantryland/task";
import { debounce, pollTask, queue, throttle } from "../index";

const createDeferred = <T,>() => {
  let resolve: (value: T) => void;
  let reject: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve: resolve!, reject: reject! };
};

const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe("pollTask", () => {
  it("runs immediately and on interval", async () => {
    vi.useFakeTimers();
    let calls = 0;
    const task = new Task(async () => {
      calls += 1;
    });

    const stop = pollTask(task, { intervalMs: 50 });
    await Promise.resolve();

    expect(calls).toBe(1);

    await vi.advanceTimersByTimeAsync(50);
    expect(calls).toBe(2);

    stop();
    vi.useRealTimers();
  });

  it("can delay the first run", async () => {
    vi.useFakeTimers();
    let calls = 0;
    const task = new Task(async () => {
      calls += 1;
    });

    const stop = pollTask(task, { intervalMs: 20, immediate: false });
    await Promise.resolve();

    expect(calls).toBe(0);
    await vi.advanceTimersByTimeAsync(20);
    expect(calls).toBe(1);

    stop();
    vi.useRealTimers();
  });

  it("stops scheduling after stop is called", async () => {
    vi.useFakeTimers();
    let calls = 0;
    const task = new Task(async () => {
      calls += 1;
    });

    const stop = pollTask(task, { intervalMs: 10 });
    await Promise.resolve();
    stop();

    await vi.advanceTimersByTimeAsync(50);
    expect(calls).toBe(1);

    vi.useRealTimers();
  });
});

describe("debounce", () => {
  it("only runs the last call and rejects earlier calls", async () => {
    vi.useFakeTimers();
    const taskFn = vi.fn(async () => "ok");
    const debounced = debounce<string>({ waitMs: 30 })(taskFn);

    const first = debounced();
    const second = debounced();

    await expect(first).rejects.toMatchObject({ name: "AbortError" });

    await vi.advanceTimersByTimeAsync(30);
    await expect(second).resolves.toBe("ok");
    expect(taskFn).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });

  it("rejects if the signal aborts before execution", async () => {
    vi.useFakeTimers();
    const taskFn = vi.fn(async () => "ok");
    const debounced = debounce<string>({ waitMs: 20 })(taskFn);

    const controller = new AbortController();
    const promise = debounced(controller.signal);
    controller.abort();

    await expect(promise).rejects.toMatchObject({ name: "AbortError" });
    expect(taskFn).not.toHaveBeenCalled();

    vi.useRealTimers();
  });
});

describe("throttle", () => {
  it("reuses in-flight promise within the window", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00.000Z"));

    const deferred = createDeferred<string>();
    const taskFn = vi.fn(() => deferred.promise);
    const throttled = throttle<string>({ windowMs: 100 })(taskFn);

    const first = throttled();
    const second = throttled();

    expect(first).toBe(second);
    expect(taskFn).toHaveBeenCalledTimes(1);

    deferred.resolve("ok");
    await first;

    vi.setSystemTime(new Date("2024-01-01T00:00:00.200Z"));
    const third = throttled();
    expect(taskFn).toHaveBeenCalledTimes(2);

    await third;
    vi.useRealTimers();
  });
});

describe("queue", () => {
  it("runs tasks in order with default concurrency", async () => {
    const deferreds = [createDeferred<string>(), createDeferred<string>()];
    const started: number[] = [];
    let index = 0;
    const taskFn = vi.fn(async () => {
      const current = index;
      started.push(current);
      index += 1;
      return deferreds[current].promise;
    });

    const queued = queue<string>()(taskFn);

    const first = queued();
    const second = queued();

    await Promise.resolve();
    expect(started).toEqual([0]);

    deferreds[0].resolve("first");
    await first;

    await flushMicrotasks();
    expect(started).toEqual([0, 1]);

    deferreds[1].resolve("second");
    await expect(second).resolves.toBe("second");
  });

  it("respects concurrency limits", async () => {
    const deferreds = [createDeferred<string>(), createDeferred<string>(), createDeferred<string>()];
    const started: number[] = [];
    let index = 0;
    const taskFn = vi.fn(async () => {
      const current = index;
      started.push(current);
      index += 1;
      return deferreds[current].promise;
    });

    const queued = queue<string>({ concurrency: 2 })(taskFn);

    const first = queued();
    const second = queued();
    const third = queued();

    await Promise.resolve();
    expect(started).toEqual([0, 1]);

    deferreds[0].resolve("one");
    await first;

    await flushMicrotasks();
    expect(started).toEqual([0, 1, 2]);

    deferreds[1].resolve("two");
    deferreds[2].resolve("three");
    await expect(Promise.all([second, third])).resolves.toEqual(["two", "three"]);
  });

  it("rejects with AbortError when aborted before start", async () => {
    const deferred = createDeferred<string>();
    const taskFn = vi.fn(async () => deferred.promise);
    const queued = queue<string>()(taskFn);

    const first = queued();
    const controller = new AbortController();
    const second = queued(controller.signal);
    controller.abort();

    await expect(second).rejects.toMatchObject({ name: "AbortError" });
    expect(taskFn).toHaveBeenCalledTimes(1);

    deferred.resolve("done");
    await first;
  });
});
