import type { Task, TaskFn, TaskState } from "@gantryland/task";

/**
 * A minimal observer interface.
 */
export type Observer<T> = {
  next: (value: T) => void;
  error?: (error: unknown) => void;
  complete?: () => void;
};

/**
 * A minimal subscription interface.
 */
export type Subscription = {
  unsubscribe: () => void;
};

/**
 * Minimal observable interface.
 */
export type Observable<T> = {
  subscribe: (
    observer: Observer<T> | ((value: T) => void)
  ) => Subscription;
};

/**
 * Create a minimal observable from a subscribe function.
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
 */
export const fromTaskState = <T>(task: Task<T>): Observable<TaskState<T>> =>
  createObservable((observer) => task.subscribe(observer.next));

/**
 * Convert a Task into an Observable of resolved data.
 */
export const fromTask = <T>(task: Task<T>): Observable<T> =>
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
 * Convert an Observable into a TaskFn. Only the first value is used.
 */
export const toTask = <T>(observable: Observable<T>): TaskFn<T> =>
  (signal?: AbortSignal) =>
    new Promise<T>((resolve, reject) => {
      if (signal?.aborted) {
        reject(createAbortError());
        return;
      }

      const subscription = observable.subscribe({
        next: (value) => {
          signal?.removeEventListener("abort", onAbort);
          subscription.unsubscribe();
          resolve(value);
        },
        error: (err) => {
          signal?.removeEventListener("abort", onAbort);
          subscription.unsubscribe();
          reject(err);
        },
      });

      const onAbort = () => {
        signal?.removeEventListener("abort", onAbort);
        subscription.unsubscribe();
        reject(createAbortError());
      };

      signal?.addEventListener("abort", onAbort, { once: true });
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
