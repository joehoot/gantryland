// API baseline for @gantryland/task-logger
import type { Task, TaskFn } from "@gantryland/task";
import type { CacheStore } from "@gantryland/task-cache";
/**
 * Log severity levels.
 */
export type LogLevel = "debug" | "info" | "warn" | "error";
/**
 * Structured log event.
 */
export type LogEvent = {
    level: LogLevel;
    message: string;
    meta?: Record<string, unknown>;
};
/**
 * Logger function signature.
 */
export type Logger = (event: LogEvent) => void;
/**
 * Options for logging TaskFn execution.
 */
export type TaskLoggerOptions = {
    label?: string;
    logger?: Logger;
    /**
     * Clock source for duration metadata (defaults to Date.now).
     */
    now?: () => number;
};
/**
 * Options for logging Task instance state transitions.
 */
export type TaskSubscriptionLoggerOptions = {
    label?: string;
    logger?: Logger;
    /**
     * Clock source for duration metadata (defaults to Date.now).
     */
    now?: () => number;
};
/**
 * Options for logging cache events.
 */
export type CacheLoggerOptions = {
    label?: string;
    logger?: Logger;
};
/**
 * Log events using the console.
 *
 * Uses the event level as the console method when available.
 *
 * @param event - Structured log event to write
 * @returns Nothing
 *
 * @example
 * ```typescript
 * consoleLogger({ level: "info", message: "task start" });
 * ```
 */
export declare const consoleLogger: Logger;
/**
 * Create a logger that prefixes messages.
 *
 * Wraps an existing logger or the console logger by default.
 *
 * @param options - Logger configuration
 * @returns A logger that adds the prefix to every message
 *
 * @example
 * ```typescript
 * const logger = createLogger({ prefix: "[api]" });
 * logger({ level: "info", message: "ready" });
 * ```
 */
export declare const createLogger: (options?: {
    prefix?: string;
    logger?: Logger;
}) => Logger;
/**
 * Wrap a TaskFn and log start/success/error/abort with duration metadata.
 *
 * Errors are rethrown after logging. AbortError logs at debug level.
 *
 * @template T - Resolved data type
 * @template Args - TaskFn argument tuple
 * @param options - Logging configuration
 * @returns A combinator that returns a TaskFn
 *
 * @example
 * ```typescript
 * const task = new Task(
 *   pipe(fetchUser, logTask({ label: "user" }))
 * );
 * ```
 */
export declare const logTask: <T, Args extends unknown[] = []>(options?: TaskLoggerOptions) => (taskFn: TaskFn<T, Args>) => TaskFn<T, Args>;
/**
 * Subscribe to a Task and log lifecycle transitions.
 *
 * Success/abort are inferred from TaskState changes. If a run completes
 * without error and the data reference does not change, it is logged as abort.
 *
 * @template T - Task data type
 * @template Args - Task argument tuple
 * @param task - Task instance to subscribe to
 * @param options - Logging configuration
 * @returns Unsubscribe function
 *
 * @example
 * ```typescript
 * const task = new Task(fetchUser);
 * const unsubscribe = logTaskState(task, { label: "user" });
 * await task.run();
 * unsubscribe();
 * ```
 */
export declare const logTaskState: <T, Args extends unknown[] = []>(task: Task<T, Args>, options?: TaskSubscriptionLoggerOptions) => (() => void);
/**
 * Subscribe to cache events and log them.
 *
 * Returns a no-op when the store does not expose subscribe().
 *
 * @param store - Cache store that may emit events
 * @param options - Logging configuration
 * @returns Unsubscribe function
 *
 * @example
 * ```typescript
 * const store = new MemoryCacheStore();
 * const unsubscribe = logCache(store, { label: "cache" });
 * unsubscribe();
 * ```
 */
export declare const logCache: (store: CacheStore, options?: CacheLoggerOptions) => (() => void);
//# sourceMappingURL=index.d.ts.map