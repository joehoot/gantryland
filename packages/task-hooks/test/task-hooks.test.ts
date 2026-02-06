/* @vitest-environment jsdom */
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Task } from "@gantryland/task";
import {
  useTask,
  useTaskAbort,
  useTaskOnce,
  useTaskRun,
  useTaskState,
} from "../index";

describe("useTaskOnce", () => {
  it("runs the task on mount when stale", async () => {
    const task = new Task(async () => "ok");
    const runSpy = vi.spyOn(task, "run").mockResolvedValue(undefined);

    renderHook(() => useTaskOnce(task));

    await waitFor(() => expect(runSpy).toHaveBeenCalledTimes(1));
  });

  it("does not run when already settled", async () => {
    const task = new Task(async () => "ok");
    await task.run();
    const runSpy = vi.spyOn(task, "run").mockResolvedValue(undefined);

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
});

describe("useTaskState", () => {
  it("returns full state and updates on task state changes", async () => {
    const task = new Task(async () => "ok");
    const { result } = renderHook(() => useTaskState(task));

    expect(result.current.isStale).toBe(true);
    await act(async () => {
      await task.run();
    });

    expect(result.current.data).toBe("ok");
    expect(result.current.isStale).toBe(false);
  });

  it("supports selecting a state slice", async () => {
    const task = new Task(async () => "ok");
    const { result } = renderHook(() =>
      useTaskState(task, (state) => state.data),
    );

    expect(result.current).toBe(undefined);
    await act(async () => {
      await task.run();
    });
    expect(result.current).toBe("ok");
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
});
