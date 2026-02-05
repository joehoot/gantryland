/**
 * Reactive state for a Task. Represents all possible states of an async operation.
 *
 * @template T - The type of the resolved data
 *
 * @property data - The resolved data, or undefined if not yet resolved
 * @property error - The error if the task failed, or undefined if no error
 * @property isLoading - True while the task is in-flight
 * @property isStale - True until the first run starts. Use with isLoading to model empty states.
 */
export type TaskState<T> = {
  data: T | undefined;
  error: unknown | undefined;
  isLoading: boolean;
  isStale: boolean;
};

type Listener<T> = (state: TaskState<T>) => void;
type Unsubscribe = () => void;

/**
 * The async function signature for a Task.
 *
 * @template T - The type of the resolved data
 * @param signal - Optional AbortSignal for cancellation support
 * @param args - Additional arguments forwarded by run
 * @returns A promise that resolves to the data
 *
 * @example
 * ```typescript
 * const fetchUser: TaskFn<User> = (signal) =>
 *   fetch('/api/user', { signal }).then(r => r.json());
 * ```
 */
export type TaskFn<T, Args extends unknown[] = []> = (
  signal?: AbortSignal,
  ...args: Args
) => Promise<T>;

const isAbortError = (err: unknown): boolean =>
  (err as Error).name === "AbortError";

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
 * The instance is the identity. Share the instance to share state across
 * components or modules. Works in browser and Node.js.
 *
 * @template T - The type of the resolved data
 *
 * @example
 * ```typescript
 * import { Task } from './task';
 * import { pipe, retry, timeout } from './task-combinators';
 *
 * const userTask = new Task(
 *   pipe(
 *     (signal) => fetch('/api/user', { signal }).then(r => r.json()),
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
  private fn: TaskFn<T, Args>;

  /**
   * Creates a new Task instance.
   *
   * @param fn - TaskFn to execute. Can be replaced later with setFn().
   */
  constructor(fn: TaskFn<T, Args>) {
    this.fn = fn;
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
   *
   * @example
   * ```typescript
   * const task = new Task<User>((signal) =>
   *   fetch("/api/users/me", { signal }).then(r => r.json())
   * );
   * task.setFn((signal) => fetch(`/api/users/${id}`, { signal }).then(r => r.json()));
   * await task.run();
   * ```
   */
  setFn(fn: TaskFn<T, Args>) {
    this.cancel();
    this.fn = fn;
  }

  /**
   * Executes the TaskFn and updates state reactively.
   *
   * - Aborts any previous in-flight request (latest wins)
   * - Sets isLoading true, clears error
   * - On success: updates data, clears error, sets isLoading false
   * - On error: preserves data, sets error, sets isLoading false
   * - On abort: preserves data, sets isLoading false, no error
   *
   * @example
   * ```typescript
   * await task.run(); // fetches and updates state
   * await task.run(); // aborts previous, fetches again
   * ```
   */
  private async runInternal(args: Args): Promise<void> {
    const currentRequestId = ++this.requestId;
    this.abortController?.abort();
    this.abortController = new AbortController();

    this._state = {
      ...this._state,
      isLoading: true,
      isStale: false,
      error: undefined,
    };
    this._notify();

    try {
      const data = await this.fn(this.abortController.signal, ...args);
      if (currentRequestId !== this.requestId) return;
      this._state = {
        data,
        error: undefined,
        isLoading: false,
        isStale: false,
      };
      this.abortController = null;
    } catch (err) {
      if (currentRequestId !== this.requestId) return;
      if (isAbortError(err)) {
        this._state = { ...this._state, isLoading: false };
        this.abortController = null;
        this._notify();
        return;
      }
      this._state = { ...this._state, error: err, isLoading: false };
      this.abortController = null;
    }

    this._notify();
  }

  /**
   * Executes the TaskFn and updates state reactively.
   *
   * @param args - Arguments forwarded to the TaskFn
   *
   * @example
   * ```typescript
   * await task.run();
   * await task.run(userId, includeFlags);
   * ```
   */
  async run(...args: Args): Promise<void> {
    return this.runInternal(args);
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
   *   console.log('State changed:', state);
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
   * @param data - The data to resolve with
   *
   * @example
   * ```typescript
   * // Skip fetch if we already have the data
   * if (cachedUser) {
   *   task.resolve(cachedUser);
   * } else {
   *   await task.run();
   * }
   * ```
   */
  resolve(data: T): void {
    this.requestId += 1;
    this.abortController?.abort();
    this._state = {
      data,
      error: undefined,
      isLoading: false,
      isStale: false,
    };
    this._notify();
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
      this._state = { ...this._state, isLoading: false };
      this._notify();
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
    this._state = createDefaultTaskState<T>();
    this._notify();
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
