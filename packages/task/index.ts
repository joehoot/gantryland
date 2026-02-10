/** Reactive task state snapshot. */
export type TaskState<T> = {
  data: T | undefined;
  error: Error | undefined;
  isLoading: boolean;
  isStale: boolean;
};

type Listener<T> = (state: TaskState<T>) => void;
type Unsubscribe = () => void;

/** Async function signature used by `Task.run()`. */
export type TaskFn<T, Args extends unknown[] = []> = (
  ...args: Args
) => Promise<T>;

/** Function wrapper that transforms one task function into another. */
export type TaskOperator<In, Out, Args extends unknown[] = []> = (
  taskFn: TaskFn<In, Args>,
) => TaskFn<Out, Args>;

const isAbortError = (err: unknown): boolean =>
  (err instanceof Error && err.name === "AbortError") ||
  (typeof err === "object" &&
    err !== null &&
    "name" in err &&
    (err as { name?: unknown }).name === "AbortError");

const toError = (err: unknown): Error =>
  err instanceof Error ? err : new Error(String(err));

const createAbortError = (): Error => {
  const error = new Error("Aborted");
  error.name = "AbortError";
  return error;
};

const createDefaultTaskState = <T>(): TaskState<T> => ({
  data: undefined,
  error: undefined,
  isLoading: false,
  isStale: true,
});

/** Minimal async primitive with latest-run-wins state. */
export class Task<T, Args extends unknown[] = []> {
  private _state: TaskState<T> = createDefaultTaskState<T>();
  private readonly listeners = new Set<Listener<T>>();
  private requestId = 0;
  private inFlightReject: ((reason: Error) => void) | null = null;
  private readonly fn: TaskFn<T, Args>;

  /** Create a task from an async function. */
  constructor(fn: TaskFn<T, Args>) {
    this.fn = fn;
  }

  private cancelInFlight(reason: Error): void {
    if (!this.inFlightReject) return;
    this.inFlightReject(reason);
    this.inFlightReject = null;
  }

  private setState(state: TaskState<T>): void {
    this._state = state;
    this.notify();
  }

  private updateState(partial: Partial<TaskState<T>>): void {
    this._state = { ...this._state, ...partial };
    this.notify();
  }

  private notify() {
    for (const listener of this.listeners) {
      listener(this._state);
    }
  }

  /** Run the task function and update state. */
  async run(...args: Args): Promise<T> {
    const currentRequestId = ++this.requestId;
    this.cancelInFlight(createAbortError());

    this.updateState({ isLoading: true, isStale: false, error: undefined });

    const cancelPromise = new Promise<T>((_resolve, reject) => {
      this.inFlightReject = reject;
    });

    let executionPromise: Promise<T>;
    try {
      executionPromise = Promise.resolve(this.fn(...args));
    } catch (error) {
      executionPromise = Promise.reject(error);
    }
    void executionPromise.catch(() => {
      // Ignore late rejections from superseded runs.
    });

    try {
      const data = await Promise.race([executionPromise, cancelPromise]);
      if (currentRequestId !== this.requestId) {
        throw createAbortError();
      }
      this.inFlightReject = null;
      this.setState({
        data,
        error: undefined,
        isLoading: false,
        isStale: false,
      });
      return data;
    } catch (err) {
      this.inFlightReject = null;
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

  /** Return the current state snapshot. */
  getState(): TaskState<T> {
    return this._state;
  }

  /** Subscribe to state changes and receive the current state immediately. */
  subscribe(listener: Listener<T>): Unsubscribe {
    this.listeners.add(listener);
    listener(this._state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Cancel the in-flight run, if any. */
  cancel(): void {
    if (!this.inFlightReject) return;
    this.requestId += 1;
    this.cancelInFlight(createAbortError());
    if (this._state.isLoading) {
      this.updateState({ isLoading: false });
    }
  }

  /** Set successful data immediately and cancel any in-flight run. */
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

  /** Reset to the initial stale/idle state and cancel any in-flight run. */
  reset(): void {
    this.requestId += 1;
    this.cancelInFlight(createAbortError());
    this.setState(createDefaultTaskState<T>());
  }

  /** Compose this task function with operators and return a new task. */
  pipe<U = T>(
    ...operators: Array<TaskOperator<any, any, Args>>
  ): Task<U, Args> {
    let taskFn: TaskFn<any, Args> = this.fn as TaskFn<any, Args>;
    for (const operator of operators) {
      taskFn = operator(taskFn);
    }
    return new Task<U, Args>(taskFn as TaskFn<U, Args>);
  }
}
