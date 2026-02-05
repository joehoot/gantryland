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
export type RouteTask<T> = {
  task: Task<T>;
  getParams: () => RouteParams;
  setParams: (params: RouteParams) => void;
  run: (params?: RouteParams) => Promise<void>;
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
export const createRouteTask = <T>(
  taskForParams: (params: RouteParams) => TaskFn<T>,
  initialParams: RouteParams = {}
): RouteTask<T> => {
  let currentParams = { ...initialParams };
  const task = new Task<T>((signal) => taskForParams(currentParams)(signal));

  const setParams = (params: RouteParams) => {
    currentParams = { ...params };
  };

  const getParams = () => ({ ...currentParams });

  const run = async (params?: RouteParams) => {
    if (params) setParams(params);
    await task.run();
  };

  return { task, getParams, setParams, run };
};

/**
 * Create a RouteTask from a path pattern.
 */
export const createPathTask = <T>(
  pattern: string,
  taskForParams: (params: RouteParams) => TaskFn<T>,
  initialPath?: string
): RouteTask<T> & {
  runPath: (path: string) => Promise<void>;
} => {
  const initialMatch = initialPath ? matchRoute(pattern, initialPath) : null;
  const routeTask = createRouteTask(taskForParams, initialMatch?.params ?? {});

  const runPath = async (path: string) => {
    const match = matchRoute(pattern, path);
    if (!match) throw new Error(`Path does not match pattern: ${pattern}`);
    await routeTask.run(match.params);
  };

  return { ...routeTask, runPath };
};

/**
 * Normalize leading/trailing slashes.
 */
const trimSlashes = (value: string): string => value.replace(/^\/+|\/+$/g, "");
