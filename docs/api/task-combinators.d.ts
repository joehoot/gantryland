// API baseline for @gantryland/task-combinators
import type { TaskFn } from "@gantryland/task";
export declare class TimeoutError extends Error {
    constructor(message?: string);
}
export declare const map: <T, U, Args extends unknown[] = []>(fn: (data: T) => U) => (taskFn: TaskFn<T, Args>) => TaskFn<U, Args>;
export declare const flatMap: <T, U, Args extends unknown[] = []>(fn: (data: T) => Promise<U>) => (taskFn: TaskFn<T, Args>) => TaskFn<U, Args>;
export declare const tap: <T, Args extends unknown[] = []>(fn: (data: T) => void) => (taskFn: TaskFn<T, Args>) => TaskFn<T, Args>;
export declare const tapError: <T, Args extends unknown[] = []>(fn: (error: unknown) => void) => (taskFn: TaskFn<T, Args>) => TaskFn<T, Args>;
export declare const tapAbort: <T, Args extends unknown[] = []>(fn: (error: unknown) => void) => (taskFn: TaskFn<T, Args>) => TaskFn<T, Args>;
export declare const mapError: <T, Args extends unknown[] = []>(fn: (error: unknown) => Error) => (taskFn: TaskFn<T, Args>) => TaskFn<T, Args>;
export declare const catchError: <T, Args extends unknown[] = []>(fallback: T | Promise<T> | ((err: unknown) => T | Promise<T>)) => (taskFn: TaskFn<T, Args>) => TaskFn<T, Args>;
export declare const retry: <T, Args extends unknown[] = []>(attempts: number, options?: {
    onRetry?: (err: unknown, attempt: number) => void;
}) => (taskFn: TaskFn<T, Args>) => TaskFn<T, Args>;
export declare const timeout: <T, Args extends unknown[] = []>(ms: number) => (taskFn: TaskFn<T, Args>) => TaskFn<T, Args>;
export declare const timeoutAbort: <T, Args extends unknown[] = []>(ms: number) => (taskFn: TaskFn<T, Args>) => TaskFn<T, Args>;
export declare const timeoutWith: <T, Args extends unknown[] = []>(ms: number, fallback: TaskFn<T, Args>) => (taskFn: TaskFn<T, Args>) => TaskFn<T, Args>;
export declare const zip: <T extends unknown[], Args extends unknown[] = []>(...taskFns: { [K in keyof T]: TaskFn<T[K], Args>; }) => TaskFn<T, Args>;
export declare function race<T extends unknown[], Args extends unknown[] = []>(...taskFns: {
    [K in keyof T]: TaskFn<T[K], Args>;
}): TaskFn<T[number], Args>;
export declare const sequence: <T extends unknown[], Args extends unknown[] = []>(...taskFns: { [K in keyof T]: TaskFn<T[K], Args>; }) => TaskFn<T, Args>;
type RetryWhenOptions = {
    maxAttempts?: number;
    delayMs?: (attempt: number, err: unknown) => number;
    onRetry?: (err: unknown, attempt: number) => void;
};
export declare const retryWhen: <T, Args extends unknown[] = []>(shouldRetry: (err: unknown, attempt: number) => boolean | Promise<boolean>, options?: RetryWhenOptions) => (taskFn: TaskFn<T, Args>) => TaskFn<T, Args>;
type BackoffOptions = {
    attempts: number;
    delayMs: number | ((attempt: number, err: unknown) => number);
    shouldRetry?: (err: unknown) => boolean;
};
export declare const backoff: <T, Args extends unknown[] = []>(options: BackoffOptions) => (taskFn: TaskFn<T, Args>) => TaskFn<T, Args>;
export declare const debounce: <T, Args extends unknown[] = []>(options: {
    waitMs: number;
}) => (taskFn: TaskFn<T, Args>) => TaskFn<T, Args>;
export declare const throttle: <T, Args extends unknown[] = []>(options: {
    windowMs: number;
}) => (taskFn: TaskFn<T, Args>) => TaskFn<T, Args>;
export declare const queue: <T, Args extends unknown[] = []>(options?: {
    concurrency?: number;
}) => (taskFn: TaskFn<T, Args>) => TaskFn<T, Args>;
type AnyFn = (arg: any) => any;
type PipeResult<Input, Fns extends AnyFn[]> = Fns extends [] ? Input : Fns extends [(arg: Input) => infer R, ...infer Rest] ? Rest extends AnyFn[] ? PipeResult<R, Rest> : R : never;
export declare function pipe<T, Fns extends AnyFn[]>(initial: T, ...fns: Fns): PipeResult<T, Fns>;
export {};
//# sourceMappingURL=index.d.ts.map