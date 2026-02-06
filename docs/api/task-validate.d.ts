// API baseline for @gantryland/task-validate
import type { TaskFn } from "@gantryland/task";
/** Error thrown when output validation fails. */
export declare class ValidationError extends Error {
    readonly issues: unknown;
    constructor(message?: string, issues?: unknown);
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
export declare const validate: <T, Args extends unknown[] = []>(validator: Validator<T>) => (taskFn: TaskFn<unknown, Args>) => TaskFn<T, Args>;
//# sourceMappingURL=index.d.ts.map