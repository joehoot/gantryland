import type { Task, TaskFn, TaskState } from "@gantryland/task";

/** Minimal observer interface for Task interop. */
export type Observer<T> = {
  next: (value: T) => void;
  error?: (error: unknown) => void;
  complete?: () => void;
};

/** Minimal subscription interface. */
export type Subscription = {
  unsubscribe: () => void;
};

/** Minimal observable interface. */
export type Observable<T> = {
  subscribe: (observer: Observer<T>) => Subscription;
};

/** Converts a Task into an Observable of TaskState snapshots. */
export const fromTaskState = <T, Args extends unknown[] = []>(
  task: Task<T, Args>,
): Observable<TaskState<T>> => ({
  subscribe: (observer) => ({ unsubscribe: task.subscribe(observer.next) }),
});

/**
 * Converts an Observable into a TaskFn.
 *
 * Resolves on first `next`, rejects on `error`, rejects with AbortError on
 * abort, and always unsubscribes on settle.
 */
export const toTask =
  <T, Args extends unknown[] = []>(
    observable: Observable<T>,
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
        subscription.unsubscribe();
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

const createAbortError = (): Error => {
  if (typeof DOMException !== "undefined") {
    return new DOMException("Aborted", "AbortError");
  }
  const error = new Error("Aborted");
  error.name = "AbortError";
  return error;
};
