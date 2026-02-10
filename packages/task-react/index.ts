import type { Task, TaskState } from "@gantryland/task";
import { useCallback, useSyncExternalStore } from "react";

/** Hook return shape that augments Task state with imperative controls. */
export type UseTaskResult<T, Args extends unknown[] = []> = TaskState<T> & {
  run: (...args: Args) => Promise<T>;
  fulfill: (data: T) => T;
  cancel: () => void;
  reset: () => void;
};

/** Subscribes React to Task state with `useSyncExternalStore`. */
export const useTaskState = <T, Args extends unknown[] = []>(
  task: Task<T, Args>,
): TaskState<T> => {
  const subscribe = useCallback(
    (onStoreChange: () => void) => task.subscribe(onStoreChange),
    [task],
  );
  const getSnapshot = useCallback(() => task.getState(), [task]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
};

/** Binds task controls to a Task instance. */
export const useTask = <T, Args extends unknown[] = []>(
  task: Task<T, Args>,
): UseTaskResult<T, Args> => {
  const state = useTaskState(task);
  const run = useCallback((...args: Args) => task.run(...args), [task]);
  const fulfill = useCallback((data: T) => task.fulfill(data), [task]);
  const cancel = useCallback(() => task.cancel(), [task]);
  const reset = useCallback(() => task.reset(), [task]);

  return {
    ...state,
    run,
    fulfill,
    cancel,
    reset,
  };
};
