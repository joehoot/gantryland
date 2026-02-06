import type { Task, TaskState } from "@gantryland/task";
import { useCallback, useSyncExternalStore } from "react";

export type UseTaskResult<T, Args extends unknown[] = []> = TaskState<T> & {
  run: (...args: Args) => Promise<T | undefined>;
  cancel: () => void;
  reset: () => void;
};

export const useTaskState = <T, Args extends unknown[] = []>(
  task: Task<T, Args>,
): TaskState<T> =>
  useSyncExternalStore(
    (onStoreChange) => task.subscribe(() => onStoreChange()),
    () => task.getState(),
    () => task.getState(),
  );

export const useTask = <T, Args extends unknown[] = []>(
  task: Task<T, Args>,
): UseTaskResult<T, Args> => {
  const state = useTaskState(task);
  const run = useCallback((...args: Args) => task.run(...args), [task]);
  const cancel = useCallback(() => task.cancel(), [task]);
  const reset = useCallback(() => task.reset(), [task]);

  return {
    ...state,
    run,
    cancel,
    reset,
  };
};
