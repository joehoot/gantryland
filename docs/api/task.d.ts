// API baseline for @gantryland/task
/** Reactive state snapshot for a Task instance. */
export type TaskState<T> = {
    data: T | undefined;
    error: Error | undefined;
    isLoading: boolean;
    isStale: boolean;
};
type Listener<T> = (state: Readonly<TaskState<T>>) => void;
type Unsubscribe = () => void;
/** Async function signature executed by `Task.run()`. */
export type TaskFn<T, Args extends unknown[] = []> = (signal: AbortSignal | null, ...args: Args) => Promise<T>;
/** Async function signature executed by `Task.run()` without signal support. */
export type PlainTaskFn<T, Args extends unknown[] = []> = (...args: Args) => Promise<T>;
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
    private readonly mode;
    /** Creates a task with a required task function (signal-aware or plain). */
    constructor(fn: TaskFn<T, Args>, options?: {
        mode?: "auto" | "signal";
    });
    constructor(fn: PlainTaskFn<T, Args>, options?: {
        mode?: "auto" | "plain";
    });
    private executeFn;
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
    /** Returns an immutable snapshot of current task state. */
    getState(): Readonly<TaskState<T>>;
    /**
     * Subscribes to state changes.
     *
     * The listener receives the current state immediately and then every update.
     */
    subscribe(listener: Listener<T>): Unsubscribe;
    /** Cancels any in-flight run and clears `isLoading`. */
    cancel(): void;
    /** Fulfills immediately with provided data and clears any in-flight run. */
    fulfill(data: T): T;
    /** Aborts any in-flight run and restores the initial stale state. */
    reset(): void;
}
export {};
//# sourceMappingURL=index.d.ts.map