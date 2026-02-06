// API baseline for @gantryland/task-router
import { Task, type TaskFn } from "@gantryland/task";
/**
 * Route params map.
 */
export type RouteParams = Record<string, string>;
/**
 * Match a path against a pattern like "/users/:id".
 *
 * Returns decoded params when the pattern matches the full path.
 * Returns null when segments differ or literals do not match.
 *
 * @param pattern - Pattern with ":param" segments
 * @param path - Path to match against the pattern
 * @returns Route match with decoded params, or null when no match
 *
 * @example
 * ```typescript
 * const match = matchRoute("/users/:id", "/users/abc%20123");
 * // match?.params.id === "abc 123"
 * ```
 */
export declare const matchRoute: (pattern: string, path: string) => {
    params: RouteParams;
    path: string;
} | null;
/**
 * Build a path from a pattern and params.
 *
 * Encodes param values and throws when a required param is missing.
 *
 * @param pattern - Pattern with ":param" segments
 * @param params - Params to inject into the pattern
 * @returns Resolved path with a leading slash
 *
 * @example
 * ```typescript
 * const path = buildPath("/users/:id", { id: "a b" });
 * // "/users/a%20b"
 * ```
 */
export declare const buildPath: (pattern: string, params: RouteParams) => string;
/**
 * Create a Task wrapper that reads params from a mutable source.
 *
 * Uses the latest params snapshot when run is called. run(params) updates
 * the params before delegating to Task.run.
 * getParams returns a copy, so mutation does not affect internal params.
 *
 * run resolves to data on success or undefined on error, abort, or superseded
 * runs (Task latest-wins).
 *
 * @template T - Task data type
 * @template Args - Arguments forwarded to the TaskFn
 * @param taskForParams - Factory that maps params to a TaskFn
 * @param initialParams - Initial params snapshot
 * @returns RouteTask wrapper with helpers for params and run
 *
 * @example
 * ```typescript
 * const userTask = createRouteTask((params) => (signal) =>
 *   fetch(`/api/users/${params.id}`, { signal }).then((r) => r.json())
 * );
 * await userTask.run({ id: "123" });
 * ```
 */
export declare const createRouteTask: <T, Args extends unknown[] = []>(taskForParams: (params: RouteParams) => TaskFn<T, Args>, initialParams?: RouteParams) => {
    task: Task<T, Args>;
    getParams: () => RouteParams;
    setParams: (params: RouteParams) => void;
    run: (params?: RouteParams, ...args: Args) => Promise<T | undefined>;
};
//# sourceMappingURL=index.d.ts.map