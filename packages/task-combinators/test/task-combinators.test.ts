import { describe, expect, it, vi } from "vitest";
import {
  TimeoutError,
  backoff,
  catchError,
  debounce,
  flatMap,
  map,
  mapError,
  pipe,
  queue,
  race,
  retry,
  retryWhen,
  sequence,
  tap,
  tapAbort,
  tapError,
  throttle,
  timeout,
  timeoutAbort,
  timeoutWith,
  zip,
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

const createAbortError = () =>
  Object.assign(new Error("Aborted"), { name: "AbortError" });

const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe("task-combinators", () => {
  it("map transforms resolved data", async () => {
    const taskFn = map((value: number) => value * 2)(async () => 2);
    await expect(taskFn()).resolves.toBe(4);
  });

  it("flatMap chains async work", async () => {
    const taskFn = flatMap((value: string) =>
      Promise.resolve(value.toUpperCase()),
    )(async () => "ok");

    await expect(taskFn()).resolves.toBe("OK");
  });

  it("tap runs side effects and returns original data", async () => {
    const values: number[] = [];
    const taskFn = tap((value: number) => values.push(value))(async () => 3);
    await expect(taskFn()).resolves.toBe(3);
    expect(values).toEqual([3]);
  });

  it("tapError runs on non-abort errors and rethrows", async () => {
    const errors: unknown[] = [];
    const err = new Error("boom");
    const taskFn = tapError((error) => errors.push(error))(async () => {
      throw err;
    });

    await expect(taskFn()).rejects.toBe(err);
    expect(errors).toEqual([err]);
  });

  it("tapAbort runs only on AbortError", async () => {
    const errors: unknown[] = [];
    const taskFn = tapAbort((error) => errors.push(error))(async () => {
      throw createAbortError();
    });

    await expect(taskFn()).rejects.toMatchObject({ name: "AbortError" });
    expect(errors).toHaveLength(1);
  });

  it("mapError transforms non-abort errors", async () => {
    const taskFn = mapError(() => new Error("wrapped"))(async () => {
      throw new Error("boom");
    });

    await expect(taskFn()).rejects.toMatchObject({ message: "wrapped" });
  });

  it("catchError returns fallback", async () => {
    const taskFn = catchError((err) => `fallback:${(err as Error).message}`)(
      async () => {
        throw new Error("boom");
      },
    );

    await expect(taskFn()).resolves.toBe("fallback:boom");
  });

  it("retry retries failures and succeeds", async () => {
    let attempts = 0;
    const taskFn = retry(2)(async () => {
      attempts += 1;
      if (attempts < 3) throw new Error("fail");
      return "ok";
    });

    await expect(taskFn()).resolves.toBe("ok");
    expect(attempts).toBe(3);
  });

  it("timeout rejects with TimeoutError", async () => {
    vi.useFakeTimers();
    const taskFn = timeout(20)(async () => new Promise(() => {}));
    const promise = taskFn();
    const rejection = expect(promise).rejects.toBeInstanceOf(TimeoutError);
    await vi.advanceTimersByTimeAsync(20);
    await rejection;
    vi.useRealTimers();
  });

  it("timeoutAbort matches timeout behavior", async () => {
    vi.useFakeTimers();
    const taskFn = timeoutAbort(20)(async () => new Promise(() => {}));
    const promise = taskFn();
    const rejection = expect(promise).rejects.toBeInstanceOf(TimeoutError);
    await vi.advanceTimersByTimeAsync(20);
    await rejection;
    vi.useRealTimers();
  });

  it("timeoutWith runs fallback on timeout", async () => {
    vi.useFakeTimers();
    const taskFn = timeoutWith(
      10,
      async () => "fallback",
    )(async () => new Promise(() => {}));
    const promise = taskFn();
    await vi.advanceTimersByTimeAsync(10);
    await expect(promise).resolves.toBe("fallback");
    vi.useRealTimers();
  });

  it("zip runs tasks in parallel and preserves order", async () => {
    const taskFn = zip(
      async () => 1,
      async () => "two",
      async () => true,
    );

    await expect(taskFn()).resolves.toEqual([1, "two", true]);
  });

  it("race resolves with the first settled task", async () => {
    const first = createDeferred<string>();
    const second = createDeferred<string>();
    const taskFn = race(
      () => first.promise,
      () => second.promise,
    );

    const promise = taskFn();
    second.resolve("second");
    await expect(promise).resolves.toBe("second");
  });

  it("sequence runs tasks sequentially", async () => {
    const calls: string[] = [];
    const taskFn = sequence(
      async () => {
        calls.push("first");
        return 1;
      },
      async () => {
        calls.push("second");
        return 2;
      },
    );

    await expect(taskFn()).resolves.toEqual([1, 2]);
    expect(calls).toEqual(["first", "second"]);
  });

  it("retryWhen retries based on predicate", async () => {
    let attempts = 0;
    const taskFn = retryWhen(() => true, { maxAttempts: 2 })(async () => {
      attempts += 1;
      if (attempts < 3) throw new Error("fail");
      return "ok";
    });

    await expect(taskFn()).resolves.toBe("ok");
    expect(attempts).toBe(3);
  });

  it("backoff applies delay and shouldRetry", async () => {
    vi.useFakeTimers();
    const delays: number[] = [];
    let attempts = 0;
    const taskFn = backoff({
      attempts: 2,
      delayMs: (attempt, err) => {
        delays.push(attempt);
        return err ? 10 : 0;
      },
      shouldRetry: (err) => err instanceof Error,
    })(async () => {
      attempts += 1;
      if (attempts < 3) throw new Error("fail");
      return "ok";
    });

    const promise = taskFn();
    await vi.advanceTimersByTimeAsync(20);
    await expect(promise).resolves.toBe("ok");
    expect(delays).toEqual([1, 2]);
    vi.useRealTimers();
  });

  it("debounce only runs the last call and rejects earlier calls", async () => {
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

  it("throttle reuses in-flight promise within the window", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00.000Z"));

    const deferred = createDeferred<string>();
    const taskFn = vi.fn(() => deferred.promise);
    const throttled = throttle<string>({ windowMs: 100 })(taskFn);

    const first = throttled();
    const second = throttled();

    await flushMicrotasks();

    expect(first).toBe(second);
    expect(taskFn).toHaveBeenCalledTimes(1);

    deferred.resolve("ok");
    await first;

    vi.setSystemTime(new Date("2024-01-01T00:00:00.200Z"));
    const third = throttled();

    await flushMicrotasks();
    expect(taskFn).toHaveBeenCalledTimes(2);

    await third;
    vi.useRealTimers();
  });

  it("queue runs tasks in order with default concurrency", async () => {
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

  it("queue respects concurrency limits", async () => {
    const deferreds = [
      createDeferred<string>(),
      createDeferred<string>(),
      createDeferred<string>(),
    ];
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
    await expect(Promise.all([second, third])).resolves.toEqual([
      "two",
      "three",
    ]);
  });

  it("pipe composes functions left to right", () => {
    const result = pipe(
      1,
      (value) => value + 1,
      (value) => value * 3,
    );

    expect(result).toBe(6);
  });
});
