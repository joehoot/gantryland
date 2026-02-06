import { describe, expect, it, vi } from "vitest";
import { Task } from "@gantryland/task";
import { fromTaskState, toTask, type Observer } from "../index";

const createAbortError = () =>
  Object.assign(new Error("Aborted"), { name: "AbortError" });

describe("fromTaskState", () => {
  it("emits initial and updated task states", async () => {
    const task = new Task(async () => "ok");
    const states: Array<ReturnType<typeof task.getState>> = [];

    const subscription = fromTaskState(task).subscribe({
      next: (state) => states.push({ ...state }),
    });

    await task.run();

    expect(states[0].isStale).toBe(true);
    expect(states.at(-1)?.data).toBe("ok");
    expect(states.at(-1)?.isLoading).toBe(false);

    subscription.unsubscribe();
  });
});

describe("toTask", () => {
  it("resolves on first value and unsubscribes", async () => {
    const unsubscribe = vi.fn();
    let observer: Observer<string> | undefined;

    const taskFn = toTask<string>({
      subscribe: (obs) => {
        observer = obs;
        return { unsubscribe };
      },
    });

    const promise = taskFn();
    observer?.next("first");

    await expect(promise).resolves.toBe("first");
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("handles synchronous next during subscribe", async () => {
    const unsubscribe = vi.fn();

    const taskFn = toTask<string>({
      subscribe: (observer) => {
        observer.next("sync");
        return { unsubscribe };
      },
    });

    await expect(taskFn()).resolves.toBe("sync");
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("rejects on observable error and unsubscribes", async () => {
    const unsubscribe = vi.fn();
    let observer: Observer<string> | undefined;

    const taskFn = toTask<string>({
      subscribe: (obs) => {
        observer = obs;
        return { unsubscribe };
      },
    });

    const promise = taskFn();
    const error = new Error("fail");
    observer?.error?.(error);

    await expect(promise).rejects.toBe(error);
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("rejects immediately if signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();

    const taskFn = toTask<string>({
      subscribe: () => ({ unsubscribe: () => undefined }),
    });

    await expect(taskFn(controller.signal)).rejects.toMatchObject({
      name: "AbortError",
    });
  });

  it("unsubscribes on complete without resolving", async () => {
    const unsubscribe = vi.fn();
    const taskFn = toTask<string>({
      subscribe: (observer) => {
        observer.complete?.();
        return { unsubscribe };
      },
    });

    const promise = taskFn();
    let settled = false;
    promise.then(
      () => {
        settled = true;
      },
      () => {
        settled = true;
      },
    );

    await Promise.resolve();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(settled).toBe(false);
  });

  it("creates AbortError without DOMException", async () => {
    const originalDOMException = globalThis.DOMException;
    // @ts-expect-error intentional runtime override for test coverage
    globalThis.DOMException = undefined;

    const controller = new AbortController();
    controller.abort();
    const taskFn = toTask<string>({
      subscribe: () => ({ unsubscribe: () => undefined }),
    });

    await expect(taskFn(controller.signal)).rejects.toMatchObject({
      name: "AbortError",
      message: "Aborted",
    });

    globalThis.DOMException = originalDOMException;
  });

  it("rejects on abort and unsubscribes", async () => {
    const unsubscribe = vi.fn();
    const controller = new AbortController();
    const taskFn = toTask<string>({
      subscribe: () => ({ unsubscribe }),
    });

    const promise = taskFn(controller.signal);
    controller.abort(createAbortError());

    await expect(promise).rejects.toMatchObject({ name: "AbortError" });
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
