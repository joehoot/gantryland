import { Task } from "@gantryland/task";
import { createElement } from "react";
import { act, create } from "react-test-renderer";
import { describe, expect, it } from "vitest";
import { useTask, useTaskState } from "../index";

describe("task-react", () => {
  it("useTaskState mirrors task state updates", async () => {
    const task = new Task<string, [string]>(async (_signal, value) => value);
    let firstSnapshot: ReturnType<typeof task.getState> | undefined;
    let latestSnapshot: ReturnType<typeof task.getState> | undefined;

    const Harness = () => {
      const state = useTaskState(task);
      if (!firstSnapshot) {
        firstSnapshot = state;
      }
      latestSnapshot = state;
      return null;
    };

    let renderer: ReturnType<typeof create> | undefined;

    await act(async () => {
      renderer = create(createElement(Harness));
    });

    await act(async () => {
      await task.run("ok");
    });

    expect(firstSnapshot).toEqual({
      data: undefined,
      error: undefined,
      isLoading: false,
      isStale: true,
    });
    expect(latestSnapshot).toEqual({
      data: "ok",
      error: undefined,
      isLoading: false,
      isStale: false,
    });

    renderer?.unmount();
  });

  it("useTask exposes run cancel and reset", async () => {
    const task = new Task<string, [string]>(async (_signal, value) => value);
    let latest: ReturnType<typeof useTask<string, [string]>> | undefined;

    const Harness = () => {
      latest = useTask(task);
      return null;
    };

    let renderer: ReturnType<typeof create> | undefined;

    await act(async () => {
      renderer = create(createElement(Harness));
    });

    await act(async () => {
      await latest?.run("hello");
    });

    expect(latest?.data).toBe("hello");

    await act(async () => {
      latest?.reset();
    });

    expect(latest?.isStale).toBe(true);

    await act(async () => {
      latest?.cancel();
    });

    expect(latest?.isLoading).toBe(false);

    renderer?.unmount();
  });
});
