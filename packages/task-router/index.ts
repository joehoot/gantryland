import { Task, type TaskFn } from "@gantryland/task";

/**
 * Route params map.
 */
export type RouteParams = Record<string, string>;

/**
 * Route match result.
 */
export type RouteMatch = {
  params: RouteParams;
  path: string;
};

/**
 * A Task wrapper that tracks route params.
 */
export type RouteTask<T, Args extends unknown[] = []> = {
  task: Task<T, Args>;
  getParams: () => RouteParams;
  setParams: (params: RouteParams) => void;
  run: (params?: RouteParams, ...args: Args) => Promise<T | undefined>;
};

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
export const matchRoute = (
  pattern: string,
  path: string,
): RouteMatch | null => {
  const patternSegments = trimSlashes(pattern).split("/").filter(Boolean);
  const pathSegments = trimSlashes(path).split("/").filter(Boolean);
  if (patternSegments.length !== pathSegments.length) return null;

  const params: RouteParams = {};
  for (let i = 0; i < patternSegments.length; i += 1) {
    const patternSegment = patternSegments[i];
    const pathSegment = pathSegments[i];
    if (patternSegment === undefined || pathSegment === undefined) {
      return null;
    }
    if (patternSegment.startsWith(":")) {
      try {
        params[patternSegment.slice(1)] = decodeURIComponent(pathSegment);
      } catch {
        return null;
      }
      continue;
    }
    if (patternSegment !== pathSegment) return null;
  }

  return { params, path };
};

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
export const buildPath = (pattern: string, params: RouteParams): string => {
  const segments = trimSlashes(pattern).split("/").filter(Boolean);
  const resolved = segments.map((segment) => {
    if (!segment.startsWith(":")) return segment;
    const key = segment.slice(1);
    const value = params[key];
    if (value === undefined) {
      throw new Error(`Missing route param: ${key}`);
    }
    return encodeURIComponent(value);
  });
  return `/${resolved.join("/")}`;
};

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
export const createRouteTask = <T, Args extends unknown[] = []>(
  taskForParams: (params: RouteParams) => TaskFn<T, Args>,
  initialParams: RouteParams = {},
): RouteTask<T, Args> => {
  let currentParams = { ...initialParams };
  const task = new Task<T, Args>((signal, ...args) =>
    taskForParams(currentParams)(signal, ...args),
  );

  const setParams = (params: RouteParams) => {
    currentParams = { ...params };
  };

  const getParams = () => ({ ...currentParams });

  const run = async (params?: RouteParams, ...args: Args) => {
    if (params) setParams(params);
    return task.run(...args);
  };

  return { task, getParams, setParams, run };
};

/**
 * Create a RouteTask from a path pattern.
 *
 * runPath matches the path and throws when the pattern does not match.
 * If initialPath matches, its params seed the task.
 *
 * run and runPath resolve to data on success or undefined on error, abort, or
 * superseded runs (Task latest-wins).
 *
 * @template T - Task data type
 * @template Args - Arguments forwarded to the TaskFn
 * @param pattern - Pattern with ":param" segments
 * @param taskForParams - Factory that maps params to a TaskFn
 * @param initialPath - Optional path to seed initial params
 * @returns RouteTask wrapper with runPath convenience
 *
 * @example
 * ```typescript
 * const userTask = createPathTask("/users/:id", (params) => (signal) =>
 *   fetch(`/api/users/${params.id}`, { signal }).then((r) => r.json())
 * );
 * await userTask.runPath("/users/123");
 * ```
 */
export const createPathTask = <T, Args extends unknown[] = []>(
  pattern: string,
  taskForParams: (params: RouteParams) => TaskFn<T, Args>,
  initialPath?: string,
): RouteTask<T, Args> & {
  runPath: (path: string, ...args: Args) => Promise<T | undefined>;
} => {
  const initialMatch = initialPath ? matchRoute(pattern, initialPath) : null;
  const routeTask = createRouteTask(taskForParams, initialMatch?.params ?? {});

  const runPath = async (path: string, ...args: Args) => {
    const match = matchRoute(pattern, path);
    if (!match) throw new Error(`Path does not match pattern: ${pattern}`);
    return routeTask.run(match.params, ...args);
  };

  return { ...routeTask, runPath };
};

/**
 * Normalize leading/trailing slashes.
 */
const trimSlashes = (value: string): string => value.replace(/^\/+|\/+$/g, "");
