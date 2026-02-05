import type { Task, TaskFn, TaskState } from "@gantryland/task";
import type { CacheEvent, CacheStore } from "@gantryland/task-cache";

/**
 * Log severity levels.
 */
export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * Structured log event.
 */
export type LogEvent = {
  level: LogLevel;
  message: string;
  meta?: Record<string, unknown>;
};

/**
 * Logger function signature.
 */
export type Logger = (event: LogEvent) => void;

/**
 * Options for logging TaskFn execution.
 */
export type TaskLoggerOptions = {
  label?: string;
  logger?: Logger;
  now?: () => number;
};

/**
 * Options for logging Task instance state transitions.
 */
export type TaskSubscriptionLoggerOptions = {
  label?: string;
  logger?: Logger;
  now?: () => number;
};

/**
 * Options for logging cache events.
 */
export type CacheLoggerOptions = {
  label?: string;
  logger?: Logger;
};

/**
 * Console logger implementation.
 */
export const consoleLogger: Logger = ({ level, message, meta }) => {
  const method = console[level] ?? console.log;
  if (meta) method(message, meta);
  else method(message);
};

/**
 * Create a logger with an optional prefix.
 */
export const createLogger = (options: { prefix?: string; logger?: Logger } = {}): Logger => {
  const { prefix, logger } = options;
  const base = logger ?? consoleLogger;
  return (event) => {
    const message = prefix ? `${prefix} ${event.message}` : event.message;
    base({ ...event, message });
  };
};

/**
 * Log TaskFn execution start/success/error/abort.
 */
export const logTask =
  <T, Args extends unknown[] = []>(options: TaskLoggerOptions = {}) =>
  (taskFn: TaskFn<T, Args>): TaskFn<T, Args> =>
  async (signal?: AbortSignal, ...args: Args) => {
    const logger = options.logger ?? consoleLogger;
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

/**
 * Subscribe to a Task and log lifecycle transitions.
 */
export const logTaskState = <T, Args extends unknown[] = []>(
  task: Task<T, Args>,
  options: TaskSubscriptionLoggerOptions = {}
): (() => void) => {
  const logger = options.logger ?? consoleLogger;
  const label = options.label ?? "task";
  const now = options.now ?? Date.now;
  let lastState: TaskState<T> | undefined;
  let lastStart = 0;

  return task.subscribe((state) => {
    if (!lastState) {
      lastState = state;
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

/**
 * Subscribe to cache events and log them.
 */
export const logCache = (
  store: CacheStore,
  options: CacheLoggerOptions = {}
): (() => void) => {
  const logger = options.logger ?? consoleLogger;
  const label = options.label ?? "cache";
  if (!store.subscribe) return () => undefined;

  return store.subscribe((event: CacheEvent) => {
    logger({
      level: "debug",
      message: `${label} ${event.type}`,
      meta: { key: event.key },
    });
  });
};

/**
 * Detect AbortError.
 */
const isAbortError = (err: unknown): boolean => {
  if (typeof DOMException !== "undefined" && err instanceof DOMException) {
    return err.name === "AbortError";
  }
  return (err as Error).name === "AbortError";
};
