import { describe, expect, it, vi } from "vitest";
import { validate, ValidationError } from "../index";

const createAbortError = () =>
  Object.assign(new Error("Aborted"), { name: "AbortError" });

describe("validate", () => {
  it("parses the TaskFn result", async () => {
    const taskFn = vi.fn(async () => ({ id: 1 }));
    const validator = {
      parse: (input: unknown) => {
        if (typeof input === "object" && input && "id" in input) {
          return input as { id: number };
        }
        throw new ValidationError("bad");
      },
    };

    const wrapped = validate(validator)(taskFn);
    await expect(wrapped()).resolves.toEqual({ id: 1 });
    expect(taskFn).toHaveBeenCalledTimes(1);
  });

  it("propagates ValidationError from validator", async () => {
    const error = new ValidationError("Validation failed", { reason: "bad" });
    const wrapped = validate({
      parse: () => {
        throw error;
      },
    })(async () => "nope");

    await expect(wrapped()).rejects.toBe(error);
  });

  it("propagates non-validation errors from task function", async () => {
    const error = new Error("boom");
    const wrapped = validate({ parse: (input) => input as string })(
      async () => {
        throw error;
      },
    );

    await expect(wrapped()).rejects.toBe(error);
  });

  it("propagates AbortError from task function", async () => {
    const error = createAbortError();
    const wrapped = validate({ parse: (input) => input as string })(
      async () => {
        throw error;
      },
    );

    await expect(wrapped()).rejects.toBe(error);
  });
});

describe("ValidationError", () => {
  it("stores issues payload", () => {
    const error = new ValidationError("Validation failed", {
      expected: "User",
    });
    expect(error.issues).toEqual({ expected: "User" });
  });
});
