import { Task, createDefaultTaskState, type TaskState } from "../task";
import { useRef, useEffect, useSyncExternalStore, useState } from "react";

/**
 * Runs a task on mount if it's stale and not already loading.
 * Only triggers on initial render - ignores later changes to the task.
 *
 * @template T - The type of the task's resolved data
 * @param task - The Task instance to run
 *
 * @example
 * ```typescript
 * const [task] = useTask(() => new Task(fetchUsers));
 * useTaskOnce(task); // runs on mount if stale
 * ```
 */
export const useTaskOnce = <T>(task: Task<T>): void => {
  const taskRef = useRef(task);

  useEffect(() => {
    const state = taskRef.current.getState();
    if (state.isStale && !state.isLoading) {
      void taskRef.current.run();
    }
  }, []);
};

/**
 * Subscribes to a task's state reactively using useSyncExternalStore.
 * Re-renders the component when the task state changes.
 *
 * @template T - The type of the task's resolved data
 * @param task - The Task instance to subscribe to, or null/undefined
 * @param fallbackState - Optional state to use when task is null/undefined.
 *                        Defaults to createDefaultTaskState().
 * @returns The current TaskState
 *
 * @example
 * ```typescript
 * // Basic usage
 * const state = useTaskState(userTask);
 * const { data, error, isLoading, isStale } = state;
 *
 * // With nullable task
 * const state = useTaskState(maybeTask);
 *
 * // With custom fallback
 * const state = useTaskState(task, { data: [], error: undefined, isLoading: false, isStale: false });
 * ```
 */
export const useTaskState = <T>(
  task: Task<T> | null | undefined,
  fallbackState?: TaskState<T>
): TaskState<T> => {
  const getSnapshot = () =>
    task ? task.getState() : fallbackState ?? createDefaultTaskState<T>();

  return useSyncExternalStore(
    (onStoreChange) => (task ? task.subscribe(onStoreChange) : () => {}),
    getSnapshot,
    getSnapshot
  );
};

/**
 * Creates a Task instance and subscribes to its state.
 * The task instance is stable across renders.
 *
 * @template T - The type of the task's resolved data
 * @param create - Factory function that creates the Task. Called once on mount.
 *                 Defaults to creating an empty Task.
 * @returns A tuple of [Task, TaskState]
 *
 * @example
 * ```typescript
 * // Create task with TaskFn
 * const [task, { data, isLoading }] = useTask(() => new Task(fetchUsers));
 *
 * // Run on mount
 * useTaskOnce(task);
 *
 * // Manual refetch
 * const handleRefresh = () => task.run();
 *
 * // With pipe combinators
 * const [task, state] = useTask(() =>
 *   new Task(
 *     pipe(
 *       fetchUsers,
 *       retry(2),
 *       timeout(5000)
 *     )
 *   )
 * );
 * ```
 */
export const useTask = <T>(
  create: () => Task<T> = () => new Task<T>()
): [Task<T>, TaskState<T>] => {
  const [task] = useState(create);
  const state = useTaskState(task);
  return [task, state];
};
