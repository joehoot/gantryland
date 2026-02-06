import type { Task, TaskFn, TaskState } from "@gantryland/task";
import type { CacheStore } from "@gantryland/task-cache";

export type LogEvent = {
  level: "debug" | "info" | "warn" | "error";
  message: string;
  meta?: Record<string, unknown>;
};

export type Logger = (event: LogEvent) => void;

const defaultLogger: Logger = ({ level, message, meta }) => {
  const method = console[level] ?? console.log;
  if (meta) method(message, meta);
  else method(message);
};

/** Wraps a TaskFn and logs start/success/error/abort with duration metadata. */
export const logTask =
  <T, Args extends unknown[] = []>(
    options: { label?: string; logger?: Logger; now?: () => number } = {},
  ) =>
  (taskFn: TaskFn<T, Args>): TaskFn<T, Args> =>
  async (signal?: AbortSignal, ...args: Args) => {
    const logger = options.logger ?? defaultLogger;
    const label = options.label ?? "task";
    const now = options.now ?? Date.now;
    const start = now();

    logger({ level: "info", message: `${label} start` });

    try {
      const result = await taskFn(signal, ...args);
      const durationMs = now() - start;
      logger({
        level: "info",
        message: `${label} success`,
        meta: { durationMs },
      });
      return result;
    } catch (error) {
      const durationMs = now() - start;
      if (isAbortError(error)) {
        logger({
          level: "debug",
          message: `${label} abort`,
          meta: { durationMs },
        });
      } else {
        logger({
          level: "error",
          message: `${label} error`,
          meta: { durationMs, error },
        });
      }
      throw error;
    }
  };

/** Subscribes to Task state transitions and logs start/success/error/abort. */
export const logTaskState = <T, Args extends unknown[] = []>(
  task: Task<T, Args>,
  options: { label?: string; logger?: Logger; now?: () => number } = {},
): (() => void) => {
  const logger = options.logger ?? defaultLogger;
  const label = options.label ?? "task";
  const now = options.now ?? Date.now;
  let lastState: TaskState<T> | undefined;
  let lastStart = 0;

  return task.subscribe((state) => {
    if (!lastState) {
      lastState = state;
      if (state.isLoading) {
        lastStart = now();
        logger({ level: "info", message: `${label} start` });
      }
      return;
    }

    if (!lastState.isLoading && state.isLoading) {
      lastStart = now();
      logger({ level: "info", message: `${label} start` });
    }

    if (lastState.isLoading && !state.isLoading) {
      const durationMs = now() - lastStart;
      if (state.error) {
        logger({
          level: "error",
          message: `${label} error`,
          meta: { durationMs, error: state.error },
        });
      } else if (state.data !== lastState.data) {
        logger({
          level: "info",
          message: `${label} success`,
          meta: { durationMs },
        });
      } else {
        logger({
          level: "debug",
          message: `${label} abort`,
          meta: { durationMs },
        });
      }
    }

    lastState = state;
  });
};

/** Subscribes to cache events and logs `${label} ${event.type}` at debug level. */
export const logCache = (
  store: CacheStore,
  options: { label?: string; logger?: Logger } = {},
): (() => void) => {
  const logger = options.logger ?? defaultLogger;
  const label = options.label ?? "cache";
  if (!store.subscribe) return () => undefined;

  return store.subscribe((event) => {
    logger({
      level: "debug",
      message: `${label} ${event.type}`,
      meta: { key: event.key },
    });
  });
};

const isAbortError = (err: unknown): boolean =>
  (err instanceof Error && err.name === "AbortError") ||
  (typeof err === "object" &&
    err !== null &&
    "name" in err &&
    (err as { name?: unknown }).name === "AbortError");
