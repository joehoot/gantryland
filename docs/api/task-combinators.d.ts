// API baseline for @gantryland/task-combinators
import type { TaskFn } from "@gantryland/task";
/** Error thrown by `timeout(ms)` when execution exceeds the deadline. */
export declare class TimeoutError extends Error {
    constructor(message?: string);
}
/**
 * Transform a resolved value while preserving function args and error behavior.
 */
export declare const map: <T, U, Args extends unknown[] = []>(fn: (data: T) => U) => (taskFn: TaskFn<T, Args>) => TaskFn<U, Args>;
/**
 * Chain into another async step derived from the previous result.
 */
export declare const flatMap: <T, U, Args extends unknown[] = []>(fn: (data: T) => Promise<U>) => (taskFn: TaskFn<T, Args>) => TaskFn<U, Args>;
/**
 * Run a success-side effect and return the original value unchanged.
 */
export declare const tap: <T, Args extends unknown[] = []>(fn: (data: T) => void) => (taskFn: TaskFn<T, Args>) => TaskFn<T, Args>;
/**
 * Run an error-side effect for non-abort errors and rethrow.
 */
export declare const tapError: <T, Args extends unknown[] = []>(fn: (error: unknown) => void) => (taskFn: TaskFn<T, Args>) => TaskFn<T, Args>;
/**
 * Run a side effect only when cancellation is represented by `AbortError`.
 */
export declare const tapAbort: <T, Args extends unknown[] = []>(fn: (error: unknown) => void) => (taskFn: TaskFn<T, Args>) => TaskFn<T, Args>;
/**
 * Map non-abort errors to a new error instance.
 */
export declare const mapError: <T, Args extends unknown[] = []>(fn: (error: unknown) => Error) => (taskFn: TaskFn<T, Args>) => TaskFn<T, Args>;
/**
 * Recover from non-abort failures with a static, computed, or async fallback.
 */
export declare const catchError: <T, Args extends unknown[] = []>(fallback: T | Promise<T> | ((err: unknown) => T | Promise<T>)) => (taskFn: TaskFn<T, Args>) => TaskFn<T, Args>;
/**
 * Retry failed executions. `attempts` means retry count (not total attempts).
 */
export declare const retry: <T, Args extends unknown[] = []>(attempts: number, options?: {
    onRetry?: (err: unknown, attempt: number) => void;
}) => (taskFn: TaskFn<T, Args>) => TaskFn<T, Args>;
/**
 * Reject with `TimeoutError` if execution exceeds `ms`.
 *
 * This combinator does not abort underlying transport; it only controls
 * the returned promise boundary.
 */
export declare const timeout: <T, Args extends unknown[] = []>(ms: number) => (taskFn: TaskFn<T, Args>) => TaskFn<T, Args>;
/**
 * Run fallback only on timeout. Non-timeout errors are rethrown.
 */
export declare const timeoutWith: <T, Args extends unknown[] = []>(ms: number, fallback: TaskFn<T, Args>) => (taskFn: TaskFn<T, Args>) => TaskFn<T, Args>;
/**
 * Run task functions in parallel and resolve results as a tuple.
 */
export declare const zip: <T extends unknown[], Args extends unknown[] = []>(...taskFns: { [K in keyof T]: TaskFn<T[K], Args>; }) => TaskFn<T, Args>;
/**
 * Settle with the first task function to settle.
 */
export declare function race<T extends unknown[], Args extends unknown[] = []>(...taskFns: {
    [K in keyof T]: TaskFn<T[K], Args>;
}): TaskFn<T[number], Args>;
/**
 * Run task functions sequentially and resolve results as a tuple.
 */
export declare const sequence: <T extends unknown[], Args extends unknown[] = []>(...taskFns: { [K in keyof T]: TaskFn<T[K], Args>; }) => TaskFn<T, Args>;
type RetryWhenOptions = {
    maxAttempts?: number;
    delayMs?: (attempt: number, err: unknown) => number;
    onRetry?: (err: unknown, attempt: number) => void;
};
/**
 * Retry while `shouldRetry` resolves to true.
 */
export declare const retryWhen: <T, Args extends unknown[] = []>(shouldRetry: (err: unknown, attempt: number) => boolean | Promise<boolean>, options?: RetryWhenOptions) => (taskFn: TaskFn<T, Args>) => TaskFn<T, Args>;
type BackoffOptions = {
    attempts: number;
    delayMs: number | ((attempt: number, err: unknown) => number);
    shouldRetry?: (err: unknown) => boolean;
};
/**
 * Convenience wrapper over `retryWhen` with fixed/computed delay behavior.
 */
export declare const backoff: <T, Args extends unknown[] = []>(options: BackoffOptions) => (taskFn: TaskFn<T, Args>) => TaskFn<T, Args>;
/**
 * Debounce calls so only the latest call in the wait window executes.
 *
 * Superseded pending callers reject with `AbortError`.
 */
export declare const debounce: <T, Args extends unknown[] = []>(options: {
    waitMs: number;
}) => (taskFn: TaskFn<T, Args>) => TaskFn<T, Args>;
/**
 * Reuse the first in-window in-flight execution.
 */
export declare const throttle: <T, Args extends unknown[] = []>(options: {
    windowMs: number;
}) => (taskFn: TaskFn<T, Args>) => TaskFn<T, Args>;
/**
 * Queue executions with configurable concurrency (default `1`).
 */
export declare const queue: <T, Args extends unknown[] = []>(options?: {
    concurrency?: number;
}) => (taskFn: TaskFn<T, Args>) => TaskFn<T, Args>;
type AnyFn = (arg: any) => any;
type PipeResult<Input, Fns extends AnyFn[]> = Fns extends [] ? Input : Fns extends [(arg: Input) => infer R, ...infer Rest] ? Rest extends AnyFn[] ? PipeResult<R, Rest> : R : never;
/**
 * Compose functions left-to-right.
 */
export declare function pipe<T, Fns extends AnyFn[]>(initial: T, ...fns: Fns): PipeResult<T, Fns>;
export {};
//# sourceMappingURL=index.d.ts.map