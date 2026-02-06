// API baseline for @gantryland/task-hooks
import { Task, type TaskFn, type TaskState } from "@gantryland/task";
/**
 * Runs a task once on mount when it is stale and not already loading.
 */
export declare const useTaskOnce: <T, Args extends unknown[] = []>(task: Task<T, Args>) => void;
/** Returns a stable callback that forwards to `task.run(...)`. */
export declare const useTaskRun: <T, Args extends unknown[] = []>(task: Task<T, Args>) => ((...args: Args) => Promise<T | undefined>);
/** Subscribes to task state and returns the full snapshot. */
export declare function useTaskState<T, Args extends unknown[] = []>(task: Task<T, Args>): TaskState<T>;
/** Subscribes to task state and returns a selected slice. */
export declare function useTaskState<T, U, Args extends unknown[] = []>(task: Task<T, Args>, select: (state: TaskState<T>) => U): U;
/** Returns a stable callback that cancels in-flight work. */
export declare const useTaskAbort: <T, Args extends unknown[] = []>(task: Task<T, Args>) => (() => void);
/** Creates one stable `Task` instance and returns `[task, state]`. */
export declare const useTask: <T, Args extends unknown[] = []>(fn: TaskFn<T, Args>) => readonly [Task<T, Args>, TaskState<T>];
//# sourceMappingURL=index.d.ts.map