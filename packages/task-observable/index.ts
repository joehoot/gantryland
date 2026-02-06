import type { Task, TaskFn, TaskState } from "@gantryland/task";

/**
 * Minimal observer interface for small interop layers.
 *
 * @template T - Emitted value type
 */
export type Observer<T> = {
  next: (value: T) => void;
  error?: (error: unknown) => void;
  complete?: () => void;
};

/**
 * Minimal subscription interface.
 */
export type Subscription = {
  unsubscribe: () => void;
};

/**
 * Minimal observable interface.
 *
 * @template T - Emitted value type
 */
export type Observable<T> = {
  subscribe: (
    observer: Observer<T> | ((value: T) => void)
  ) => Subscription;
};

/**
 * Create a minimal observable from a subscribe function.
 *
 * Normalizes function observers to `{ next }`.
 * Returns a no-op unsubscribe when the subscribe function does not provide one.
 *
 * @template T - Emitted value type
 * @param subscribe - Subscription handler that receives the normalized observer
 * @returns An Observable with a minimal `subscribe` API
 *
 * @example
 * ```typescript
 * const observable = createObservable<string>((observer) => {
 *   observer.next("ready");
 *   return () => {
 *     // cleanup
 *   };
 * });
 * ```
 */
export const createObservable = <T>(
  subscribe: (observer: Observer<T>) => (() => void) | void
): Observable<T> => ({
  subscribe: (observer) => {
    const normalized: Observer<T> =
      typeof observer === "function" ? { next: observer } : observer;
    const unsubscribe = subscribe(normalized) ?? (() => undefined);
    return { unsubscribe };
  },
});

/**
 * Convert a Task into an Observable of TaskState.
 *
 * Emits every Task state change in order.
 *
 * @template T - Task resolved data type
 * @template Args - Task argument tuple
 * @param task - Task instance to observe
 * @returns Observable that emits TaskState updates
 *
 * @example
 * ```typescript
 * const task = new Task(fetchUsers);
 * const subscription = fromTaskState(task).subscribe((state) => {
 *   console.log(state.isLoading, state.error, state.data);
 * });
 * ```
 */
export const fromTaskState = <T, Args extends unknown[] = []>(
  task: Task<T, Args>
): Observable<TaskState<T>> =>
  createObservable((observer) => task.subscribe(observer.next));

/**
 * Convert a Task into an Observable of resolved data.
 *
 * Emits when the Task is not loading, not stale, and has defined data.
 * Only emits when the data reference changes.
 * Forwards Task errors to `observer.error`.
 *
 * @template T - Task resolved data type
 * @template Args - Task argument tuple
 * @param task - Task instance to observe
 * @returns Observable that emits resolved Task data
 *
 * @example
 * ```typescript
 * const task = new Task(fetchProjects);
 * const subscription = fromTask(task).subscribe((projects) => {
 *   console.log(projects.length);
 * });
 * ```
 */
export const fromTask = <T, Args extends unknown[] = []>(
  task: Task<T, Args>
): Observable<T> =>
  createObservable((observer) => {
    let last: T | undefined;
    return task.subscribe((state) => {
      if (state.error) {
        observer.error?.(state.error);
        return;
      }
      if (!state.isLoading && !state.isStale && state.data !== undefined) {
        if (state.data !== last) {
          last = state.data;
          observer.next(state.data);
        }
      }
    });
  });

/**
 * Convert an Observable into a TaskFn.
 *
 * Resolves on the first `next` value, rejects on `error`, and rejects with AbortError on abort.
 * Unsubscribes on resolve, reject, or abort to avoid leaks.
 * Does not resolve on `complete` without a `next` value.
 *
 * @template T - Observable value type
 * @template Args - Task argument tuple
 * @param observable - Observable to consume
 * @returns TaskFn that resolves on the first observable value
 *
 * @example
 * ```typescript
 * const observable = createObservable<string>((observer) => {
 *   observer.next("ready");
 * });
 * const taskFn = toTask(observable);
 * const result = await taskFn();
 * ```
 */
export const toTask = <T, Args extends unknown[] = []>(
  observable: Observable<T>
): TaskFn<T, Args> =>
  (signal?: AbortSignal, ..._args: Args) =>
    new Promise<T>((resolve, reject) => {
      if (signal?.aborted) {
        reject(createAbortError());
        return;
      }

      let settled = false;
      let subscription: Subscription = { unsubscribe: () => undefined };

      const cleanup = () => {
        if (settled) return;
        settled = true;
        signal?.removeEventListener("abort", onAbort);
        subscription?.unsubscribe();
      };

      const onAbort = () => {
        cleanup();
        reject(createAbortError());
      };

      signal?.addEventListener("abort", onAbort, { once: true });

      const returned = observable.subscribe({
        next: (value) => {
          cleanup();
          resolve(value);
        },
        error: (err) => {
          cleanup();
          reject(err);
        },
        complete: () => {
          cleanup();
        },
      });

      subscription = returned;
      if (settled) {
        subscription.unsubscribe();
      }
    });

/**
 * Create an AbortError for environments without DOMException.
 */
const createAbortError = (): Error => {
  if (typeof DOMException !== "undefined") {
    return new DOMException("Aborted", "AbortError");
  }
  const error = new Error("Aborted");
  error.name = "AbortError";
  return error;
};
