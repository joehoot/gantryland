import type { TaskFn } from "@gantryland/task";

/** Error thrown when output validation fails. */
export class ValidationError extends Error {
  readonly issues: unknown;

  constructor(message = "Validation failed", issues?: unknown) {
    super(message);
    this.name = "ValidationError";
    this.issues = issues;
  }
}

/** Validator contract consumed by `validate(...)`. */
export type Validator<T> = {
  parse: (input: unknown) => T;
};

/**
 * Validates the resolved output of a TaskFn using `validator.parse(...)`.
 *
 * Underlying task errors (including abort) pass through unchanged.
 */
export const validate =
  <T, Args extends unknown[] = []>(validator: Validator<T>) =>
  (taskFn: TaskFn<unknown, Args>): TaskFn<T, Args> =>
  async (signal?: AbortSignal, ...args: Args) =>
    validator.parse(await taskFn(signal, ...args));
