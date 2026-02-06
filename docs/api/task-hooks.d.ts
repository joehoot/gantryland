// API baseline for @gantryland/task-hooks
import { Task, type TaskFn, type TaskState } from "@gantryland/task";
import { type DependencyList } from "react";
type UseTaskOnceOptions<T> = {
    enabled?: boolean;
    when?: (state: TaskState<T>) => boolean;
};
/**
 * Run a task on mount if it is stale and not already loading.
 * Only checks on the initial render and ignores later task changes.
 *
 * @template T - The task's resolved data type
 * @template Args - Arguments forwarded by Task.run
 * @param task - The Task instance to run
 * @param options - Optional configuration for conditional runs
 * @returns void
 *
 * @example
 * ```typescript
 * const [task] = useTask(fetchUsers);
 * useTaskOnce(task);
 * ```
 *
 * @example
 * ```typescript
 * useTaskOnce(task, { enabled: false });
 * useTaskOnce(task, { when: (state) => state.isStale && !state.isLoading });
 * ```
 */
export declare const useTaskOnce: <T, Args extends unknown[] = []>(task: Task<T, Args>, options?: UseTaskOnceOptions<T>) => void;
type UseTaskRunOptions<Args extends unknown[]> = {
    auto?: boolean;
    deps?: DependencyList;
    args?: Args;
};
/**
 * Return a stable run() callback and optionally auto-run on dependency changes.
 * Auto-runs are driven by deps; args are passed through but not tracked.
 * When task is null/undefined, the callback resolves to undefined.
 *
 * @template T - The task's resolved data type
 * @template Args - Arguments forwarded by Task.run
 * @param task - The Task instance to run, or null/undefined for a no-op
 * @param options - Auto-run options and dependency tracking (deps control re-runs)
 * @returns A stable function that resolves with task data or undefined
 *
 * @example
 * ```typescript
 * const run = useTaskRun(task);
 * await run();
 * ```
 *
 * @example
 * ```typescript
 * const runUser = useTaskRun(task, {
 *   auto: true,
 *   deps: [userId],
 *   args: [userId],
 * });
 * ```
 */
export declare const useTaskRun: <T, Args extends unknown[] = []>(task: Task<T, Args> | null | undefined, options?: UseTaskRunOptions<Args>) => ((...args: Args) => Promise<T | undefined>);
type UseTaskStateOptions<T, U> = {
    fallbackState?: TaskState<T>;
    select?: (state: TaskState<T>) => U;
};
/**
 * Subscribe to a task's state and re-render on changes.
 *
 * @template T - The task's resolved data type
 * @template Args - Arguments forwarded by Task.run
 * @param task - The Task instance to subscribe to, or null/undefined
 * @returns The current TaskState
 *
 * @example
 * ```typescript
 * const state = useTaskState(userTask);
 * const { data, error, isLoading, isStale } = state;
 * ```
 */
export declare function useTaskState<T, Args extends unknown[] = []>(task: Task<T, Args> | null | undefined): TaskState<T>;
/**
 * Subscribe to a task's state and select a slice of state.
 * When task is null/undefined, returns fallbackState or a stale default.
 *
 * @template T - The task's resolved data type
 * @template U - The selected return type
 * @template Args - Arguments forwarded by Task.run
 * @param task - The Task instance to subscribe to, or null/undefined
 * @param options - Optional fallback state and selector
 * @returns The selected value
 *
 * @example
 * ```typescript
 * const isLoading = useTaskState(task, { select: (s) => s.isLoading });
 * const state = useTaskState(task, { fallbackState: customFallback });
 * ```
 */
export declare function useTaskState<T, U, Args extends unknown[] = []>(task: Task<T, Args> | null | undefined, options: UseTaskStateOptions<T, U>): U;
/**
 * Return the full TaskState for a task.
 * When task is null/undefined, returns fallbackState or a stale default.
 *
 * @template T - The task's resolved data type
 * @template Args - Arguments forwarded by Task.run
 * @param task - The Task instance to subscribe to, or null/undefined
 * @param options - Optional fallback state
 * @returns The current TaskState
 *
 * @example
 * ```typescript
 * const { data, error } = useTaskResult(task);
 * ```
 */
export declare const useTaskResult: <T, Args extends unknown[] = []>(task: Task<T, Args> | null | undefined, options?: {
    fallbackState?: TaskState<T>;
}) => TaskState<T>;
/**
 * Subscribe to the task's error field.
 * When task is null/undefined, uses fallbackState or a stale default.
 *
 * @template T - The task's resolved data type
 * @template Args - Arguments forwarded by Task.run
 * @param task - The Task instance to subscribe to, or null/undefined
 * @param options - Optional fallback state
 * @returns The current error, if any
 *
 * @example
 * ```typescript
 * const error = useTaskError(task);
 * ```
 */
export declare const useTaskError: <T, Args extends unknown[] = []>(task: Task<T, Args> | null | undefined, options?: {
    fallbackState?: TaskState<T>;
}) => Error | undefined;
/**
 * Return a stable cancel() callback.
 * Safe to call when task is null/undefined.
 *
 * @template T - The task's resolved data type
 * @template Args - Arguments forwarded by Task.run
 * @param task - The Task instance to cancel, or null/undefined
 * @returns A stable callback that cancels in-flight work
 *
 * @example
 * ```typescript
 * const cancel = useTaskAbort(task);
 * cancel();
 * ```
 */
export declare const useTaskAbort: <T, Args extends unknown[] = []>(task: Task<T, Args> | null | undefined) => (() => void);
type UseTaskOptions = {
    mode?: "fn" | "factory";
};
/**
 * Create a Task instance from a TaskFn and subscribe to its state.
 * The Task instance is stable across renders and ignores later TaskFn changes.
 *
 * @template T - The task's resolved data type
 * @template Args - Arguments forwarded by Task.run
 * @param fn - TaskFn to wrap in a Task instance
 * @param options - Optional options
 * @returns A tuple of [Task, TaskState]
 *
 * @example
 * ```typescript
 * const [task, { data, isLoading }] = useTask(fetchUsers);
 * useTaskOnce(task);
 * ```
 */
export declare function useTask<T, Args extends unknown[] = []>(fn: TaskFn<T, Args>, options?: UseTaskOptions): [Task<T, Args>, TaskState<T>];
/**
 * Create a Task instance via a factory and subscribe to its state.
 * Use mode: "factory" so the function is not treated as a TaskFn.
 *
 * @template T - The task's resolved data type
 * @template Args - Arguments forwarded by Task.run
 * @param create - Factory function that returns a Task
 * @param options - Options with mode: "factory"
 * @returns A tuple of [Task, TaskState]
 *
 * @example
 * ```typescript
 * const [task, state] = useTask(() => new Task(fetchUsers), { mode: "factory" });
 * ```
 */
export declare function useTask<T, Args extends unknown[] = []>(create: () => Task<T, Args>, options: UseTaskOptions): [Task<T, Args>, TaskState<T>];
export {};
//# sourceMappingURL=index.d.ts.map