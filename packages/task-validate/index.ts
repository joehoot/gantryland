import type { TaskFn } from "@gantryland/task";

/**
 * Error thrown when validation fails.
 *
 * Carries an optional issues payload from the validator.
 *
 * @example
 * ```typescript
 * try {
 *   await task.run();
 * } catch (err) {
 *   if (err instanceof ValidationError) {
 *     console.error(err.issues);
 *   }
 * }
 * ```
 */
export class ValidationError extends Error {
  readonly issues: unknown;

  /**
   * Create a ValidationError.
   *
   * @param message - Error message for the validation failure.
   * @param issues - Optional issues payload from the validator.
   */
  constructor(message = "Validation failed", issues?: unknown) {
    super(message);
    this.name = "ValidationError";
    this.issues = issues;
  }
}

/**
 * Validator with a parse method.
 *
 * The parse method should throw ValidationError on failure.
 *
 * @template T - Parsed output type.
 */
export type Validator<T> = {
  parse: (input: unknown) => T;
};

/**
 * Validate the output of a TaskFn.
 *
 * Resolves with the parsed value when validation succeeds.
 * Rejects with ValidationError when validation fails. Errors from the
 * underlying TaskFn, including AbortError, are passed through.
 *
 * @template T - Parsed output type.
 * @template Args - TaskFn argument list.
 * @param validator - Validator applied to the TaskFn output.
 * @returns A combinator that wraps a TaskFn with validation.
 *
 * @example
 * ```typescript
 * import { pipe } from "@gantryland/task-combinators";
 * import { validate, fromSafeParse } from "@gantryland/task-validate";
 *
 * const taskFn = pipe(fetchUser, validate(fromSafeParse(User.safeParse)));
 * ```
 */
export const validate =
  <T, Args extends unknown[] = []>(validator: Validator<T>) =>
  (taskFn: TaskFn<unknown, Args>): TaskFn<T, Args> =>
  async (signal?: AbortSignal, ...args: Args) =>
    validator.parse(await taskFn(signal, ...args));

/**
 * Create a validator from a safeParse-style API (zod/io-ts/valibot style).
 *
 * Throws ValidationError with the safeParse error payload as issues.
 *
 * @template T - Parsed output type.
 * @param safeParse - Function that returns a success flag and data or error.
 * @returns A Validator that throws ValidationError on failure.
 *
 * @example
 * ```typescript
 * import { z } from "zod";
 * import { fromSafeParse } from "@gantryland/task-validate";
 *
 * const User = z.object({ id: z.string() });
 * const validator = fromSafeParse(User.safeParse);
 * ```
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
 *
 * Throws ValidationError with the provided error payload as issues.
 *
 * @template T - Parsed output type.
 * @param predicate - Type guard that validates the input.
 * @param error - Optional issues payload for failures.
 * @returns A Validator that throws ValidationError on failure.
 *
 * @example
 * ```typescript
 * import { fromPredicate } from "@gantryland/task-validate";
 *
 * const isUser = (input: unknown): input is { id: string } =>
 *   !!input && typeof (input as { id: string }).id === "string";
 *
 * const validator = fromPredicate(isUser, { reason: "invalid user" });
 * ```
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
