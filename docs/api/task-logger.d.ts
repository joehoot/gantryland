// API baseline for @gantryland/task-logger
import type { Task, TaskFn } from "@gantryland/task";
import type { CacheStore } from "@gantryland/task-cache";
export type LogEvent = {
    level: "debug" | "info" | "warn" | "error";
    message: string;
    meta?: Record<string, unknown>;
};
export type Logger = (event: LogEvent) => void;
/** Wraps a TaskFn and logs start/success/error/abort with duration metadata. */
export declare const logTask: <T, Args extends unknown[] = []>(options?: {
    label?: string;
    logger?: Logger;
    now?: () => number;
}) => (taskFn: TaskFn<T, Args>) => TaskFn<T, Args>;
/** Subscribes to Task state transitions and logs start/success/error/abort. */
export declare const logTaskState: <T, Args extends unknown[] = []>(task: Task<T, Args>, options?: {
    label?: string;
    logger?: Logger;
    now?: () => number;
}) => (() => void);
/** Subscribes to cache events and logs `${label} ${event.type}` at debug level. */
export declare const logCache: (store: CacheStore, options?: {
    label?: string;
    logger?: Logger;
}) => (() => void);
//# sourceMappingURL=index.d.ts.map