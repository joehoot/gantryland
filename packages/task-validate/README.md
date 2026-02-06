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
import { ValidationError, validate } from "@gantryland/task-validate";
import { pipe } from "@gantryland/task-combinators";

type User = { id: string; name: string };

const userValidator = {
  parse: (input: unknown): User => {
    if (
      typeof input === "object" &&
      input !== null &&
      "id" in input &&
      "name" in input &&
      typeof (input as { id: unknown }).id === "string" &&
      typeof (input as { name: unknown }).name === "string"
    ) {
      return input as User;
    }
    throw new ValidationError("Invalid user payload", { expected: "User" });
  },
};

const userTask = new Task(
  pipe(
    (signal) => fetch("/api/user", { signal }).then((r) => r.json()),
    validate(userValidator)
  )
);

await userTask.run();
```

## When to use

- You want output validation directly in task composition.
- You want type guard validation with a consistent error type.

## When not to use

- You need multi-step workflow validation orchestration.
- You want validation before task execution (this validates after resolve).

## Exports

- `validate(validator)`
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

### 2) Inline minimal validator

```typescript
import { Task } from "@gantryland/task";
import { ValidationError, validate } from "@gantryland/task-validate";
import { pipe } from "@gantryland/task-combinators";

type User = { id: string; name: string };

const userValidator = {
  parse: (input: unknown): User => {
    if (
      input &&
      typeof input === "object" &&
      typeof (input as { id?: unknown }).id === "string" &&
      typeof (input as { name?: unknown }).name === "string"
    ) {
      return input as User;
    }
    throw new ValidationError("Validation failed", { expected: "User" });
  },
};

const userTask = new Task(
  pipe(
    (signal) => fetch("/api/user", { signal }).then((r) => r.json()),
    validate(userValidator)
  )
);
```

### 3) Compose with retry + timeout

```typescript
import { Task } from "@gantryland/task";
import { pipe, retry, timeout } from "@gantryland/task-combinators";
import { ValidationError, validate } from "@gantryland/task-validate";

const userValidator = {
  parse: (input: unknown): { id: string } => {
    if (
      input &&
      typeof input === "object" &&
      typeof (input as { id?: unknown }).id === "string"
    ) {
      return input as { id: string };
    }
    throw new ValidationError("Validation failed", { expected: "User" });
  },
};

const task = new Task(
  pipe(
    (signal) => fetch("/api/user", { signal }).then((r) => r.json()),
    retry(2),
    timeout(4_000),
    validate(userValidator)
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
