import type { TaskFn } from "@gantryland/task";

const isAbortError = (err: unknown): boolean =>
  (err instanceof Error && err.name === "AbortError") ||
  (typeof err === "object" &&
    err !== null &&
    "name" in err &&
    (err as { name?: unknown }).name === "AbortError");

const toError = (err: unknown): Error => {
  if (err instanceof Error) return err;
  return new Error(String(err));
};

const createAbortError = (): Error => {
  if (typeof DOMException !== "undefined") {
    return new DOMException("Aborted", "AbortError");
  }
  const error = new Error("Aborted");
  error.name = "AbortError";
  return error;
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export class TimeoutError extends Error {
  constructor(message = "Timeout") {
    super(message);
    this.name = "TimeoutError";
  }
}

export const map =
  <T, U, Args extends unknown[] = []>(fn: (data: T) => U) =>
  (taskFn: TaskFn<T, Args>): TaskFn<U, Args> =>
  (...args: Args) =>
    taskFn(...args).then(fn);

export const flatMap =
  <T, U, Args extends unknown[] = []>(fn: (data: T) => Promise<U>) =>
  (taskFn: TaskFn<T, Args>): TaskFn<U, Args> =>
  (...args: Args) =>
    taskFn(...args).then((data) => fn(data));

export const tap =
  <T, Args extends unknown[] = []>(fn: (data: T) => void) =>
  (taskFn: TaskFn<T, Args>): TaskFn<T, Args> =>
  (...args: Args) =>
    taskFn(...args).then((data) => {
      fn(data);
      return data;
    });

export const tapError =
  <T, Args extends unknown[] = []>(fn: (error: unknown) => void) =>
  (taskFn: TaskFn<T, Args>): TaskFn<T, Args> =>
  (...args: Args) =>
    taskFn(...args).catch((err) => {
      if (!isAbortError(err)) {
        fn(err);
        throw toError(err);
      }
      throw err;
    });

export const tapAbort =
  <T, Args extends unknown[] = []>(fn: (error: unknown) => void) =>
  (taskFn: TaskFn<T, Args>): TaskFn<T, Args> =>
  (...args: Args) =>
    taskFn(...args).catch((err) => {
      if (isAbortError(err)) {
        fn(err);
        throw err;
      }
      throw toError(err);
    });

export const mapError =
  <T, Args extends unknown[] = []>(fn: (error: unknown) => Error) =>
  (taskFn: TaskFn<T, Args>): TaskFn<T, Args> =>
  (...args: Args) =>
    taskFn(...args).catch((err) => {
      if (isAbortError(err)) throw err;
      throw fn(err);
    });

export const catchError =
  <T, Args extends unknown[] = []>(
    fallback: T | Promise<T> | ((err: unknown) => T | Promise<T>),
  ) =>
  (taskFn: TaskFn<T, Args>): TaskFn<T, Args> =>
  async (...args: Args) => {
    try {
      return await taskFn(...args);
    } catch (err) {
      if (isAbortError(err)) throw err;
      return typeof fallback === "function"
        ? await (fallback as (err: unknown) => T | Promise<T>)(err)
        : await fallback;
    }
  };

export const retry =
  <T, Args extends unknown[] = []>(
    attempts: number,
    options: { onRetry?: (err: unknown, attempt: number) => void } = {},
  ) =>
  (taskFn: TaskFn<T, Args>): TaskFn<T, Args> =>
  async (...args: Args) => {
    const maxAttempts = Math.max(0, attempts);
    let lastError: unknown;
    for (let i = 0; i <= maxAttempts; i++) {
      try {
        return await taskFn(...args);
      } catch (err) {
        if (isAbortError(err)) throw err;
        if (i < maxAttempts) {
          options.onRetry?.(err, i + 1);
        }
        lastError = err;
      }
    }
    throw toError(lastError);
  };

export const timeout =
  <T, Args extends unknown[] = []>(ms: number) =>
  (taskFn: TaskFn<T, Args>): TaskFn<T, Args> =>
  (...args: Args) =>
    new Promise((resolve, reject) => {
      let settled = false;
      const finish = (fn: () => void) => {
        if (settled) return;
        settled = true;
        fn();
        clearTimeout(timer);
      };

      const timer = setTimeout(() => {
        finish(() => reject(new TimeoutError()));
      }, ms);

      let runPromise: Promise<T>;
      try {
        runPromise = Promise.resolve(taskFn(...args));
      } catch (error) {
        runPromise = Promise.reject(error);
      }

      runPromise
        .then((value) => finish(() => resolve(value)))
        .catch((err) => {
          if (isAbortError(err)) {
            finish(() => reject(err));
            return;
          }
          finish(() => reject(toError(err)));
        });
    });

export const timeoutAbort =
  <T, Args extends unknown[] = []>(ms: number) =>
  (taskFn: TaskFn<T, Args>): TaskFn<T, Args> =>
    timeout<T, Args>(ms)(taskFn);

export const timeoutWith =
  <T, Args extends unknown[] = []>(ms: number, fallback: TaskFn<T, Args>) =>
  (taskFn: TaskFn<T, Args>): TaskFn<T, Args> =>
  (...args: Args) =>
    timeout<T, Args>(ms)(taskFn)(...args).catch((err) => {
      if (isAbortError(err)) throw err;
      if (err instanceof TimeoutError) return fallback(...args);
      throw toError(err);
    });

export const zip =
  <T extends unknown[], Args extends unknown[] = []>(
    ...taskFns: { [K in keyof T]: TaskFn<T[K], Args> }
  ): TaskFn<T, Args> =>
  (...args: Args) =>
    Promise.all(taskFns.map((fn) => fn(...args))) as Promise<T>;

export function race<T extends unknown[], Args extends unknown[] = []>(
  ...taskFns: { [K in keyof T]: TaskFn<T[K], Args> }
): TaskFn<T[number], Args>;
export function race<Args extends unknown[]>(
  ...taskFns: TaskFn<unknown, Args>[]
): TaskFn<unknown, Args> {
  return (...args: Args) => Promise.race(taskFns.map((fn) => fn(...args)));
}

export const sequence =
  <T extends unknown[], Args extends unknown[] = []>(
    ...taskFns: { [K in keyof T]: TaskFn<T[K], Args> }
  ): TaskFn<T, Args> =>
  async (...args: Args) => {
    const results: unknown[] = [];
    for (const fn of taskFns) {
      results.push(await fn(...args));
    }
    return results as T;
  };

type RetryWhenOptions = {
  maxAttempts?: number;
  delayMs?: (attempt: number, err: unknown) => number;
  onRetry?: (err: unknown, attempt: number) => void;
};

export const retryWhen =
  <T, Args extends unknown[] = []>(
    shouldRetry: (err: unknown, attempt: number) => boolean | Promise<boolean>,
    options: RetryWhenOptions = {},
  ) =>
  (taskFn: TaskFn<T, Args>): TaskFn<T, Args> =>
  async (...args: Args) => {
    const maxAttempts = Math.max(
      0,
      options.maxAttempts ?? Number.POSITIVE_INFINITY,
    );
    let attempt = 0;
    while (true) {
      try {
        return await taskFn(...args);
      } catch (err) {
        if (isAbortError(err)) throw err;
        attempt += 1;
        if (attempt > maxAttempts) throw toError(err);
        const should = await shouldRetry(err, attempt);
        if (!should) throw toError(err);
        options.onRetry?.(err, attempt);
        const delay = options.delayMs?.(attempt, err) ?? 0;
        if (delay > 0) await sleep(delay);
      }
    }
  };

type BackoffOptions = {
  attempts: number;
  delayMs: number | ((attempt: number, err: unknown) => number);
  shouldRetry?: (err: unknown) => boolean;
};

export const backoff =
  <T, Args extends unknown[] = []>(options: BackoffOptions) =>
  (taskFn: TaskFn<T, Args>): TaskFn<T, Args> =>
    retryWhen<T, Args>(
      (err) => (options.shouldRetry ? options.shouldRetry(err) : true),
      {
        maxAttempts: options.attempts,
        delayMs: (attempt, err) =>
          typeof options.delayMs === "function"
            ? options.delayMs(attempt, err)
            : options.delayMs,
      },
    )(taskFn);

export const debounce =
  <T, Args extends unknown[] = []>(options: { waitMs: number }) =>
  (taskFn: TaskFn<T, Args>): TaskFn<T, Args> => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let pendingReject: ((err: Error) => void) | null = null;
    let callId = 0;
    let lastArgs: Args = [] as unknown as Args;

    return (...args: Args) => {
      callId += 1;
      const currentCallId = callId;
      lastArgs = args;
      if (timer) clearTimeout(timer);

      pendingReject?.(createAbortError());
      pendingReject = null;

      return new Promise<T>((resolve, reject) => {
        pendingReject = reject;

        timer = setTimeout(() => {
          if (currentCallId !== callId) return;
          timer = null;
          void Promise.resolve()
            .then(() => taskFn(...lastArgs))
            .then(resolve)
            .catch(reject)
            .finally(() => {
              if (currentCallId === callId) {
                pendingReject = null;
              }
            });
        }, options.waitMs);
      });
    };
  };

export const throttle =
  <T, Args extends unknown[] = []>(options: { windowMs: number }) =>
  (taskFn: TaskFn<T, Args>): TaskFn<T, Args> => {
    let lastRun = 0;
    let inFlight: Promise<T> | null = null;

    return (...args: Args) => {
      const now = Date.now();
      if (inFlight && now - lastRun < options.windowMs) return inFlight;

      lastRun = now;
      inFlight = Promise.resolve()
        .then(() => taskFn(...args))
        .finally(() => {
          inFlight = null;
        });

      return inFlight;
    };
  };

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

    return (...args: Args) =>
      new Promise<T>((resolve, reject) => {
        const entry = {
          start: () => {
            active += 1;
            void Promise.resolve()
              .then(() => taskFn(...args))
              .then(resolve)
              .catch(reject)
              .finally(() => {
                active -= 1;
                runNext();
              });
          },
        };

        pending.push(entry);
        runNext();
      });
  };

type AnyFn = (arg: any) => any;

type PipeResult<Input, Fns extends AnyFn[]> = Fns extends []
  ? Input
  : Fns extends [(arg: Input) => infer R, ...infer Rest]
    ? Rest extends AnyFn[]
      ? PipeResult<R, Rest>
      : R
    : never;

export function pipe<T, Fns extends AnyFn[]>(
  initial: T,
  ...fns: Fns
): PipeResult<T, Fns>;
export function pipe(initial: unknown, ...fns: AnyFn[]): unknown {
  return fns.reduce((acc, fn) => fn(acc), initial);
}
