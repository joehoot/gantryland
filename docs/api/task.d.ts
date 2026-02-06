// API baseline for @gantryland/task
/**
 * Reactive snapshot of a Task.
 *
 * @template T - The type of the resolved data
 *
 * @property data - Last successful result, or undefined before any success
 * @property error - Last error, or undefined if none (AbortError is not stored; non-Error throws are normalized)
 * @property isLoading - True while a run is in-flight
 * @property isStale - True before the first run starts
 */
export type TaskState<T> = {
    data: T | undefined;
    error: Error | undefined;
    isLoading: boolean;
    isStale: boolean;
};
type Listener<T> = (state: TaskState<T>) => void;
type Unsubscribe = () => void;
/**
 * Async function signature executed by a Task.
 *
 * Task treats AbortError as cancellation and does not store it in TaskState.
 *
 * @template T - The type of the resolved data
 * @template Args - Arguments forwarded by run
 * @param signal - Optional AbortSignal for cancellation
 * @param args - Arguments forwarded from run
 * @returns A promise that resolves to the data
 *
 * @example
 * ```typescript
 * const fetchUser: TaskFn<User> = (signal) =>
 *   fetch("/api/user", { signal }).then((r) => r.json());
 * ```
 */
export type TaskFn<T, Args extends unknown[] = []> = (signal?: AbortSignal, ...args: Args) => Promise<T>;
/**
 * Minimal async task with reactive state.
 *
 * The instance is the identity: share the instance to share state across
 * modules or UI. Works in browser and Node.js.
 *
 * @template T - The type of the resolved data
 * @template Args - Arguments forwarded by run
 *
 * @example
 * ```typescript
 * import { Task } from "./task";
 * import { pipe, retry, timeout } from "./task-combinators";
 *
 * const userTask = new Task(
 *   pipe(
 *     (signal) => fetch("/api/user", { signal }).then((r) => r.json()),
 *     retry(2),
 *     timeout(5000)
 *   )
 * );
 *
 * userTask.subscribe(({ data, error, isLoading }) => {
 *   if (isLoading) showSpinner();
 *   else if (error) showError(error);
 *   else render(data);
 * });
 *
 * await userTask.run();
 * ```
 */
export declare class Task<T, Args extends unknown[] = []> {
    private _state;
    private readonly listeners;
    private abortController;
    private requestId;
    private fn;
    /**
     * Creates a new Task instance.
     *
     * @param fn - TaskFn to execute. Can be replaced later with define().
     */
    constructor(fn?: TaskFn<T, Args>);
    private setState;
    private updateState;
    private _notify;
    /**
     * Sets or replaces the TaskFn. Cancels any in-flight request.
     *
     * @param fn - The new TaskFn to use
     * @returns The task instance
     *
     * @example
     * ```typescript
     * const task = new Task<User>((signal) =>
     *   fetch("/api/users/me", { signal }).then((r) => r.json())
     * );
     * task.define((signal) => fetch(`/api/users/${id}`, { signal }).then((r) => r.json()));
     * await task.run();
     * ```
     */
    define(fn: TaskFn<T, Args>): this;
    /**
     * Executes the TaskFn and updates state reactively.
     *
     * Behavior:
     * - Aborts any previous in-flight request (latest wins)
     * - Sets isLoading true and clears error
     * - On success: sets data, clears error, sets isLoading false
     * - On error: preserves data, sets error (normalized to Error), sets isLoading false
     * - On abort: preserves data, sets isLoading false, no error
     * - Superseded runs resolve undefined and do not update state
     * - AbortError is swallowed and not stored
     *
     * @param args - Arguments forwarded to the TaskFn
     * @returns Resolved data on success, otherwise undefined
     *
     * @example
     * ```typescript
     * await task.run();
     * await task.run(userId, includeFlags);
     * ```
     */
    run(...args: Args): Promise<T | undefined>;
    /**
     * Returns the current state snapshot.
     *
     * @returns The current TaskState
     *
     * @example
     * ```typescript
     * const { data, error, isLoading, isStale } = task.getState();
     * ```
     */
    getState(): TaskState<T>;
    /**
     * Subscribes to state changes. The listener is called immediately with
     * the current state, then on every subsequent change.
     *
     * @param listener - Callback invoked with the current state
     * @returns Unsubscribe function
     *
     * @example
     * ```typescript
     * const unsub = task.subscribe((state) => {
     *   console.log("State changed:", state);
     * });
     *
     * // Later...
     * unsub();
     * ```
     */
    subscribe(listener: Listener<T>): Unsubscribe;
    /**
     * Short-circuits with provided data. Aborts any in-flight request and
     * immediately settles the task with the given data.
     *
     * State after resolve:
     * - data: provided value
     * - error: undefined
     * - isLoading: false
     * - isStale: false
     *
     * @param data - The data to resolve with
     *
     * @example
     * ```typescript
     * // Skip fetch if we already have the data
     * if (cachedUser) {
     *   task.resolveWith(cachedUser);
     * } else {
     *   await task.run();
     * }
     * ```
     */
    resolveWith(data: T): void;
    /**
     * Cancels any in-flight request. Preserves existing data and clears
     * isLoading. Does nothing if no request is in-flight.
     *
     * @example
     * ```typescript
     * task.run(); // starts fetch
     * task.cancel(); // aborts fetch, keeps previous data
     * ```
     */
    cancel(): void;
    /**
     * Resets the task to its initial state. Aborts any in-flight request
     * and clears all data/error.
     *
     * @example
     * ```typescript
     * task.reset();
     * // State is now: { data: undefined, error: undefined, isLoading: false, isStale: true }
     * ```
     */
    reset(): void;
    /**
     * Disposes the task. Aborts any in-flight request and removes all
     * listeners. The task should not be used after disposal.
     *
     * @example
     * ```typescript
     * // Cleanup on component unmount or when done
     * task.dispose();
     * ```
     */
    dispose(): void;
}
export {};
//# sourceMappingURL=index.d.ts.map