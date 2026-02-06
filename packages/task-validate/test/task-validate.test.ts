import { describe, expect, it, vi } from "vitest";
import {
  fromPredicate,
  fromSafeParse,
  validate,
  ValidationError,
} from "../index";

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

  it("propagates ValidationError", async () => {
    const error = new ValidationError("Validation failed", { reason: "bad" });
    const validator = {
      parse: () => {
        throw error;
      },
    };
    const wrapped = validate(validator)(async () => "nope");

    await expect(wrapped()).rejects.toBe(error);
  });

  it("propagates non-validation errors", async () => {
    const error = new Error("boom");
    const wrapped = validate({ parse: (input) => input as string })(
      async () => {
        throw error;
      },
    );

    await expect(wrapped()).rejects.toBe(error);
  });

  it("propagates AbortError from the TaskFn", async () => {
    const error = createAbortError();
    const wrapped = validate({ parse: (input) => input as string })(
      async () => {
        throw error;
      },
    );

    await expect(wrapped()).rejects.toBe(error);
  });
});

describe("fromSafeParse", () => {
  it("returns parsed data on success", () => {
    const validator = fromSafeParse<string>(() => ({
      success: true,
      data: "ok",
    }));
    expect(validator.parse("input")).toBe("ok");
  });

  it("throws ValidationError with issues on failure", () => {
    const issues = { message: "bad" };
    const validator = fromSafeParse(() => ({ success: false, error: issues }));

    const thrown = (() => {
      try {
        validator.parse("input");
      } catch (error) {
        return error;
      }
    })();

    expect(thrown).toBeInstanceOf(ValidationError);
    expect((thrown as ValidationError).issues).toBe(issues);
  });
});

describe("fromPredicate", () => {
  it("returns input when predicate passes", () => {
    const validator = fromPredicate<number>(
      (input): input is number => typeof input === "number",
    );
    expect(validator.parse(2)).toBe(2);
  });

  it("throws ValidationError with issues when predicate fails", () => {
    const validator = fromPredicate<number>(
      (input): input is number => typeof input === "number",
      { expected: "number" },
    );

    const thrown = (() => {
      try {
        validator.parse("nope");
      } catch (error) {
        return error;
      }
    })();

    expect(thrown).toBeInstanceOf(ValidationError);
    expect((thrown as ValidationError).issues).toEqual({ expected: "number" });
  });
});
