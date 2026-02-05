import type { TaskFn } from "@gantryland/task";

/**
 * Validation error for schema failures.
 */
export class ValidationError extends Error {
  readonly issues: unknown;

  constructor(message = "Validation failed", issues?: unknown) {
    super(message);
    this.name = "ValidationError";
    this.issues = issues;
  }
}

/**
 * Generic validator interface.
 */
export type Validator<T> = {
  parse: (input: unknown) => T;
};

/**
 * Lightweight validate combinator for a TaskFn.
 */
export const validate =
  <T>(validator: Validator<T>) =>
  (taskFn: TaskFn<unknown>): TaskFn<T> =>
  async (signal?: AbortSignal) => validator.parse(await taskFn(signal));

/**
 * Create a validator from a safeParse-style API (zod/io-ts/valibot style).
 */
export const fromSafeParse = <T>(safeParse: (input: unknown) => {
  success: boolean;
  data?: T;
  error?: unknown;
}): Validator<T> => ({
  parse: (input) => {
    const result = safeParse(input);
    if (result.success) return result.data as T;
    throw new ValidationError("Validation failed", result.error);
  },
});

/**
 * Create a validator from a predicate with an optional error payload.
 */
export const fromPredicate = <T>(
  predicate: (input: unknown) => input is T,
  error?: unknown
): Validator<T> => ({
  parse: (input) => {
    if (predicate(input)) return input;
    throw new ValidationError("Validation failed", error);
  },
});
