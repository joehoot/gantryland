# Test Authoring Guide

Use this guide when writing or updating unit tests in Gantryland packages. The reference tone and rigor are `packages/task/test/task.test.ts`, `docs/authoring/source-code.md`, `docs/authoring/jsdoc.md`, and `docs/authoring/package-docs.md`. The goal is to ensure tests are deterministic, behavior-first, and aligned with source and package-doc semantics.

## Goals
- Prove observable behavior, not implementation details.
- Keep tests deterministic and readable.
- Ensure AbortError, cancellation, and supersession semantics are correct.
- Keep tests aligned with JSDoc and package docs behavior.

## Core Principles
- Behavior first: tests encode user-facing outcomes.
- Determinism over cleverness: avoid timing races.
- Minimal setup per test; prefer shared helpers for repeated patterns.
- One assertion focus per test when possible.
- Match terminology used in task packages (Task, TaskFn, AbortError, TimeoutError).

## Required Structure
Use this ordering when applicable:
1. `describe` block per exported type or feature
2. Tests ordered: baseline state -> success -> error -> abort -> edge cases
3. Shared helpers at top of file (e.g., deferred, AbortError factory)
4. Clear, specific test names in present tense

## Behavioral Coverage Checklist
If relevant to the package, ensure tests cover:
- Success path (data resolution)
- Error path (non-AbortError)
- Abort path (AbortError; both pre-start and in-flight when applicable)
- Supersession behavior (latest wins, ignored results)
- Cleanup behavior (listeners removed, timers cleared, state reset)
- Return value semantics (`undefined` on abort/superseded when specified)

If any of these apply, add a test that demonstrates the behavior directly.

## Vitest Best Practices
- Use `describe`, `it`, `expect`, `vi` from `vitest`.
- Prefer `async/await` over `.then` for clarity.
- Use `vi.useFakeTimers()` only when needed; always restore with `vi.useRealTimers()`.
- Avoid real timeouts and sleeps; use deferred promises for control.
- Spy on `console` only when verifying error isolation, and always restore.

## Deterministic Patterns

### Deferred helper
Use a deferred Promise to control resolution order.

```typescript
const createDeferred = <T,>() => {
  let resolve: (value: T) => void;
  let reject: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve: resolve!, reject: reject! };
};
```

### AbortError helper
Use a small helper to create AbortError consistently.

```typescript
const createAbortError = () => Object.assign(new Error("Aborted"), { name: "AbortError" });
```

## Naming and Assertions
- Test names describe outcomes: "clears loading without error on abort".
- Prefer `toEqual` for full state snapshots; `toBe` for identity.
- If state should not change, assert that explicitly.
- Keep assertions close to the action they verify.

## Alignment Rules
- Tests, JSDoc, and package docs must agree on behavior.
- If the API normalizes errors, tests should confirm the normalized output.
- If AbortError is swallowed, tests must assert `error` remains `undefined`.
- If run returns `undefined` on error/abort/superseded, test each path.

## Example Test Skeleton

```typescript
import { describe, expect, it, vi } from "vitest";
import { Task } from "../index";

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

describe("Task", () => {
  it("starts with a stale, idle state", () => {
    const task = new Task(async () => "ok");
    expect(task.getState()).toEqual({
      data: undefined,
      error: undefined,
      isLoading: false,
      isStale: true,
    });
  });

  it("resolves undefined on abort", async () => {
    const task = new Task((signal) =>
      new Promise<string>((_, reject) => {
        signal?.addEventListener("abort", () => reject(createAbortError()), { once: true });
      })
    );

    const runPromise = task.run();
    task.cancel();

    await expect(runPromise).resolves.toBe(undefined);
    expect(task.getState().error).toBe(undefined);
  });
});
```

## Final Review Checklist
- Tests are deterministic and do not rely on real time.
- Coverage includes success, error, abort, and supersession when relevant.
- Assertions match documented behavior and return values.
- Console spies are restored.
- No unused helpers or dead code.
