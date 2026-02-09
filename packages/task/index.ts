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
  ...args: Args
) => Promise<T>;

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

const createAbortError = (): Error => {
  if (typeof DOMException !== "undefined") {
    return new DOMException("Aborted", "AbortError");
  }
  const error = new Error("Aborted");
  error.name = "AbortError";
  return error;
};

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
  private requestId = 0;
  private inFlight: {
    requestId: number;
    reject: (reason: Error) => void;
  } | null = null;
  private readonly fn: TaskFn<T, Args>;

  /** Creates a task with a required async function. */
  constructor(fn: TaskFn<T, Args>) {
    this.fn = fn;
  }

  private cancelInFlight(reason: Error): void {
    if (!this.inFlight) return;
    this.inFlight.reject(reason);
    this.inFlight = null;
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
   * Starts loading, clears `error`, cancels any in-flight run, and enforces
   * latest-run-wins. Rejects on failures and cancellations.
   */
  async run(...args: Args): Promise<T> {
    const currentRequestId = ++this.requestId;
    this.cancelInFlight(createAbortError());

    this.updateState({ isLoading: true, isStale: false, error: undefined });

    let settled = false;
    const cancelPromise = new Promise<T>((_resolve, reject) => {
      this.inFlight = {
        requestId: currentRequestId,
        reject: (reason) => {
          if (settled) return;
          settled = true;
          reject(reason);
        },
      };
    });

    let executionPromise: Promise<T>;
    try {
      executionPromise = Promise.resolve(this.fn(...args));
    } catch (error) {
      executionPromise = Promise.reject(error);
    }
    void executionPromise.catch(() => {
      // Prevent unhandled rejections when canceled by a newer run.
    });

    try {
      const data = await Promise.race([executionPromise, cancelPromise]);
      settled = true;
      if (currentRequestId !== this.requestId) {
        throw createAbortError();
      }
      if (this.inFlight?.requestId === currentRequestId) {
        this.inFlight = null;
      }
      this.setState({
        data,
        error: undefined,
        isLoading: false,
        isStale: false,
      });
      return data;
    } catch (err) {
      settled = true;
      if (this.inFlight?.requestId === currentRequestId) {
        this.inFlight = null;
      }
      if (currentRequestId !== this.requestId) {
        throw createAbortError();
      }
      if (isAbortError(err)) {
        if (this._state.isLoading) {
          this.updateState({ isLoading: false });
        }
        throw toError(err);
      }
      const error = toError(err);
      this.updateState({ error, isLoading: false });
      throw error;
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
    if (!this.inFlight) return;
    this.requestId += 1;
    this.cancelInFlight(createAbortError());
    if (this._state.isLoading) {
      this.updateState({ isLoading: false });
    }
  }

  /** Fulfills immediately with provided data and clears any in-flight run. */
  fulfill(data: T): T {
    this.requestId += 1;
    this.cancelInFlight(createAbortError());
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
    this.cancelInFlight(createAbortError());
    this.setState(createDefaultTaskState<T>());
  }
}
