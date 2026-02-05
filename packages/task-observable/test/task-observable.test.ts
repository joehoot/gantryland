import { describe, expect, it, vi } from "vitest";
import { Task } from "@gantryland/task";
import { createObservable, fromTask, fromTaskState, toTask } from "../index";

const createDeferred = <T,>() => {
  let resolve: (value: T) => void;
  let reject: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve: resolve!, reject: reject! };
};

const createAbortError = () => Object.assign(new Error("Aborted"), { name: "AbortError" });

describe("createObservable", () => {
  it("normalizes function observers and returns unsubscribe", () => {
    const next = vi.fn();
    let stored: { next: (value: number) => void } | undefined;

    const observable = createObservable<number>((observer) => {
      stored = observer;
      return () => {
        stored = undefined;
      };
    });

    const subscription = observable.subscribe(next);
    stored?.next(1);

    expect(next).toHaveBeenCalledWith(1);
    subscription.unsubscribe();
    expect(stored).toBeUndefined();
  });

  it("supports object observers", () => {
    const next = vi.fn();
    const observable = createObservable<number>((observer) => {
      observer.next(2);
    });

    observable.subscribe({ next });

    expect(next).toHaveBeenCalledWith(2);
  });
});

describe("fromTaskState", () => {
  it("emits initial and updated task states", async () => {
    const deferred = createDeferred<string>();
    const task = new Task(() => deferred.promise);
    const states: Array<ReturnType<typeof task.getState>> = [];

    const subscription = fromTaskState(task).subscribe((state) => {
      states.push({ ...state });
    });

    const runPromise = task.run();
    deferred.resolve("ok");
    await runPromise;

    expect(states[0].isStale).toBe(true);
    expect(states.at(-1)?.data).toBe("ok");
    expect(states.at(-1)?.isLoading).toBe(false);

    subscription.unsubscribe();
  });
});

describe("fromTask", () => {
  it("emits resolved data once per distinct value", async () => {
    const task = new Task(async () => "value");
    const values: string[] = [];

    const subscription = fromTask(task).subscribe((value) => values.push(value));

    await task.run();
    await task.run();

    expect(values).toEqual(["value"]);
    subscription.unsubscribe();
  });

  it("forwards task errors", async () => {
    const task = new Task(async () => {
      throw new Error("boom");
    });
    const errorSpy = vi.fn();

    const subscription = fromTask(task).subscribe({
      next: () => {},
      error: errorSpy,
    });

    await task.run();

    expect(errorSpy).toHaveBeenCalledWith(expect.objectContaining({ message: "boom" }));
    subscription.unsubscribe();
  });
});

describe("toTask", () => {
  it("resolves on first value and unsubscribes", async () => {
    const unsubscribe = vi.fn();
    let observer: { next: (value: string) => void } | undefined;

    const observable = createObservable<string>((obs) => {
      observer = obs;
      return unsubscribe;
    });

    const taskFn = toTask(observable);
    const promise = taskFn();

    observer?.next("first");

    await expect(promise).resolves.toBe("first");
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("rejects on observable error and unsubscribes", async () => {
    const unsubscribe = vi.fn();
    let observer: { error?: (err: unknown) => void } | undefined;

    const observable = createObservable<unknown>((obs) => {
      observer = obs;
      return unsubscribe;
    });

    const taskFn = toTask(observable);
    const promise = taskFn();

    const error = new Error("fail");
    observer?.error?.(error);

    await expect(promise).rejects.toBe(error);
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("rejects immediately if signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const observable = createObservable<string>(() => {});

    const taskFn = toTask(observable);

    await expect(taskFn(controller.signal)).rejects.toMatchObject({ name: "AbortError" });
  });

  it("rejects on abort and unsubscribes", async () => {
    const unsubscribe = vi.fn();
    const observable = createObservable<string>(() => unsubscribe);

    const controller = new AbortController();
    const taskFn = toTask(observable);

    const promise = taskFn(controller.signal);
    controller.abort(createAbortError());

    await expect(promise).rejects.toMatchObject({ name: "AbortError" });
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
