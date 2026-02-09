// API baseline for @gantryland/task-react
import type { Task, TaskState } from "@gantryland/task";
/** Hook return shape that augments Task state with imperative controls. */
export type UseTaskResult<T, Args extends unknown[] = []> = TaskState<T> & {
    run: (...args: Args) => Promise<T | undefined>;
    cancel: () => void;
    reset: () => void;
};
/** Subscribes React to Task state with `useSyncExternalStore`. */
export declare const useTaskState: <T, Args extends unknown[] = []>(task: Task<T, Args>) => TaskState<T>;
/** Binds `run`, `cancel`, and `reset` controls to a Task instance. */
export declare const useTask: <T, Args extends unknown[] = []>(task: Task<T, Args>) => UseTaskResult<T, Args>;
//# sourceMappingURL=index.d.ts.map