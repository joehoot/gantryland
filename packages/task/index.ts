/** Reactive task state snapshot. */
export type TaskState<T> = {
  data: T | undefined;
  error: Error | undefined;
  isLoading: boolean;
  isStale: boolean;
};

type Listener<T> = (state: TaskState<T>) => void;
type Unsubscribe = () => void;
type InFlightRun = {
  requestId: number;
  reject: (reason: Error) => void;
};

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

const toSnapshot = <T>(state: TaskState<T>): TaskState<T> =>
  Object.freeze(state);

/** Minimal async primitive with latest-run-wins state. */
export class Task<T, Args extends unknown[] = []> {
  private _state: TaskState<T> = toSnapshot(createDefaultTaskState<T>());
  private readonly listeners = new Set<Listener<T>>();
  private requestId = 0;
  private inFlight: InFlightRun | null = null;
  private readonly fn: TaskFn<T, Args>;

  /** Create a task from an async function. */
  constructor(fn: TaskFn<T, Args>) {
    this.fn = fn;
  }

  private cancelInFlight(reason: Error): void {
    if (!this.inFlight) return;
    this.inFlight.reject(reason);
    this.inFlight = null;
  }

  private setState(state: TaskState<T>): void {
    this._state = toSnapshot(state);
    this.notify();
  }

  private updateState(partial: Partial<TaskState<T>>): void {
    this._state = toSnapshot({ ...this._state, ...partial });
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
      this.inFlight = {
        requestId: currentRequestId,
        reject,
      };
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

  /** Return the current immutable state snapshot. */
  getState(): TaskState<T> {
    return this._state;
  }

  /** Subscribe to state snapshots and receive the current snapshot immediately. */
  subscribe(listener: Listener<T>): Unsubscribe {
    this.listeners.add(listener);
    listener(this._state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Cancel the in-flight run, if any. */
  cancel(): void {
    if (!this.inFlight) return;
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
  pipe(): Task<T, Args>;
  pipe<A>(operator1: TaskOperator<T, A, Args>): Task<A, Args>;
  pipe<A, B>(
    operator1: TaskOperator<T, A, Args>,
    operator2: TaskOperator<A, B, Args>,
  ): Task<B, Args>;
  pipe<A, B, C>(
    operator1: TaskOperator<T, A, Args>,
    operator2: TaskOperator<A, B, Args>,
    operator3: TaskOperator<B, C, Args>,
  ): Task<C, Args>;
  pipe<A, B, C, D>(
    operator1: TaskOperator<T, A, Args>,
    operator2: TaskOperator<A, B, Args>,
    operator3: TaskOperator<B, C, Args>,
    operator4: TaskOperator<C, D, Args>,
  ): Task<D, Args>;
  pipe<A, B, C, D, E>(
    operator1: TaskOperator<T, A, Args>,
    operator2: TaskOperator<A, B, Args>,
    operator3: TaskOperator<B, C, Args>,
    operator4: TaskOperator<C, D, Args>,
    operator5: TaskOperator<D, E, Args>,
  ): Task<E, Args>;
  pipe(...operators: Array<TaskOperator<any, any, Args>>): Task<any, Args> {
    let taskFn: TaskFn<any, Args> = this.fn as TaskFn<any, Args>;
    for (const operator of operators) {
      taskFn = operator(taskFn);
    }
    return new Task(taskFn);
  }
}
