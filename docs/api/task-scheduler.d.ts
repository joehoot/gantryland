// API baseline for @gantryland/task-scheduler
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
export declare const pollTask: <T, Args extends unknown[] = []>(task: Task<T, Args>, options: {
    intervalMs: number;
    immediate?: boolean;
}, ...args: Args) => (() => void);
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
export declare const debounce: <T, Args extends unknown[] = []>(options: {
    waitMs: number;
}) => (taskFn: TaskFn<T, Args>) => TaskFn<T, Args>;
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
export declare const throttle: <T, Args extends unknown[] = []>(options: {
    windowMs: number;
}) => (taskFn: TaskFn<T, Args>) => TaskFn<T, Args>;
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
export declare const queue: <T, Args extends unknown[] = []>(options?: {
    concurrency?: number;
}) => (taskFn: TaskFn<T, Args>) => TaskFn<T, Args>;
//# sourceMappingURL=index.d.ts.map