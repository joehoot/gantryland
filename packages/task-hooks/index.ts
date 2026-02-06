import { Task, type TaskFn, type TaskState } from "@gantryland/task";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

/**
 * Runs a task once on mount when it is stale and not already loading.
 */
export const useTaskOnce = <T, Args extends unknown[] = []>(
  task: Task<T, Args>,
): void => {
  useEffect(() => {
    const state = task.getState();
    if (state.isStale && !state.isLoading) {
      void task.run(...([] as unknown as Args));
    }
  }, [task]);
};

/** Returns a stable callback that forwards to `task.run(...)`. */
export const useTaskRun = <T, Args extends unknown[] = []>(
  task: Task<T, Args>,
): ((...args: Args) => Promise<T | undefined>) =>
  useCallback((...args: Args) => task.run(...args), [task]);

/** Subscribes to task state and returns the full snapshot. */
export function useTaskState<T, Args extends unknown[] = []>(
  task: Task<T, Args>,
): TaskState<T>;
/** Subscribes to task state and returns a selected slice. */
export function useTaskState<T, U, Args extends unknown[] = []>(
  task: Task<T, Args>,
  select: (state: TaskState<T>) => U,
): U;
export function useTaskState<T, U, Args extends unknown[] = []>(
  task: Task<T, Args>,
  select?: (state: TaskState<T>) => U,
): TaskState<T> | U {
  const getSnapshot = () => {
    const state = task.getState();
    return select ? select(state) : state;
  };

  return useSyncExternalStore(
    task.subscribe.bind(task),
    getSnapshot,
    getSnapshot,
  );
}

/** Returns a stable callback that cancels in-flight work. */
export const useTaskAbort = <T, Args extends unknown[] = []>(
  task: Task<T, Args>,
): (() => void) => useCallback(() => task.cancel(), [task]);

/** Creates one stable `Task` instance and returns `[task, state]`. */
export const useTask = <T, Args extends unknown[] = []>(
  fn: TaskFn<T, Args>,
): readonly [Task<T, Args>, TaskState<T>] => {
  const [task] = useState(() => new Task(fn));
  const state = useTaskState(task);
  return [task, state] as const;
};
