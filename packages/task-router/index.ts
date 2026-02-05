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
  run: (params?: RouteParams, ...args: Args) => Promise<void>;
};

/**
 * Match a path against a pattern like "/users/:id".
 */
export const matchRoute = (pattern: string, path: string): RouteMatch | null => {
  const patternSegments = trimSlashes(pattern).split("/").filter(Boolean);
  const pathSegments = trimSlashes(path).split("/").filter(Boolean);
  if (patternSegments.length !== pathSegments.length) return null;

  const params: RouteParams = {};
  for (let i = 0; i < patternSegments.length; i += 1) {
    const patternSegment = patternSegments[i];
    const pathSegment = pathSegments[i];
    if (patternSegment.startsWith(":")) {
      params[patternSegment.slice(1)] = decodeURIComponent(pathSegment);
      continue;
    }
    if (patternSegment !== pathSegment) return null;
  }

  return { params, path };
};

/**
 * Build a path from a pattern and params.
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
 * Create a Task that reads params from a mutable source.
 */
export const createRouteTask = <T, Args extends unknown[] = []>(
  taskForParams: (params: RouteParams) => TaskFn<T, Args>,
  initialParams: RouteParams = {}
): RouteTask<T, Args> => {
  let currentParams = { ...initialParams };
  const task = new Task<T, Args>((signal, ...args) =>
    taskForParams(currentParams)(signal, ...args)
  );

  const setParams = (params: RouteParams) => {
    currentParams = { ...params };
  };

  const getParams = () => ({ ...currentParams });

  const run = async (params?: RouteParams, ...args: Args) => {
    if (params) setParams(params);
    await task.run(...args);
  };

  return { task, getParams, setParams, run };
};

/**
 * Create a RouteTask from a path pattern.
 */
export const createPathTask = <T, Args extends unknown[] = []>(
  pattern: string,
  taskForParams: (params: RouteParams) => TaskFn<T, Args>,
  initialPath?: string
): RouteTask<T, Args> & {
  runPath: (path: string, ...args: Args) => Promise<void>;
} => {
  const initialMatch = initialPath ? matchRoute(pattern, initialPath) : null;
  const routeTask = createRouteTask(taskForParams, initialMatch?.params ?? {});

  const runPath = async (path: string, ...args: Args) => {
    const match = matchRoute(pattern, path);
    if (!match) throw new Error(`Path does not match pattern: ${pattern}`);
    await routeTask.run(match.params, ...args);
  };

  return { ...routeTask, runPath };
};

/**
 * Normalize leading/trailing slashes.
 */
const trimSlashes = (value: string): string => value.replace(/^\/+|\/+$/g, "");
