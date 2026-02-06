// API baseline for @gantryland/task
/** Reactive state snapshot for a Task instance. */
export type TaskState<T> = {
    data: T | undefined;
    error: Error | undefined;
    isLoading: boolean;
    isStale: boolean;
};
type Listener<T> = (state: TaskState<T>) => void;
type Unsubscribe = () => void;
/** Async function signature executed by `Task.run()`. */
export type TaskFn<T, Args extends unknown[] = []> = (signal?: AbortSignal, ...args: Args) => Promise<T>;
/**
 * Minimal async primitive with reactive state and latest-run-wins semantics.
 *
 * The Task instance is the state identity: share the instance to share state.
 */
export declare class Task<T, Args extends unknown[] = []> {
    private _state;
    private readonly listeners;
    private abortController;
    private requestId;
    private readonly fn;
    /** Creates a task with a required `TaskFn`. */
    constructor(fn: TaskFn<T, Args>);
    private setState;
    private updateState;
    private notify;
    /**
     * Executes the current `TaskFn`.
     *
     * Starts loading, clears `error`, aborts any in-flight run, and enforces
     * latest-run-wins. Returns `undefined` on error, abort, or superseded runs.
     */
    run(...args: Args): Promise<T | undefined>;
    /** Returns the current state snapshot. */
    getState(): TaskState<T>;
    /**
     * Subscribes to state changes.
     *
     * The listener receives the current state immediately and then every update.
     */
    subscribe(listener: Listener<T>): Unsubscribe;
    /** Cancels any in-flight run and clears `isLoading`. */
    cancel(): void;
    /** Aborts any in-flight run and restores the initial stale state. */
    reset(): void;
}
export {};
//# sourceMappingURL=index.d.ts.map