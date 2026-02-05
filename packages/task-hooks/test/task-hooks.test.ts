/* @vitest-environment jsdom */
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Task } from "@gantryland/task";
import {
  useTask,
  useTaskAbort,
  useTaskError,
  useTaskOnce,
  useTaskResult,
  useTaskRun,
  useTaskState,
} from "../index";

const defaultState = {
  data: undefined,
  error: undefined,
  isLoading: false,
  isStale: true,
};

describe("useTaskOnce", () => {
  it("runs the task on mount when stale", async () => {
    const task = new Task(async () => "ok");
    const runSpy = vi.spyOn(task, "run").mockResolvedValue();

    renderHook(() => useTaskOnce(task));

    await waitFor(() => expect(runSpy).toHaveBeenCalledTimes(1));
  });

  it("does not run when disabled or predicate returns false", async () => {
    const task = new Task(async () => "ok");
    const runSpy = vi.spyOn(task, "run").mockResolvedValue();

    renderHook(() => useTaskOnce(task, { enabled: false }));
    renderHook(() => useTaskOnce(task, { when: () => false }));

    await waitFor(() => expect(runSpy).not.toHaveBeenCalled());
  });

  it("ignores later task changes", async () => {
    const first = new Task(async () => "first");
    const second = new Task(async () => "second");
    const firstSpy = vi.spyOn(first, "run").mockResolvedValue();
    const secondSpy = vi.spyOn(second, "run").mockResolvedValue();

    const { rerender } = renderHook(({ task }) => useTaskOnce(task), {
      initialProps: { task: first },
    });

    await waitFor(() => expect(firstSpy).toHaveBeenCalledTimes(1));
    rerender({ task: second });

    await waitFor(() => expect(secondSpy).not.toHaveBeenCalled());
  });

  it("does not run when already settled", async () => {
    const task = new Task(async () => "ok");
    task.resolveWith("cached");
    const runSpy = vi.spyOn(task, "run").mockResolvedValue();

    renderHook(() => useTaskOnce(task));

    await waitFor(() => expect(runSpy).not.toHaveBeenCalled());
  });
});

describe("useTaskRun", () => {
  it("returns a stable run callback for the same task", () => {
    const task = new Task(async () => "ok");
    const { result, rerender } = renderHook(({ task }) => useTaskRun(task), {
      initialProps: { task },
    });

    const firstRun = result.current;
    rerender({ task });
    expect(result.current).toBe(firstRun);
  });

  it("auto-runs when enabled and deps change", async () => {
    const task = new Task(async () => "ok");
    const runSpy = vi.spyOn(task, "run").mockResolvedValue();

    const { rerender } = renderHook(
      ({ dep }) => useTaskRun(task, { auto: true, deps: [dep] }),
      { initialProps: { dep: 1 } }
    );

    await waitFor(() => expect(runSpy).toHaveBeenCalledTimes(1));
    rerender({ dep: 2 });
    await waitFor(() => expect(runSpy).toHaveBeenCalledTimes(2));
  });

  it("returns a no-op when task is null", async () => {
    const { result } = renderHook(() => useTaskRun(null));
    await expect(result.current()).resolves.toBeUndefined();
  });
});

describe("useTaskState", () => {
  it("returns default state for null task", () => {
    const { result } = renderHook(() => useTaskState(null));
    expect(result.current).toEqual(defaultState);
  });

  it("uses fallback and selector when provided", () => {
    const fallback = {
      data: [],
      error: undefined,
      isLoading: false,
      isStale: false,
    } as const;

    const { result } = renderHook(() =>
      useTaskState(null, {
        fallbackState: fallback,
        select: (state) => state.isStale,
      })
    );

    expect(result.current).toBe(false);
  });

  it("updates when task state changes", () => {
    const task = new Task(async () => "ok");
    const { result } = renderHook(() => useTaskState(task));

    expect(result.current.isStale).toBe(true);
    act(() => {
      task.resolveWith("value");
    });

    expect(result.current.data).toBe("value");
    expect(result.current.isStale).toBe(false);
  });
});

describe("useTaskResult", () => {
  it("returns full state with fallback", () => {
    const fallback = {
      data: "value",
      error: undefined,
      isLoading: false,
      isStale: false,
    } as const;

    const { result } = renderHook(() => useTaskResult(null, { fallbackState: fallback }));
    expect(result.current).toEqual(fallback);
  });
});

describe("useTaskError", () => {
  it("selects the error field", async () => {
    const task = new Task(async () => "ok");
    const { result } = renderHook(() => useTaskError(task));

    const error = new Error("boom");
    task.define(async () => {
      throw error;
    });

    await act(async () => {
      await task.run();
    });

    await waitFor(() => expect(result.current).toBe(error));
  });
});

describe("useTaskAbort", () => {
  it("returns a cancel callback", () => {
    const task = new Task(async () => "ok");
    const cancelSpy = vi.spyOn(task, "cancel");
    const { result } = renderHook(() => useTaskAbort(task));

    result.current();
    expect(cancelSpy).toHaveBeenCalledTimes(1);
  });

  it("is safe when task is null", () => {
    const { result } = renderHook(() => useTaskAbort(null));
    expect(() => result.current()).not.toThrow();
  });
});

describe("useTask", () => {
  it("creates a Task from a TaskFn and keeps it stable", () => {
    const fn = vi.fn(async () => "ok");
    const { result, rerender } = renderHook(({ taskFn }) => useTask(taskFn), {
      initialProps: { taskFn: fn },
    });

    const [task] = result.current;
    const nextFn = vi.fn(async () => "changed");
    rerender({ taskFn: nextFn });
    expect(result.current[0]).toBe(task);
  });

  it("uses factory mode to create a Task once", () => {
    const factory = vi.fn(() => new Task(async () => "ok"));
    const { result, rerender } = renderHook(() => useTask(factory, { mode: "factory" }));

    const [task] = result.current;
    rerender();
    expect(result.current[0]).toBe(task);
    expect(factory).toHaveBeenCalledTimes(1);
  });
});
