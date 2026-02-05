import { Task, type TaskFn, type TaskState } from "@gantryland/task";
import {
  type DependencyList,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

const DEFAULT_TASK_STATE = {
  data: undefined,
  error: undefined,
  isLoading: false,
  isStale: true,
} as const satisfies TaskState<unknown>;

/**
 * Runs a task on mount if it's stale and not already loading.
 * Only triggers on initial render - ignores later changes to the task.
 *
 * @template T - The type of the task's resolved data
 * @param task - The Task instance to run
 * @param options - Optional options
 *
 * @example
 * ```typescript
 * const [task] = useTask(() => new Task(fetchUsers));
 * useTaskOnce(task); // runs on mount if stale
 * ```
 */
type UseTaskOnceOptions<T> = {
  enabled?: boolean;
  when?: (state: TaskState<T>) => boolean;
};

export const useTaskOnce = <T, Args extends unknown[] = []>(
  task: Task<T, Args>,
  options: UseTaskOnceOptions<T> = {}
): void => {
  const taskRef = useRef(task);
  const optionsRef = useRef(options);

  optionsRef.current = options;

  useEffect(() => {
    const state = taskRef.current.getState();
    const { enabled = true, when } = optionsRef.current;
    if (enabled && (when ? when(state) : state.isStale && !state.isLoading)) {
      void taskRef.current.run(...([] as unknown as Args));
    }
  }, []);
};

type UseTaskRunOptions<Args extends unknown[]> = {
  auto?: boolean;
  deps?: DependencyList;
  args?: Args;
};

/**
 * Returns a stable run() callback. Optionally auto-runs when deps change.
 */
export const useTaskRun = <T, Args extends unknown[] = []>(
  task: Task<T, Args> | null | undefined,
  options: UseTaskRunOptions<Args> = {}
): ((...args: Args) => Promise<T | undefined>) => {
  const { auto = false, deps = [], args } = options;
  const run = useCallback(
    (...runArgs: Args) => (task ? task.run(...runArgs) : Promise.resolve(undefined)),
    [task]
  );

  useEffect(() => {
    if (!auto || !task) return;
    const autoArgs = (args ?? ([] as unknown as Args)) as Args;
    void task.run(...autoArgs);
  }, [task, auto, ...deps]);

  return run;
};

/**
 * Subscribes to a task's state reactively using useSyncExternalStore.
 * Re-renders the component when the task state changes.
 *
 * @template T - The type of the task's resolved data
 * @param task - The Task instance to subscribe to, or null/undefined
 * @param fallbackState - Optional state to use when task is null/undefined.
 *                        Defaults to a stale state.
 * @param select - Optional selector to derive a value from state.
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
type UseTaskStateOptions<T, U> = {
  fallbackState?: TaskState<T>;
  select?: (state: TaskState<T>) => U;
};

export function useTaskState<T, Args extends unknown[] = []>(
  task: Task<T, Args> | null | undefined
): TaskState<T>;
export function useTaskState<T, U, Args extends unknown[] = []>(
  task: Task<T, Args> | null | undefined,
  options: UseTaskStateOptions<T, U>
): U;
export function useTaskState<T, U, Args extends unknown[] = []>(
  task: Task<T, Args> | null | undefined,
  options?: UseTaskStateOptions<T, U>
): TaskState<T> | U {
  const getState = () =>
    task ? task.getState() : options?.fallbackState ?? (DEFAULT_TASK_STATE as TaskState<T>);

  const getSnapshot = () => {
    const state = getState();
    return options?.select ? options.select(state) : state;
  };

  return useSyncExternalStore(
    (onStoreChange) => (task ? task.subscribe(onStoreChange) : () => {}),
    getSnapshot,
    getSnapshot
  );
}

/**
 * Convenience wrapper for useTaskState.
 */
export const useTaskResult = <T, Args extends unknown[] = []>(
  task: Task<T, Args> | null | undefined,
  options?: { fallbackState?: TaskState<T> }
): TaskState<T> =>
  useTaskState<T, TaskState<T>, Args>(task, {
    fallbackState: options?.fallbackState,
    select: (state) => state,
  });

/**
 * Subscribes to just the error field.
 */
export const useTaskError = <T, Args extends unknown[] = []>(
  task: Task<T, Args> | null | undefined,
  options?: { fallbackState?: TaskState<T> }
): unknown | undefined =>
  useTaskState(task, {
    fallbackState: options?.fallbackState,
    select: (state) => state.error,
  });

/**
 * Returns a stable cancel() callback.
 */
export const useTaskAbort = <T, Args extends unknown[] = []>(
  task: Task<T, Args> | null | undefined
): (() => void) => useCallback(() => task?.cancel(), [task]);

/**
 * Creates a Task instance and subscribes to its state.
 * The task instance is stable across renders.
 *
 * @template T - The type of the task's resolved data
 * @param arg - TaskFn or factory function that creates the Task. Called once on mount.
 * @param options - Optional options. Use { mode: "factory" } when passing a factory.
 * @returns A tuple of [Task, TaskState]
 *
 * @example
 * ```typescript
 * // Create task with TaskFn
 * const [task, { data, isLoading }] = useTask(fetchUsers);
 *
 * // Run on mount
 * useTaskOnce(task);
 *
 * // Manual refetch
 * const handleRefresh = () => task.run();
 *
 * // With pipe combinators
 * const [task, state] = useTask(
 *   () =>
 *     new Task(
 *       pipe(
 *         fetchUsers,
 *         retry(2),
 *         timeout(5000)
 *       )
 *     ),
 *   { mode: "factory" }
 * );
 * ```
 */
type UseTaskOptions = {
  mode?: "fn" | "factory";
};

export function useTask<T, Args extends unknown[] = []>(
  fn: TaskFn<T, Args>,
  options?: UseTaskOptions
): [Task<T, Args>, TaskState<T>];
export function useTask<T, Args extends unknown[] = []>(
  create: () => Task<T, Args>,
  options: UseTaskOptions
): [Task<T, Args>, TaskState<T>];
export function useTask<T, Args extends unknown[] = []>(
  arg: TaskFn<T, Args> | (() => Task<T, Args>),
  options: UseTaskOptions = {}
) {
  const [task] = useState(() => {
    if (options.mode === "factory") return (arg as () => Task<T, Args>)();
    return new Task(arg as TaskFn<T, Args>);
  });
  const state = useTaskState(task);
  return [task, state] as const;
}
