// API baseline for @gantryland/task-react
import type { Task, TaskState } from "@gantryland/task";
export type UseTaskResult<T, Args extends unknown[] = []> = TaskState<T> & {
    run: (...args: Args) => Promise<T | undefined>;
    cancel: () => void;
    reset: () => void;
};
export declare const useTaskState: <T, Args extends unknown[] = []>(task: Task<T, Args>) => TaskState<T>;
export declare const useTask: <T, Args extends unknown[] = []>(task: Task<T, Args>) => UseTaskResult<T, Args>;
//# sourceMappingURL=index.d.ts.map