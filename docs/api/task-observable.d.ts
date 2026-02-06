// API baseline for @gantryland/task-observable
import type { Task, TaskFn, TaskState } from "@gantryland/task";
/** Minimal observer interface for Task interop. */
export type Observer<T> = {
    next: (value: T) => void;
    error?: (error: unknown) => void;
    complete?: () => void;
};
/** Minimal subscription interface. */
export type Subscription = {
    unsubscribe: () => void;
};
/** Minimal observable interface. */
export type Observable<T> = {
    subscribe: (observer: Observer<T>) => Subscription;
};
/** Converts a Task into an Observable of TaskState snapshots. */
export declare const fromTaskState: <T, Args extends unknown[] = []>(task: Task<T, Args>) => Observable<TaskState<T>>;
/**
 * Converts an Observable into a TaskFn.
 *
 * Resolves on first `next`, rejects on `error`, rejects with AbortError on
 * abort, and always unsubscribes on settle.
 */
export declare const toTask: <T, Args extends unknown[] = []>(observable: Observable<T>) => TaskFn<T, Args>;
//# sourceMappingURL=index.d.ts.map