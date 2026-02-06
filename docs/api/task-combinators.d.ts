// API baseline for @gantryland/task-combinators
import type { TaskFn } from "@gantryland/task";
/**
 * Error thrown when a task exceeds the timeout window.
 */
export declare class TimeoutError extends Error {
    constructor(message?: string);
}
/**
 * Transforms the resolved value of a TaskFn.
 * Propagates AbortError without modification.
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
export declare const map: <T, U, Args extends unknown[] = []>(fn: (data: T) => U) => (taskFn: TaskFn<T, Args>) => TaskFn<U, Args>;
/**
 * Chains to another async operation.
 * Passes the same AbortSignal to the inner function and rethrows AbortError.
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
export declare const flatMap: <T, U, Args extends unknown[] = []>(fn: (data: T, signal?: AbortSignal) => Promise<U>) => (taskFn: TaskFn<T, Args>) => TaskFn<U, Args>;
/**
 * Executes a side effect on success without modifying the data.
 * Propagates AbortError without modification.
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
export declare const tap: <T, Args extends unknown[] = []>(fn: (data: T) => void) => (taskFn: TaskFn<T, Args>) => TaskFn<T, Args>;
/**
 * Executes a side effect on error without modifying the error type.
 * Skips AbortError to avoid logging/reporting cancellations.
 * Normalizes non-Error throws before rethrowing.
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
export declare const tapError: <T, Args extends unknown[] = []>(fn: (error: unknown) => void) => (taskFn: TaskFn<T, Args>) => TaskFn<T, Args>;
/**
 * Executes a side effect on AbortError without modifying the error.
 * Normalizes non-AbortError throws before rethrowing.
 *
 * @template T - The data type
 * @param fn - Side effect function for abort handling
 * @returns A combinator that performs the side effect and rethrows
 */
export declare const tapAbort: <T, Args extends unknown[] = []>(fn: (error: unknown) => void) => (taskFn: TaskFn<T, Args>) => TaskFn<T, Args>;
/**
 * Transforms an error before rethrowing. Useful for wrapping errors
 * in custom error classes. Skips AbortError.
 * Does not normalize non-Error throws before calling fn.
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
export declare const mapError: <T, Args extends unknown[] = []>(fn: (error: unknown) => Error) => (taskFn: TaskFn<T, Args>) => TaskFn<T, Args>;
/**
 * Recovers from errors with a fallback value or promise.
 * Skips AbortError so cancellations propagate.
 *
 * @template T - The data type
 * @param fallback - A value, promise, or function that computes the fallback
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
 *
 * // Async fallback
 * pipe(fetchUsers, catchError(async (err) => {
 *   await reportError(err);
 *   return await loadCachedUsers();
 * }))
 * ```
 */
export declare const catchError: <T, Args extends unknown[] = []>(fallback: T | Promise<T> | ((err: unknown) => T | Promise<T>)) => (taskFn: TaskFn<T, Args>) => TaskFn<T, Args>;
/**
 * Retries on failure. `retry(2)` means 3 total attempts (1 + 2 retries).
 * Checks the abort signal between attempts and rethrows AbortError.
 * Negative attempts are treated as 0.
 *
 * @template T - The data type
 * @param attempts - Number of retry attempts (not total attempts)
 * @param options - Optional hooks for retry behavior
 * @returns A combinator that retries the TaskFn on failure
 *
 * @example
 * ```typescript
 * pipe(
 *   fetchUsers,
 *   retry(2), // 3 total attempts
 *   retry(2, { onRetry: (err, attempt) => console.warn('retry', attempt, err) }),
 *   timeout(5000)
 * )
 * ```
 */
export declare const retry: <T, Args extends unknown[] = []>(attempts: number, options?: {
    onRetry?: (err: unknown, attempt: number) => void;
}) => (taskFn: TaskFn<T, Args>) => TaskFn<T, Args>;
/**
 * Fails if the TaskFn doesn't resolve within the specified duration.
 * Does not abort the underlying task. Propagates AbortError.
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
export declare const timeout: <T, Args extends unknown[] = []>(ms: number) => (taskFn: TaskFn<T, Args>) => TaskFn<T, Args>;
/**
 * Fails if the TaskFn doesn't resolve within the specified duration.
 * Aborts the underlying task on timeout and propagates AbortError.
 *
 * If the task rejects with AbortError due to the timeout, the combinator
 * normalizes this to TimeoutError for consistent handling.
 * Normalizes non-Error throws before rethrowing.
 */
export declare const timeoutAbort: <T, Args extends unknown[] = []>(ms: number) => (taskFn: TaskFn<T, Args>) => TaskFn<T, Args>;
/**
 * Fails after the specified duration, then runs a fallback TaskFn.
 * Does not abort the original task. AbortError is rethrown.
 * Normalizes non-Error throws before rethrowing.
 *
 * @template T - The data type
 * @param ms - Timeout in milliseconds
 * @param fallback - TaskFn to run on timeout
 * @returns A combinator that resolves with the original or fallback result
 */
export declare const timeoutWith: <T, Args extends unknown[] = []>(ms: number, fallback: TaskFn<T, Args>) => (taskFn: TaskFn<T, Args>) => TaskFn<T, Args>;
/**
 * Runs TaskFns in parallel and resolves with a tuple of results.
 * Passes the same AbortSignal to each TaskFn and propagates AbortError.
 */
export declare const zip: <T extends unknown[], Args extends unknown[] = []>(...taskFns: { [K in keyof T]: TaskFn<T[K], Args>; }) => TaskFn<T, Args>;
/**
 * Runs TaskFns in parallel and resolves with an array of results.
 * Passes the same AbortSignal to each TaskFn and propagates AbortError.
 */
export declare function all<T, Args extends unknown[] = []>(taskFns: TaskFn<T, Args>[]): TaskFn<T[], Args>;
export declare function all<T extends readonly unknown[], Args extends unknown[] = []>(taskFns: {
    [K in keyof T]: TaskFn<T[K], Args>;
}): TaskFn<T, Args>;
/**
 * Resolves or rejects with the first TaskFn to settle.
 * Passes the same AbortSignal to each TaskFn and propagates AbortError.
 */
export declare function race<T, Args extends unknown[] = []>(taskFns: TaskFn<T, Args>[]): TaskFn<T, Args>;
export declare function race<T extends unknown[], Args extends unknown[] = []>(...taskFns: {
    [K in keyof T]: TaskFn<T[K], Args>;
}): TaskFn<T[number], Args>;
/**
 * Runs TaskFns sequentially and resolves with all results.
 * Checks the AbortSignal before each run and propagates AbortError.
 */
export declare const sequence: <T extends unknown[], Args extends unknown[] = []>(...taskFns: { [K in keyof T]: TaskFn<T[K], Args>; }) => TaskFn<T, Args>;
/**
 * Defers creation of a TaskFn until run time.
 * Passes through AbortSignal and propagates AbortError.
 */
export declare const defer: <T, Args extends unknown[] = []>(factory: () => TaskFn<T, Args>) => TaskFn<T, Args>;
type RetryWhenOptions = {
    maxAttempts?: number;
    delayMs?: (attempt: number, err: unknown) => number;
    onRetry?: (err: unknown, attempt: number) => void;
};
/**
 * Retries while the predicate returns true.
 * Skips AbortError and respects aborts during delay.
 * Optional onRetry is called before any delay.
 */
export declare const retryWhen: <T, Args extends unknown[] = []>(shouldRetry: (err: unknown, attempt: number) => boolean | Promise<boolean>, options?: RetryWhenOptions) => (taskFn: TaskFn<T, Args>) => TaskFn<T, Args>;
type BackoffOptions = {
    attempts: number;
    delayMs: number | ((attempt: number, err: unknown) => number);
    shouldRetry?: (err: unknown) => boolean;
};
/**
 * Retries with a fixed or computed delay between attempts.
 * Skips AbortError and respects aborts during delay.
 */
export declare const backoff: <T, Args extends unknown[] = []>(options: BackoffOptions) => (taskFn: TaskFn<T, Args>) => TaskFn<T, Args>;
/**
 * Composes functions left to right. Pass a value and a series of
 * functions to transform it through.
 * Abort behavior depends on the composed functions.
 *
 * @param initial - The initial value (typically a TaskFn)
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
type PipeResult<Input, Fns extends AnyFn[]> = Fns extends [] ? Input : Fns extends [(arg: Input) => infer R, ...infer Rest] ? Rest extends AnyFn[] ? PipeResult<R, Rest> : R : never;
export declare function pipe<T, Fns extends AnyFn[]>(initial: T, ...fns: Fns): PipeResult<T, Fns>;
export {};
//# sourceMappingURL=index.d.ts.map