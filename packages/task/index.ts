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
export type TaskFn<T, Args extends unknown[] = []> = (
  signal: AbortSignal | null,
  ...args: Args
) => Promise<T>;

/** Async function signature executed by `Task.run()` without signal support. */
export type PlainTaskFn<T, Args extends unknown[] = []> = (
  ...args: Args
) => Promise<T>;

type TaskMode = "auto" | "signal" | "plain";

const isAbortError = (err: unknown): boolean =>
  (err instanceof Error && err.name === "AbortError") ||
  (typeof err === "object" &&
    err !== null &&
    "name" in err &&
    (err as { name?: unknown }).name === "AbortError");

const toError = (err: unknown): Error =>
  err instanceof Error ? err : new Error(String(err));

const toReadonlyState = <T>(state: TaskState<T>): Readonly<TaskState<T>> =>
  Object.freeze(state);

const createDefaultTaskState = <T>(): Readonly<TaskState<T>> =>
  toReadonlyState({
    data: undefined,
    error: undefined,
    isLoading: false,
    isStale: true,
  });

/**
 * Minimal async primitive with reactive state and latest-run-wins semantics.
 *
 * The Task instance is the state identity: share the instance to share state.
 */
export class Task<T, Args extends unknown[] = []> {
  private _state: Readonly<TaskState<T>> = createDefaultTaskState<T>();
  private readonly listeners = new Set<Listener<T>>();
  private abortController: AbortController | null = null;
  private requestId = 0;
  private readonly fn: TaskFn<T, Args> | PlainTaskFn<T, Args>;
  private readonly mode: TaskMode;

  /** Creates a task with a required task function (signal-aware or plain). */
  constructor(fn: TaskFn<T, Args>, options?: { mode?: "auto" | "signal" });
  constructor(fn: PlainTaskFn<T, Args>, options?: { mode?: "auto" | "plain" });
  constructor(
    fn: TaskFn<T, Args> | PlainTaskFn<T, Args>,
    options?: { mode?: TaskMode },
  ) {
    this.fn = fn;
    this.mode = options?.mode ?? "auto";
  }

  private executeFn(signal: AbortSignal | null, args: Args): Promise<T> {
    if (this.mode === "signal") {
      return (this.fn as TaskFn<T, Args>)(signal, ...args);
    }
    if (this.mode === "plain") {
      return (this.fn as PlainTaskFn<T, Args>)(...args);
    }

    if (this.fn.length === 0 || this.fn.length === args.length) {
      return (this.fn as PlainTaskFn<T, Args>)(...args);
    }
    return (this.fn as TaskFn<T, Args>)(signal, ...args);
  }

  private setState(state: TaskState<T>): void {
    this._state = toReadonlyState(state);
    this.notify();
  }

  private updateState(partial: Partial<TaskState<T>>): void {
    this._state = toReadonlyState({ ...this._state, ...partial });
    this.notify();
  }

  private notify() {
    for (const listener of this.listeners) {
      try {
        listener(this._state);
      } catch (error) {
        console.error("Task listener error", error);
      }
    }
  }

  /**
   * Executes the current `TaskFn`.
   *
   * Starts loading, clears `error`, aborts any in-flight run, and enforces
   * latest-run-wins. Returns `undefined` on error, abort, or superseded runs.
   */
  async run(...args: Args): Promise<T | undefined> {
    const currentRequestId = ++this.requestId;
    this.abortController?.abort();
    this.abortController = new AbortController();

    this.updateState({ isLoading: true, isStale: false, error: undefined });

    try {
      const data = await this.executeFn(this.abortController.signal, args);
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

  /** Returns an immutable snapshot of current task state. */
  getState(): Readonly<TaskState<T>> {
    return this._state;
  }

  /**
   * Subscribes to state changes.
   *
   * The listener receives the current state immediately and then every update.
   */
  subscribe(listener: Listener<T>): Unsubscribe {
    this.listeners.add(listener);
    try {
      listener(this._state);
    } catch (error) {
      console.error("Task listener error", error);
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Cancels any in-flight run and clears `isLoading`. */
  cancel(): void {
    if (!this.abortController) return;
    this.requestId += 1;
    this.abortController.abort();
    this.abortController = null;
    if (this._state.isLoading) {
      this.updateState({ isLoading: false });
    }
  }

  /** Fulfills immediately with provided data and clears any in-flight run. */
  fulfill(data: T): T {
    this.requestId += 1;
    this.abortController?.abort();
    this.abortController = null;
    this.setState({
      data,
      error: undefined,
      isLoading: false,
      isStale: false,
    });
    return data;
  }

  /** Aborts any in-flight run and restores the initial stale state. */
  reset(): void {
    this.requestId += 1;
    this.abortController?.abort();
    this.abortController = null;
    this.setState(createDefaultTaskState<T>());
  }
}
