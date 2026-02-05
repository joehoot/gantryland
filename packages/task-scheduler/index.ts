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
export const pollTask = <T>(task: Task<T>, options: PollOptions): (() => void) => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;

  const clear = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  const tick = async () => {
    if (stopped) return;
    await task.run();
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
  <T>(options: DebounceOptions) =>
  (taskFn: TaskFn<T>): TaskFn<T> => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let pendingRejects: Array<(err: Error) => void> = [];
    let pendingCleanups: Array<() => void> = [];
    let lastSignal: AbortSignal | undefined;

    return (signal?: AbortSignal) => {
      lastSignal = signal;
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
          if (activeSignal?.aborted) {
            reject(createAbortError());
            return;
          }
          void taskFn(activeSignal)
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
  <T>(options: ThrottleOptions) =>
  (taskFn: TaskFn<T>): TaskFn<T> => {
    let lastRun = 0;
    let inFlight: Promise<T> | null = null;

    return (signal?: AbortSignal) => {
      const now = Date.now();
      if (inFlight && now - lastRun < options.windowMs) return inFlight;

      lastRun = now;
      inFlight = taskFn(signal).finally(() => {
        inFlight = null;
      });

      return inFlight;
    };
  };

/**
 * Queue a TaskFn with limited concurrency.
 */
export const queue =
  <T>(options: QueueOptions = {}) =>
  (taskFn: TaskFn<T>): TaskFn<T> => {
    const concurrency = Math.max(1, options.concurrency ?? 1);
    const pending: Array<() => void> = [];
    let active = 0;

    const runNext = () => {
      if (active >= concurrency) return;
      const next = pending.shift();
      if (!next) return;
      next();
    };

    return (signal?: AbortSignal) =>
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
          void taskFn(signal)
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
