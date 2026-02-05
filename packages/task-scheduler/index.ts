import type { Task, TaskFn } from "@gantryland/task";

/**
 * Options for polling a Task instance.
 */
export type PollOptions = {
  intervalMs: number;
  immediate?: boolean;
};

/**
 * Options for debouncing a TaskFn.
 */
export type DebounceOptions = {
  waitMs: number;
};

/**
 * Options for throttling a TaskFn.
 */
export type ThrottleOptions = {
  windowMs: number;
};

/**
 * Options for queueing a TaskFn.
 */
export type QueueOptions = {
  concurrency?: number;
};

/**
 * Start polling a Task on an interval. Returns a stop function.
 */
export const pollTask = <T, Args extends unknown[] = []>(
  task: Task<T, Args>,
  options: PollOptions,
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
 * Debounce a TaskFn. Only the last call within the window executes.
 */
export const debounce =
  <T, Args extends unknown[] = []>(options: DebounceOptions) =>
  (taskFn: TaskFn<T, Args>): TaskFn<T, Args> => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let pendingRejects: Array<(err: Error) => void> = [];
    let pendingCleanups: Array<() => void> = [];
    let lastSignal: AbortSignal | undefined;
    let lastArgs: Args = [] as unknown as Args;

    return (signal?: AbortSignal, ...args: Args) => {
      lastSignal = signal;
      lastArgs = args;
      if (timer) clearTimeout(timer);

      for (const reject of pendingRejects) reject(createAbortError());
      for (const cleanup of pendingCleanups) cleanup();
      pendingRejects = [];
      pendingCleanups = [];

      return new Promise<T>((resolve, reject) => {
        pendingRejects.push(reject);
        const onAbort = () => reject(createAbortError());
        signal?.addEventListener("abort", onAbort, { once: true });
        pendingCleanups.push(() => signal?.removeEventListener("abort", onAbort));

        timer = setTimeout(() => {
          timer = null;
          signal?.removeEventListener("abort", onAbort);
          const activeSignal = lastSignal;
          const activeArgs = lastArgs;
          if (activeSignal?.aborted) {
            reject(createAbortError());
            return;
          }
          void taskFn(activeSignal, ...activeArgs)
            .then(resolve)
            .catch(reject)
            .finally(() => {
              pendingRejects = [];
            });
        }, options.waitMs);
      });
    };
  };

/**
 * Throttle a TaskFn. Executes at most once per window.
 */
export const throttle =
  <T, Args extends unknown[] = []>(options: ThrottleOptions) =>
  (taskFn: TaskFn<T, Args>): TaskFn<T, Args> => {
    let lastRun = 0;
    let inFlight: Promise<T> | null = null;

    return (signal?: AbortSignal, ...args: Args) => {
      const now = Date.now();
      if (inFlight && now - lastRun < options.windowMs) return inFlight;

      lastRun = now;
      inFlight = taskFn(signal, ...args).finally(() => {
        inFlight = null;
      });

      return inFlight;
    };
  };

/**
 * Queue a TaskFn with limited concurrency.
 */
export const queue =
  <T, Args extends unknown[] = []>(options: QueueOptions = {}) =>
  (taskFn: TaskFn<T, Args>): TaskFn<T, Args> => {
    const concurrency = Math.max(1, options.concurrency ?? 1);
    const pending: Array<() => void> = [];
    let active = 0;

    const runNext = () => {
      if (active >= concurrency) return;
      const next = pending.shift();
      if (!next) return;
      next();
    };

    return (signal?: AbortSignal, ...args: Args) =>
      new Promise<T>((resolve, reject) => {
        const onAbort = () => reject(createAbortError());
        signal?.addEventListener("abort", onAbort, { once: true });

        const start = () => {
          if (signal?.aborted) {
            signal?.removeEventListener("abort", onAbort);
            reject(createAbortError());
            return;
          }
          active += 1;
          void taskFn(signal, ...args)
            .then(resolve)
            .catch(reject)
            .finally(() => {
              signal?.removeEventListener("abort", onAbort);
              active -= 1;
              runNext();
            });
        };

        pending.push(start);
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
