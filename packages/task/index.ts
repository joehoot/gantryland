/**
 * Reactive snapshot of a Task.
 *
 * @template T - The type of the resolved data
 *
 * @property data - Last successful result, or undefined before any success
 * @property error - Last error, or undefined if none (AbortError is not stored)
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
export type TaskFn<T, Args extends unknown[] = []> = (
  signal?: AbortSignal,
  ...args: Args
) => Promise<T>;

const isAbortError = (err: unknown): boolean =>
  (err as Error).name === "AbortError";

const toError = (err: unknown): Error =>
  err instanceof Error ? err : new Error(String(err));

/**
 * Internal helper for the initial Task state.
 */
const createDefaultTaskState = <T>(): TaskState<T> => ({
  data: undefined,
  error: undefined,
  isLoading: false,
  isStale: true,
});

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
export class Task<T, Args extends unknown[] = []> {
  private _state: TaskState<T> = createDefaultTaskState<T>();
  private readonly listeners = new Set<Listener<T>>();
  private abortController: AbortController | null = null;
  private requestId = 0;
  private fn: TaskFn<T, Args> | null;

  /**
   * Creates a new Task instance.
   *
   * @param fn - TaskFn to execute. Can be replaced later with define().
   */
  constructor(fn?: TaskFn<T, Args>) {
    this.fn = fn ?? null;
  }

  private setState(state: TaskState<T>): void {
    this._state = state;
    this._notify();
  }

  private updateState(partial: Partial<TaskState<T>>): void {
    this._state = { ...this._state, ...partial };
    this._notify();
  }

  private _notify() {
    for (const listener of this.listeners) {
      try {
        listener(this._state);
      } catch (error) {
        console.error("Task listener error", error);
      }
    }
  }

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
  define(fn: TaskFn<T, Args>): this {
    this.cancel();
    this.fn = fn;
    return this;
  }

  /**
   * Executes the TaskFn and updates state reactively.
   *
   * Behavior:
   * - Aborts any previous in-flight request (latest wins)
   * - Sets isLoading true and clears error
   * - On success: sets data, clears error, sets isLoading false
   * - On error: preserves data, sets error, sets isLoading false
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
  async run(...args: Args): Promise<T | undefined> {
    if (!this.fn) {
      throw new Error("TaskFn is not set. Call define() before run().");
    }
    const currentRequestId = ++this.requestId;
    this.abortController?.abort();
    this.abortController = new AbortController();

    this.updateState({ isLoading: true, isStale: false, error: undefined });

    try {
      const data = await this.fn(this.abortController.signal, ...args);
      if (currentRequestId !== this.requestId) return undefined;
      this.abortController = null;
      this.setState({
        data,
        error: undefined,
        isLoading: false,
        isStale: false,
      });
      return data;
    } catch (err) {
      if (currentRequestId !== this.requestId) return undefined;
      this.abortController = null;
      if (isAbortError(err)) {
        if (this._state.isLoading) {
          this.updateState({ isLoading: false });
        }
        return undefined;
      }
      this.updateState({ error: toError(err), isLoading: false });
      return undefined;
    }
  }

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
  getState(): TaskState<T> {
    return this._state;
  }

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
  subscribe(listener: Listener<T>): Unsubscribe {
    this.listeners.add(listener);
    listener(this._state);
    return () => {
      this.listeners.delete(listener);
    };
  }

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
  resolveWith(data: T): void {
    this.requestId += 1;
    this.abortController?.abort();
    this.abortController = null;
    this.setState({
      data,
      error: undefined,
      isLoading: false,
      isStale: false,
    });
  }

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
  cancel(): void {
    if (!this.abortController) return;
    this.requestId += 1;
    this.abortController.abort();
    this.abortController = null;
    if (this._state.isLoading) {
      this.updateState({ isLoading: false });
    }
  }

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
  reset(): void {
    this.requestId += 1;
    this.abortController?.abort();
    this.abortController = null;
    this.setState(createDefaultTaskState<T>());
  }

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
  dispose(): void {
    this.requestId += 1;
    this.abortController?.abort();
    this.abortController = null;
    this.listeners.clear();
  }
}
