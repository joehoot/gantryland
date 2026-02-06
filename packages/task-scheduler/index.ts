import type { Task, TaskFn } from "@gantryland/task";

/**
 * Poll a Task on a fixed interval.
 *
 * Calls `task.run(...args)` on every tick. If `immediate` is false, the first
 * run waits for the interval. If `task.run` throws, polling stops because the
 * thrown error rejects the current tick.
 *
 * @template T - Resolved data type.
 * @template Args - Arguments forwarded to task.run.
 * @param task - Task instance to poll.
 * @param options - Polling configuration.
 * @param args - Arguments forwarded to task.run.
 * @returns A stop function that cancels future ticks.
 *
 * @example
 * ```typescript
 * const task = new Task(fetchStatus);
 * const stop = pollTask(task, { intervalMs: 5000, immediate: true });
 * // later
 * stop();
 * ```
 */
export const pollTask = <T, Args extends unknown[] = []>(
  task: Task<T, Args>,
  options: { intervalMs: number; immediate?: boolean },
  ...args: Args
): (() => void) => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;

  const clear = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  const tick = async () => {
    if (stopped) return;
    await task.run(...args);
    if (stopped) return;
    timer = setTimeout(tick, options.intervalMs);
  };

  if (options.immediate !== false) void tick();
  else timer = setTimeout(tick, options.intervalMs);

  return () => {
    stopped = true;
    clear();
  };
};

/**
 * Debounce a TaskFn so only the last call within the window executes.
 *
 * Superseded calls reject with AbortError. The latest signal and arguments are
 * used when the wait window elapses. If the latest signal aborts before
 * execution, the returned promise rejects with AbortError. If the TaskFn throws
 * synchronously, the returned promise rejects with that error.
 *
 * @template T - Resolved data type.
 * @template Args - Arguments forwarded to the TaskFn.
 * @param options - Debounce configuration.
 * @returns A combinator that wraps a TaskFn with debounce behavior.
 *
 * @example
 * ```typescript
 * const search = (signal: AbortSignal, query: string) =>
 *   fetch(`/api/search?q=${query}`, { signal }).then((r) => r.json());
 *
 * const debounced = pipe(search, debounce({ waitMs: 300 }));
 * ```
 */
export const debounce =
  <T, Args extends unknown[] = []>(options: { waitMs: number }) =>
  (taskFn: TaskFn<T, Args>): TaskFn<T, Args> => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let pendingReject: ((err: Error) => void) | null = null;
    let cleanupAbortListener: (() => void) | null = null;
    let callId = 0;
    let lastSignal: AbortSignal | undefined;
    let lastArgs: Args = [] as unknown as Args;

    const clearPending = () => {
      cleanupAbortListener?.();
      cleanupAbortListener = null;
      pendingReject = null;
    };

    return (signal?: AbortSignal, ...args: Args) => {
      callId += 1;
      const currentCallId = callId;
      lastSignal = signal;
      lastArgs = args;
      if (timer) clearTimeout(timer);

      pendingReject?.(createAbortError());
      clearPending();

      if (signal?.aborted) return Promise.reject(createAbortError());

      return new Promise<T>((resolve, reject) => {
        pendingReject = reject;
        const onAbort = () => {
          if (timer) {
            clearTimeout(timer);
            timer = null;
          }
          clearPending();
          reject(createAbortError());
        };
        signal?.addEventListener("abort", onAbort, { once: true });
        cleanupAbortListener = () =>
          signal?.removeEventListener("abort", onAbort);

        timer = setTimeout(() => {
          if (currentCallId !== callId) return;
          timer = null;
          cleanupAbortListener?.();
          cleanupAbortListener = null;
          const activeSignal = lastSignal;
          const activeArgs = lastArgs;
          if (activeSignal?.aborted) {
            clearPending();
            reject(createAbortError());
            return;
          }
          void Promise.resolve()
            .then(() => taskFn(activeSignal, ...activeArgs))
            .then(resolve)
            .catch(reject)
            .finally(() => {
              if (currentCallId === callId) {
                clearPending();
              }
            });
        }, options.waitMs);
      });
    };
  };

/**
 * Throttle a TaskFn so calls share one run per window.
 *
 * Calls within the window share the in-flight promise and ignore the new
 * signal and arguments (the first call's signal and args are used). If the
 * TaskFn runs longer than the window, a new call after the window starts a
 * concurrent run. If the TaskFn throws synchronously, the returned promise
 * rejects with that error.
 *
 * @template T - Resolved data type.
 * @template Args - Arguments forwarded to the TaskFn.
 * @param options - Throttle configuration.
 * @returns A combinator that wraps a TaskFn with throttle behavior.
 *
 * @example
 * ```typescript
 * const sendTelemetry = (signal?: AbortSignal) =>
 *   fetch("/api/telemetry", { method: "POST", signal }).then((r) => r.json());
 *
 * const throttled = pipe(sendTelemetry, throttle({ windowMs: 1000 }));
 * ```
 */
export const throttle =
  <T, Args extends unknown[] = []>(options: { windowMs: number }) =>
  (taskFn: TaskFn<T, Args>): TaskFn<T, Args> => {
    let lastRun = 0;
    let inFlight: Promise<T> | null = null;

    return (signal?: AbortSignal, ...args: Args) => {
      const now = Date.now();
      if (inFlight && now - lastRun < options.windowMs) return inFlight;

      lastRun = now;
      inFlight = Promise.resolve()
        .then(() => taskFn(signal, ...args))
        .finally(() => {
          inFlight = null;
        });

      return inFlight;
    };
  };

/**
 * Queue a TaskFn with limited concurrency.
 *
 * Calls execute in order with at most the configured concurrency. If an
 * AbortSignal fires before a run starts, the call is removed from the queue and
 * the returned promise rejects with AbortError. If the TaskFn throws
 * synchronously, the returned promise rejects with that error.
 *
 * @template T - Resolved data type.
 * @template Args - Arguments forwarded to the TaskFn.
 * @param options - Queue configuration.
 * @returns A combinator that wraps a TaskFn with queueing behavior.
 *
 * @example
 * ```typescript
 * const write = (signal: AbortSignal, payload: Payload) =>
 *   fetch("/api/write", {
 *     method: "POST",
 *     body: JSON.stringify(payload),
 *     signal,
 *   }).then((r) => r.json());
 *
 * const queued = pipe(write, queue({ concurrency: 2 }));
 * ```
 */
export const queue =
  <T, Args extends unknown[] = []>(options: { concurrency?: number } = {}) =>
  (taskFn: TaskFn<T, Args>): TaskFn<T, Args> => {
    const concurrency = Math.max(1, options.concurrency ?? 1);
    const pending: Array<{ start: () => void }> = [];
    let active = 0;

    const runNext = () => {
      if (active >= concurrency) return;
      const next = pending.shift();
      if (!next) return;
      next.start();
    };

    return (signal?: AbortSignal, ...args: Args) =>
      new Promise<T>((resolve, reject) => {
        let started = false;
        const entry = {
          start: () => {
            if (signal?.aborted) {
              signal?.removeEventListener("abort", onAbort);
              reject(createAbortError());
              runNext();
              return;
            }
            started = true;
            signal?.removeEventListener("abort", onAbort);
            active += 1;
            void Promise.resolve()
              .then(() => taskFn(signal, ...args))
              .then(resolve)
              .catch(reject)
              .finally(() => {
                active -= 1;
                runNext();
              });
          },
        };

        const onAbort = () => {
          if (started) return;
          const index = pending.indexOf(entry);
          if (index !== -1) {
            pending.splice(index, 1);
            signal?.removeEventListener("abort", onAbort);
            reject(createAbortError());
            runNext();
          } else {
            reject(createAbortError());
          }
        };

        if (signal?.aborted) {
          reject(createAbortError());
          return;
        }

        signal?.addEventListener("abort", onAbort, { once: true });
        pending.push(entry);
        runNext();
      });
  };

/**
 * Create an AbortError for environments without DOMException.
 */
const createAbortError = (): Error => {
  if (typeof DOMException !== "undefined") {
    return new DOMException("Aborted", "AbortError");
  }
  const error = new Error("Aborted");
  error.name = "AbortError";
  return error;
};
