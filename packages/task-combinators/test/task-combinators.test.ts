import { describe, expect, it, vi } from "vitest";
import {
  TimeoutError,
  all,
  backoff,
  catchError,
  defer,
  flatMap,
  map,
  mapError,
  pipe,
  race,
  retry,
  retryWhen,
  sequence,
  tap,
  tapAbort,
  tapError,
  timeout,
  timeoutAbort,
  timeoutWith,
  zip,
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

const createAbortError = () => Object.assign(new Error("Aborted"), { name: "AbortError" });

describe("task-combinators", () => {
  it("map transforms resolved data", async () => {
    const taskFn = map((value: number) => value * 2)(async () => 2);
    await expect(taskFn()).resolves.toBe(4);
  });

  it("flatMap passes data and signal", async () => {
    const signalSeen: Array<AbortSignal | undefined> = [];
    const taskFn = flatMap((value: string, signal?: AbortSignal) => {
      signalSeen.push(signal);
      return Promise.resolve(value.toUpperCase());
    })(async (signal) => {
      signalSeen.push(signal);
      return "ok";
    });

    const controller = new AbortController();
    await expect(taskFn(controller.signal)).resolves.toBe("OK");
    expect(signalSeen[0]).toBe(controller.signal);
    expect(signalSeen[1]).toBe(controller.signal);
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

  it("tapError normalizes non-Error throws", async () => {
    const errors: unknown[] = [];
    const taskFn = tapError((error) => errors.push(error))(async () => {
      throw "boom";
    });

    await expect(taskFn()).rejects.toMatchObject({ message: "boom" });
    expect(errors).toEqual(["boom"]);
  });

  it("tapError skips AbortError", async () => {
    const errors: unknown[] = [];
    const taskFn = tapError((error) => errors.push(error))(async () => {
      throw createAbortError();
    });

    await expect(taskFn()).rejects.toMatchObject({ name: "AbortError" });
    expect(errors).toEqual([]);
  });

  it("tapAbort runs only on AbortError", async () => {
    const errors: unknown[] = [];
    const taskFn = tapAbort((error) => errors.push(error))(async () => {
      throw createAbortError();
    });

    await expect(taskFn()).rejects.toMatchObject({ name: "AbortError" });
    expect(errors).toHaveLength(1);
  });

  it("tapAbort normalizes non-AbortError throws", async () => {
    const errors: unknown[] = [];
    const taskFn = tapAbort((error) => errors.push(error))(async () => {
      throw "boom";
    });

    await expect(taskFn()).rejects.toMatchObject({ message: "boom" });
    expect(errors).toEqual([]);
  });

  it("mapError transforms non-abort errors", async () => {
    const taskFn = mapError(() => new Error("wrapped"))(async () => {
      throw new Error("boom");
    });

    await expect(taskFn()).rejects.toMatchObject({ message: "wrapped" });
  });

  it("mapError skips AbortError", async () => {
    const taskFn = mapError(() => new Error("wrapped"))(async () => {
      throw createAbortError();
    });

    await expect(taskFn()).rejects.toMatchObject({ name: "AbortError" });
  });

  it("catchError returns fallback value or function result", async () => {
    const taskFn = catchError((err) => `fallback:${(err as Error).message}`)(async () => {
      throw new Error("boom");
    });

    await expect(taskFn()).resolves.toBe("fallback:boom");
  });

  it("catchError supports async fallbacks", async () => {
    const taskFn = catchError(async (err) => `async:${(err as Error).message}`)(async () => {
      throw new Error("boom");
    });

    await expect(taskFn()).resolves.toBe("async:boom");
  });

  it("catchError skips AbortError", async () => {
    const taskFn = catchError("fallback")(async () => {
      throw createAbortError();
    });

    await expect(taskFn()).rejects.toMatchObject({ name: "AbortError" });
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

  it("retry calls onRetry for each failure", async () => {
    const errors: unknown[] = [];
    let attempts = 0;
    const taskFn = retry(2, {
      onRetry: (err) => errors.push(err),
    })(async () => {
      attempts += 1;
      if (attempts < 3) throw new Error("fail");
      return "ok";
    });

    await expect(taskFn()).resolves.toBe("ok");
    expect(errors).toHaveLength(2);
  });

  it("retry treats negative attempts as zero", async () => {
    let attempts = 0;
    const taskFn = retry(-2)(async () => {
      attempts += 1;
      throw new Error("fail");
    });

    await expect(taskFn()).rejects.toMatchObject({ message: "fail" });
    expect(attempts).toBe(1);
  });

  it("retry normalizes non-Error throws", async () => {
    let attempts = 0;
    const taskFn = retry(1)(async () => {
      attempts += 1;
      throw "boom";
    });

    await expect(taskFn()).rejects.toMatchObject({ message: "boom" });
    expect(attempts).toBe(2);
  });

  it("retry skips AbortError", async () => {
    let attempts = 0;
    const taskFn = retry(2)(async () => {
      attempts += 1;
      throw createAbortError();
    });

    await expect(taskFn()).rejects.toMatchObject({ name: "AbortError" });
    expect(attempts).toBe(1);
  });

  it("timeout resolves before the deadline", async () => {
    vi.useFakeTimers();
    const taskFn = timeout(50)(async () => "ok");
    const promise = taskFn();
    await vi.advanceTimersByTimeAsync(10);
    await expect(promise).resolves.toBe("ok");
    vi.useRealTimers();
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

  it("timeout normalizes non-Error throws", async () => {
    const taskFn = timeout(20)(async () => {
      throw "boom";
    });

    await expect(taskFn()).rejects.toMatchObject({ message: "boom" });
  });

  it("timeout does not abort the underlying task", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    let sawAbort = false;
    const deferred = createDeferred<string>();
    const taskFn = timeout(10)(async (signal) => {
      signal?.addEventListener("abort", () => {
        sawAbort = true;
      });
      return deferred.promise;
    });

    const promise = taskFn(controller.signal);
    const rejection = expect(promise).rejects.toBeInstanceOf(TimeoutError);
    await vi.advanceTimersByTimeAsync(10);
    await rejection;
    expect(sawAbort).toBe(false);
    deferred.resolve("late");
    vi.useRealTimers();
  });

  it("timeoutAbort aborts the task and rejects with TimeoutError", async () => {
    vi.useFakeTimers();
    const taskFn = timeoutAbort(10)(async (signal) => {
      return new Promise<string>((_, reject) => {
        signal?.addEventListener("abort", () => reject(createAbortError()), { once: true });
      });
    });

    const promise = taskFn();
    const rejection = expect(promise).rejects.toBeInstanceOf(TimeoutError);
    await vi.advanceTimersByTimeAsync(10);
    await rejection;
    vi.useRealTimers();
  });

  it("timeoutAbort normalizes non-Error throws", async () => {
    const taskFn = timeoutAbort(10)(async () => {
      throw "boom";
    });

    await expect(taskFn()).rejects.toMatchObject({ message: "boom" });
  });

  it("timeoutAbort propagates external abort", async () => {
    const controller = new AbortController();
    const taskFn = timeoutAbort(10)(async (signal) => {
      return new Promise<string>((_, reject) => {
        signal?.addEventListener("abort", () => reject(createAbortError()), { once: true });
      });
    });

    const promise = taskFn(controller.signal);
    controller.abort();

    await expect(promise).rejects.toMatchObject({ name: "AbortError" });
  });

  it("timeout rejects with AbortError when aborted", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const taskFn = timeout(50)(async () => new Promise(() => {}));
    const promise = taskFn(controller.signal);
    controller.abort();
    await vi.runAllTicks();
    await expect(promise).rejects.toMatchObject({ name: "AbortError" });
    vi.useRealTimers();
  });

  it("timeoutWith runs fallback on timeout", async () => {
    vi.useFakeTimers();
    const taskFn = timeoutWith(10, async () => "fallback")(async () => new Promise(() => {}));
    const promise = taskFn();
    await vi.advanceTimersByTimeAsync(10);
    await expect(promise).resolves.toBe("fallback");
    vi.useRealTimers();
  });

  it("timeoutWith skips AbortError", async () => {
    const controller = new AbortController();
    const taskFn = timeoutWith(10, async () => "fallback")(async (signal) => {
      return new Promise<string>((_, reject) => {
        signal?.addEventListener("abort", () => reject(createAbortError()), { once: true });
      });
    });

    const promise = taskFn(controller.signal);
    controller.abort();

    await expect(promise).rejects.toMatchObject({ name: "AbortError" });
  });

  it("timeoutWith rethrows non-timeout errors", async () => {
    const taskFn = timeoutWith(10, async () => "fallback")(async () => {
      throw new Error("boom");
    });

    await expect(taskFn()).rejects.toMatchObject({ message: "boom" });
  });

  it("timeoutWith normalizes non-Error throws", async () => {
    const taskFn = timeoutWith(10, async () => "fallback")(async () => {
      throw "boom";
    });

    await expect(taskFn()).rejects.toMatchObject({ message: "boom" });
  });

  it("zip runs tasks in parallel and preserves order", async () => {
    const taskFn = zip(
      async () => 1,
      async () => "two",
      async () => true
    );

    await expect(taskFn()).resolves.toEqual([1, "two", true]);
  });

  it("zip propagates AbortError", async () => {
    const controller = new AbortController();
    controller.abort();
    const taskFn = zip(async (signal) => {
      if (signal?.aborted) throw createAbortError();
      return 1;
    });

    await expect(taskFn(controller.signal)).rejects.toMatchObject({ name: "AbortError" });
  });

  it("all runs tasks in parallel and preserves order", async () => {
    const taskFn = all([async () => 1, async () => 2, async () => 3]);
    await expect(taskFn()).resolves.toEqual([1, 2, 3]);
  });

  it("all propagates AbortError", async () => {
    const controller = new AbortController();
    controller.abort();
    const taskFn = all([
      async (signal) => {
        if (signal?.aborted) throw createAbortError();
        return 1;
      },
    ]);

    await expect(taskFn(controller.signal)).rejects.toMatchObject({ name: "AbortError" });
  });

  it("race resolves with the first settled task", async () => {
    const first = createDeferred<string>();
    const second = createDeferred<string>();
    const taskFn = race(() => first.promise, () => second.promise);

    const promise = taskFn();
    second.resolve("second");
    await expect(promise).resolves.toBe("second");
  });

  it("race propagates AbortError", async () => {
    const controller = new AbortController();
    controller.abort();
    const taskFn = race(async (signal) => {
      if (signal?.aborted) throw createAbortError();
      return "ok";
    });

    await expect(taskFn(controller.signal)).rejects.toMatchObject({ name: "AbortError" });
  });

  it("race accepts an array of task functions", async () => {
    const first = createDeferred<string>();
    const second = createDeferred<string>();
    const taskFn = race([() => first.promise, () => second.promise]);

    const promise = taskFn();
    first.resolve("first");
    await expect(promise).resolves.toBe("first");
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
      }
    );

    await expect(taskFn()).resolves.toEqual([1, 2]);
    expect(calls).toEqual(["first", "second"]);
  });

  it("sequence propagates AbortError before starting", async () => {
    const controller = new AbortController();
    controller.abort();
    const taskFn = sequence(async (signal) => {
      if (signal?.aborted) throw createAbortError();
      return 1;
    });

    await expect(taskFn(controller.signal)).rejects.toMatchObject({ name: "AbortError" });
  });

  it("defer creates a task function at call time", async () => {
    let created = 0;
    const taskFn = defer(() => {
      created += 1;
      return async () => created;
    });

    await expect(taskFn()).resolves.toBe(1);
    await expect(taskFn()).resolves.toBe(2);
  });


  it("retryWhen retries based on predicate and respects maxAttempts", async () => {
    let attempts = 0;
    const taskFn = retryWhen(
      () => true,
      { maxAttempts: 2 }
    )(async () => {
      attempts += 1;
      if (attempts < 3) throw new Error("fail");
      return "ok";
    });

    await expect(taskFn()).resolves.toBe("ok");
    expect(attempts).toBe(3);
  });

  it("retryWhen calls onRetry when retrying", async () => {
    const errors: unknown[] = [];
    let attempts = 0;
    const taskFn = retryWhen(
      () => true,
      { maxAttempts: 2, onRetry: (err) => errors.push(err) }
    )(async () => {
      attempts += 1;
      if (attempts < 3) throw new Error("fail");
      return "ok";
    });

    await expect(taskFn()).resolves.toBe("ok");
    expect(errors).toHaveLength(2);
  });

  it("retryWhen stops when predicate returns false", async () => {
    let attempts = 0;
    const taskFn = retryWhen(() => false)(async () => {
      attempts += 1;
      throw new Error("fail");
    });

    await expect(taskFn()).rejects.toMatchObject({ message: "fail" });
    expect(attempts).toBe(1);
  });

  it("retryWhen supports delay and abort", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const taskFn = retryWhen(
      () => true,
      { delayMs: () => 50 }
    )(async () => {
      throw new Error("fail");
    });

    const promise = taskFn(controller.signal);
    const rejection = expect(promise).rejects.toMatchObject({ name: "AbortError" });
    await Promise.resolve();
    controller.abort();
    await vi.advanceTimersByTimeAsync(50);
    await rejection;
    vi.useRealTimers();
  });

  it("retryWhen normalizes non-Error throws", async () => {
    const taskFn = retryWhen(() => false)(async () => {
      throw "boom";
    });

    await expect(taskFn()).rejects.toMatchObject({ message: "boom" });
  });

  it("retryWhen treats negative maxAttempts as zero", async () => {
    let attempts = 0;
    const taskFn = retryWhen(
      () => true,
      { maxAttempts: -1 }
    )(async () => {
      attempts += 1;
      throw new Error("fail");
    });

    await expect(taskFn()).rejects.toMatchObject({ message: "fail" });
    expect(attempts).toBe(1);
  });

  it("backoff applies delay and shouldRetry logic", async () => {
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

  it("backoff propagates AbortError during delay", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const taskFn = backoff({
      attempts: 2,
      delayMs: 50,
    })(async () => {
      throw new Error("fail");
    });

    const promise = taskFn(controller.signal);
    const rejection = expect(promise).rejects.toMatchObject({ name: "AbortError" });
    await Promise.resolve();
    controller.abort();
    await vi.advanceTimersByTimeAsync(50);
    await rejection;
    vi.useRealTimers();
  });

  it("pipe composes functions left to right", () => {
    const result = pipe(
      1,
      (value) => value + 1,
      (value) => value * 3
    );

    expect(result).toBe(6);
  });
});
