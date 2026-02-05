import type { TaskFn } from "@gantryland/task";

const isAbortError = (err: unknown): boolean => {
  if (typeof DOMException !== "undefined" && err instanceof DOMException) {
    return err.name === "AbortError";
  }
  return (err as Error).name === "AbortError";
};

const createAbortError = (): Error => {
  if (typeof DOMException !== "undefined") {
    return new DOMException("Aborted", "AbortError");
  }
  const error = new Error("Aborted");
  error.name = "AbortError";
  return error;
};

const sleep = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(createAbortError());
      return;
    }

    let settled = false;
    const cleanup = () => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener("abort", onAbort);
    };

    const timer = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);

    const onAbort = () => {
      clearTimeout(timer);
      cleanup();
      reject(createAbortError());
    };

    signal?.addEventListener("abort", onAbort, { once: true });
  });

/**
 * Error thrown when a task exceeds the timeout window.
 */
export class TimeoutError extends Error {
  constructor(message = "Timeout") {
    super(message);
    this.name = "TimeoutError";
  }
}

// Combinators

/**
 * Transforms the result of a TaskFn.
 *
 * @template T - The input data type
 * @template U - The output data type
 * @param fn - Transform function applied to the resolved data
 * @returns A combinator that wraps a TaskFn with the transformation
 *
 * @example
 * ```typescript
 * pipe(
 *   fetchUsers,
 *   map((users) => users.filter((u) => u.active))
 * )
 * ```
 */
export const map =
  <T, U, Args extends unknown[] = []>(fn: (data: T) => U) =>
  (taskFn: TaskFn<T, Args>): TaskFn<U, Args> =>
  (signal?: AbortSignal, ...args: Args) =>
    taskFn(signal, ...args).then(fn);

/**
 * Chains to another async operation. The inner function receives the
 * abort signal for proper cancellation support.
 *
 * @template T - The input data type
 * @template U - The output data type
 * @param fn - Async function that receives the data and abort signal
 * @returns A combinator that chains async operations
 *
 * @example
 * ```typescript
 * pipe(
 *   fetchUser,
 *   flatMap((user, signal) => fetchUserPosts(user.id, signal))
 * )
 * ```
 */
export const flatMap =
  <T, U, Args extends unknown[] = []>(fn: (data: T, signal?: AbortSignal) => Promise<U>) =>
  (taskFn: TaskFn<T, Args>): TaskFn<U, Args> =>
  (signal?: AbortSignal, ...args: Args) =>
    taskFn(signal, ...args).then((data) => fn(data, signal));

/**
 * Executes a side effect on success without modifying the data.
 *
 * @template T - The data type
 * @param fn - Side effect function (logging, metrics, etc.)
 * @returns A combinator that performs the side effect and returns data unchanged
 *
 * @example
 * ```typescript
 * pipe(
 *   fetchUsers,
 *   tap((users) => console.log(`Fetched ${users.length} users`))
 * )
 * ```
 */
export const tap =
  <T, Args extends unknown[] = []>(fn: (data: T) => void) =>
  (taskFn: TaskFn<T, Args>): TaskFn<T, Args> =>
  (signal?: AbortSignal, ...args: Args) =>
    taskFn(signal, ...args).then((data) => {
      fn(data);
      return data;
    });

/**
 * Executes a side effect on error without modifying the error.
 * Skips AbortError to avoid logging/reporting cancellations.
 * Always rethrows the error.
 *
 * @template T - The data type
 * @param fn - Side effect function for error handling (logging, reporting, etc.)
 * @returns A combinator that performs the side effect and rethrows
 *
 * @example
 * ```typescript
 * pipe(
 *   fetchUsers,
 *   tapError((err) => reportError(err)),
 *   tapError((err) => console.error('Failed:', err))
 * )
 * ```
 */
export const tapError =
  <T, Args extends unknown[] = []>(fn: (error: unknown) => void) =>
  (taskFn: TaskFn<T, Args>): TaskFn<T, Args> =>
  (signal?: AbortSignal, ...args: Args) =>
    taskFn(signal, ...args).catch((err) => {
      if (!isAbortError(err)) fn(err);
      throw err;
    });

/**
 * Executes a side effect on AbortError without modifying the error.
 * Always rethrows the error.
 *
 * @template T - The data type
 * @param fn - Side effect function for abort handling
 * @returns A combinator that performs the side effect and rethrows
 */
export const tapAbort =
  <T, Args extends unknown[] = []>(fn: (error: unknown) => void) =>
  (taskFn: TaskFn<T, Args>): TaskFn<T, Args> =>
  (signal?: AbortSignal, ...args: Args) =>
    taskFn(signal, ...args).catch((err) => {
      if (isAbortError(err)) fn(err);
      throw err;
    });

/**
 * Transforms an error before rethrowing. Useful for wrapping errors
 * in custom error classes. Skips AbortError.
 *
 * @template T - The data type
 * @param fn - Function that transforms the error to an Error
 * @returns A combinator that transforms and rethrows the error
 *
 * @example
 * ```typescript
 * pipe(
 *   fetchUsers,
 *   mapError((err) => new ApiError('Failed to fetch users', { cause: err }))
 * )
 * ```
 */
export const mapError =
  <T, Args extends unknown[] = []>(fn: (error: unknown) => Error) =>
  (taskFn: TaskFn<T, Args>): TaskFn<T, Args> =>
  (signal?: AbortSignal, ...args: Args) =>
    taskFn(signal, ...args).catch((err) => {
      if (isAbortError(err)) throw err;
      throw fn(err);
    });

/**
 * Recovers from errors with a fallback value. Skips AbortError
 * (cancellations should propagate, not be caught).
 *
 * @template T - The data type
 * @param fallback - A value or function that computes the fallback
 * @returns A combinator that catches errors and returns the fallback
 *
 * @example
 * ```typescript
 * // Static fallback
 * pipe(fetchUsers, catchError([]))
 *
 * // Computed fallback
 * pipe(fetchUsers, catchError((err) => {
 *   console.warn('Using cached data due to:', err);
 *   return cachedUsers;
 * }))
 * ```
 */
export const catchError =
  <T, Args extends unknown[] = []>(
    fallback: T | Promise<T> | ((err: unknown) => T | Promise<T>),
  ) =>
  (taskFn: TaskFn<T, Args>): TaskFn<T, Args> =>
  async (signal?: AbortSignal, ...args: Args) => {
    try {
      return await taskFn(signal, ...args);
    } catch (err) {
      if (isAbortError(err)) throw err;
      return typeof fallback === "function"
        ? await (fallback as (err: unknown) => T | Promise<T>)(err)
        : await fallback;
    }
  };

/**
 * Retries on failure. `retry(2)` means 3 total attempts (1 + 2 retries).
 * Checks the abort signal between attempts. Skips retry on AbortError.
 * Negative attempts are treated as 0.
 *
 * @template T - The data type
 * @param attempts - Number of retry attempts (not total attempts)
 * @returns A combinator that retries the TaskFn on failure
 *
 * @example
 * ```typescript
 * pipe(
 *   fetchUsers,
 *   retry(2), // 3 total attempts
 *   timeout(5000)
 * )
 * ```
 */
export const retry =
  <T, Args extends unknown[] = []>(
    attempts: number,
    options: { onRetry?: (err: unknown, attempt: number) => void } = {},
  ) =>
  (taskFn: TaskFn<T, Args>): TaskFn<T, Args> =>
  async (signal?: AbortSignal, ...args: Args) => {
    const maxAttempts = Math.max(0, attempts);
    let lastError: unknown;
    for (let i = 0; i <= maxAttempts; i++) {
      if (signal?.aborted) throw createAbortError();
      try {
        return await taskFn(signal, ...args);
      } catch (err) {
        if (isAbortError(err)) throw err;
        options.onRetry?.(err, i + 1);
        lastError = err;
      }
    }
    throw lastError;
  };

/**
 * Fails if the TaskFn doesn't resolve within the specified duration.
 * Properly cleans up on abort and respects the abort signal.
 *
 * @template T - The data type
 * @param ms - Timeout in milliseconds
 * @returns A combinator that rejects with TimeoutError if exceeded
 *
 * @example
 * ```typescript
 * pipe(
 *   fetchUsers,
 *   timeout(5000), // 5 seconds
 *   catchError([]) // fallback on timeout
 * )
 * ```
 */
export const timeout =
  <T, Args extends unknown[] = []>(ms: number) =>
  (taskFn: TaskFn<T, Args>): TaskFn<T, Args> =>
  (signal?: AbortSignal, ...args: Args) =>
    new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(createAbortError());
        return;
      }

      const timer = setTimeout(() => {
        reject(new TimeoutError());
      }, ms);

      const onAbort = () => {
        clearTimeout(timer);
        reject(createAbortError());
      };

      signal?.addEventListener("abort", onAbort, { once: true });

      taskFn(signal, ...args)
        .then(resolve)
        .catch(reject)
        .finally(() => {
          clearTimeout(timer);
          signal?.removeEventListener("abort", onAbort);
        });
    });

/**
 * Fails if the TaskFn doesn't resolve within the specified duration.
 * Aborts the underlying task on timeout.
 */
export const timeoutAbort =
  <T, Args extends unknown[] = []>(ms: number) =>
  (taskFn: TaskFn<T, Args>): TaskFn<T, Args> =>
  (signal?: AbortSignal, ...args: Args) =>
    new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(createAbortError());
        return;
      }

      const controller = new AbortController();
      let settled = false;
      let timedOut = false;

      const finish = (fn: () => void) => {
        if (settled) return;
        settled = true;
        fn();
      };

      const onAbort = () => {
        controller.abort();
        finish(() => reject(createAbortError()));
      };

      const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
        finish(() => reject(new TimeoutError()));
      }, ms);

      signal?.addEventListener("abort", onAbort, { once: true });

      taskFn(controller.signal, ...args)
        .then((value) => finish(() => resolve(value)))
        .catch((err) => {
          if (timedOut && isAbortError(err)) {
            finish(() => reject(new TimeoutError()));
            return;
          }
          finish(() => reject(err));
        })
        .finally(() => {
          clearTimeout(timer);
          signal?.removeEventListener("abort", onAbort);
        });
    });

/**
 * Fails after the specified duration, then runs a fallback TaskFn.
 * Does not abort the original task.
 *
 * @template T - The data type
 * @param ms - Timeout in milliseconds
 * @param fallback - TaskFn to run on timeout
 * @returns A combinator that resolves with the original or fallback result
 */
export const timeoutWith =
  <T, Args extends unknown[] = []>(ms: number, fallback: TaskFn<T, Args>) =>
  (taskFn: TaskFn<T, Args>): TaskFn<T, Args> =>
  (signal?: AbortSignal, ...args: Args) =>
    timeout<T, Args>(ms)(taskFn)(signal, ...args).catch((err) => {
      if (isAbortError(err)) throw err;
      if (err instanceof TimeoutError) return fallback(signal, ...args);
      throw err;
    });

/**
 * Runs TaskFns in parallel and resolves with a tuple of results.
 */
export const zip =
  <T extends unknown[], Args extends unknown[] = []>(
    ...taskFns: { [K in keyof T]: TaskFn<T[K], Args> }
  ): TaskFn<T, Args> =>
  (signal?: AbortSignal, ...args: Args) =>
    Promise.all(taskFns.map((fn) => fn(signal, ...args))) as Promise<T>;

/**
 * Runs TaskFns in parallel and resolves with an array of results.
 */
export function all<T, Args extends unknown[] = []>(
  taskFns: TaskFn<T, Args>[]
): TaskFn<T[], Args>;
export function all<T extends readonly unknown[], Args extends unknown[] = []>(
  taskFns: { [K in keyof T]: TaskFn<T[K], Args> }
): TaskFn<T, Args>;
export function all<Args extends unknown[]>(
  taskFns: TaskFn<unknown, Args>[]
): TaskFn<unknown[], Args> {
  return (signal?: AbortSignal, ...args: Args) =>
    Promise.all(taskFns.map((fn) => fn(signal, ...args)));
}

/**
 * Resolves or rejects with the first TaskFn to settle.
 */
export function race<T, Args extends unknown[] = []>(
  taskFns: TaskFn<T, Args>[]
): TaskFn<T, Args>;
export function race<T extends unknown[], Args extends unknown[] = []>(
  ...taskFns: { [K in keyof T]: TaskFn<T[K], Args> }
): TaskFn<T[number], Args>;
export function race<Args extends unknown[]>(
  ...taskFnsOrArray: [TaskFn<unknown, Args>[]] | TaskFn<unknown, Args>[]
): TaskFn<unknown, Args> {
  const taskFns = (
    Array.isArray(taskFnsOrArray[0]) ? taskFnsOrArray[0] : taskFnsOrArray
  ) as TaskFn<unknown, Args>[];
  return (signal?: AbortSignal, ...args: Args) =>
    Promise.race(taskFns.map((fn) => fn(signal, ...args)));
}

/**
 * Runs TaskFns sequentially and resolves with all results.
 */
export const sequence =
  <T extends unknown[], Args extends unknown[] = []>(
    ...taskFns: { [K in keyof T]: TaskFn<T[K], Args> }
  ): TaskFn<T, Args> =>
  async (signal?: AbortSignal, ...args: Args) => {
    const results: unknown[] = [];
    for (const fn of taskFns) {
      if (signal?.aborted) throw createAbortError();
      results.push(await fn(signal, ...args));
    }
    return results as T;
  };

/**
 * Alias for sequence.
 */
export const concat = sequence;

/**
 * Defers creation of a TaskFn until run time.
 */
export const defer =
  <T, Args extends unknown[] = []>(factory: () => TaskFn<T, Args>): TaskFn<T, Args> =>
  (signal?: AbortSignal, ...args: Args) =>
    factory()(signal, ...args);

/**
 * Alias for defer.
 */
export const lazy = defer;

type RetryWhenOptions = {
  maxAttempts?: number;
  delayMs?: (attempt: number, err: unknown) => number;
  onRetry?: (err: unknown, attempt: number) => void;
};

/**
 * Retries while the predicate returns true. Skips AbortError.
 */
export const retryWhen =
  <T, Args extends unknown[] = []>(
    shouldRetry: (err: unknown, attempt: number) => boolean | Promise<boolean>,
    options: RetryWhenOptions = {},
  ) =>
  (taskFn: TaskFn<T, Args>): TaskFn<T, Args> =>
  async (signal?: AbortSignal, ...args: Args) => {
    const maxAttempts = Math.max(0, options.maxAttempts ?? Infinity);
    let attempt = 0;
    while (true) {
      if (signal?.aborted) throw createAbortError();
      try {
        return await taskFn(signal, ...args);
      } catch (err) {
        if (isAbortError(err)) throw err;
        attempt += 1;
        if (attempt > maxAttempts) throw err;
        const should = await shouldRetry(err, attempt);
        if (!should) throw err;
        options.onRetry?.(err, attempt);
        const delay = options.delayMs?.(attempt, err) ?? 0;
        if (delay > 0) await sleep(delay, signal);
      }
    }
  };

type BackoffOptions = {
  attempts: number;
  delayMs: number | ((attempt: number, err: unknown) => number);
  shouldRetry?: (err: unknown) => boolean;
};

/**
 * Retries with a fixed or computed delay between attempts.
 */
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

// Pipe

/**
 * Composes functions left to right. Pass a value and a series of
 * functions to transform it through.
 *
 * @param a - The initial value (typically a TaskFn)
 * @param fns - Functions to apply in sequence
 * @returns The result of piping through all functions
 *
 * @example
 * ```typescript
 * const fetchActiveUsers = pipe(
 *   (signal) => fetch('/api/users', { signal }).then(r => r.json()),
 *   map((users) => users.filter((u) => u.active)),
 *   retry(2),
 *   timeout(5000),
 *   tapError((err) => console.error(err)),
 *   catchError([])
 * );
 *
 * const task = new Task(fetchActiveUsers);
 * ```
 */
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
