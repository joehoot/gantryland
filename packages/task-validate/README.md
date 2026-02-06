# @gantryland/task-validate

Validation combinators for `TaskFn` pipelines.

Use this package to validate resolved task output with a consistent `ValidationError`, while staying schema-library agnostic.

## Installation

```bash
npm install @gantryland/task-validate
```

## Quick start

```typescript
import { Task } from "@gantryland/task";
import { fromSafeParse, validate } from "@gantryland/task-validate";
import { pipe } from "@gantryland/task-combinators";
import { z } from "zod";

const User = z.object({ id: z.string(), name: z.string() });

const userTask = new Task(
  pipe(
    (signal) => fetch("/api/user", { signal }).then((r) => r.json()),
    validate(fromSafeParse(User.safeParse))
  )
);

await userTask.run();
```

## When to use

- You want output validation directly in task composition.
- You already have a `safeParse`-style schema validator.
- You want type guard validation with a consistent error type.

## When not to use

- You need multi-step workflow validation orchestration.
- You want validation before task execution (this validates after resolve).

## Exports

- `validate(validator)`
- `fromSafeParse(safeParse)`
- `fromPredicate(predicate, issues?)`
- `ValidationError`

Core type:

```typescript
type Validator<T> = {
  parse: (input: unknown) => T;
};
```

## Semantics

- `validate`
  - Runs the wrapped `TaskFn` first.
  - Passes resolved value into `validator.parse(...)`.
  - Returns parsed value on success.
  - Throws validation failure from the validator.
- TaskFn failures, including abort, pass through unchanged.
- `fromSafeParse`
  - Converts `{ success, data?, error? }` style validators.
  - Throws `ValidationError("Validation failed", result.error)` when not successful.
- `fromPredicate`
  - Uses a type guard.
  - Throws `ValidationError("Validation failed", issues)` when predicate fails.

## Patterns

### 1) Handle `ValidationError` explicitly

```typescript
import { ValidationError } from "@gantryland/task-validate";

try {
  await userTask.run();
} catch (error) {
  if (error instanceof ValidationError) {
    console.error("validation issues", error.issues);
  }
}
```

### 2) Use predicate validation without schema library

```typescript
import { Task } from "@gantryland/task";
import { fromPredicate, validate } from "@gantryland/task-validate";
import { pipe } from "@gantryland/task-combinators";

type User = { id: string; name: string };

const isUser = (input: unknown): input is User =>
  !!input && typeof (input as User).id === "string";

const userTask = new Task(
  pipe(
    (signal) => fetch("/api/user", { signal }).then((r) => r.json()),
    validate(fromPredicate(isUser, { reason: "Invalid user payload" }))
  )
);
```

### 3) Compose with retry + timeout

```typescript
import { Task } from "@gantryland/task";
import { pipe, retry, timeout } from "@gantryland/task-combinators";
import { fromSafeParse, validate } from "@gantryland/task-validate";

const task = new Task(
  pipe(
    (signal) => fetch("/api/user", { signal }).then((r) => r.json()),
    retry(2),
    timeout(4_000),
    validate(fromSafeParse(User.safeParse))
  )
);
```

## Related packages

- [@gantryland/task](../task/) - Task execution and state primitive
- [@gantryland/task-combinators](../task-combinators/) - TaskFn composition and control-flow operators
- [@gantryland/task-hooks](../task-hooks/) - React bindings for Task state
- [@gantryland/task-logger](../task-logger/) - Task and cache logging helpers

## Test this package

```bash
npx vitest packages/task-validate/test
```
