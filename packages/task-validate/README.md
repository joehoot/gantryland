# @gantryland/task-validate

Validation combinators for Task. Designed to be schema-library agnostic and small enough to drop into any TaskFn pipeline.

- Lightweight validation combinator for TaskFn.
- Adapters for safeParse and predicate validators.
- Consistent ValidationError with issues payload.
- Works in browser and Node.js with no dependencies.

## Installation

```bash
npm install @gantryland/task-validate
```

## Contents

- [Quick start](#quick-start)
- [Design goals](#design-goals)
- [When to use task-validate](#when-to-use-task-validate)
- [When not to use task-validate](#when-not-to-use-task-validate)
- [Core concepts](#core-concepts)
- [Flow](#flow)
- [API](#api)
- [Common patterns](#common-patterns)
- [Integrations](#integrations)
- [Related packages](#related-packages)
- [Tests](#tests)

## Quick start

```typescript
import { Task } from "@gantryland/task";
import { validate, fromSafeParse } from "@gantryland/task-validate";
import { pipe } from "@gantryland/task-combinators";
import { z } from "zod";

const User = z.object({ id: z.string(), name: z.string() });

const task = new Task(
  pipe(
    (signal) => fetch("/api/user", { signal }).then((r) => r.json()),
    validate(fromSafeParse(User.safeParse))
  )
);
```

This example shows Zod validation with ValidationError on failure.

## Design goals

- Be schema-library agnostic.
- Keep validation in TaskFn pipelines.
- Provide a consistent error shape.

## When to use task-validate

- You want validation in TaskFn composition.
- You use a schema library with `safeParse`.
- You want type guards to enforce output shape.

## When not to use task-validate

- You want automatic schema generation.
- You need complex, multi-step validation flows.

## Core concepts

### Validator

Validators have a `parse` method. Throw a `ValidationError` if validation fails.

```typescript
type Validator<T> = {
  parse: (input: unknown) => T;
};
```

### ValidationError

When validation fails, `ValidationError` is thrown and can carry `issues` from your schema library.

## Flow

```text
TaskFn -> validate(validator) -> TaskFn
```

## API

### API at a glance

| Member | Purpose | Returns |
| --- | --- | --- |
| **Combinator** |  |  |
| [`validate`](#validate) | Validate TaskFn output | `(taskFn) => TaskFn` |
| **Adapters** |  |  |
| [`fromSafeParse`](#fromsafeparse) | Adapter for safeParse | `Validator<T>` |
| [`fromPredicate`](#frompredicate) | Adapter for type guards | `Validator<T>` |
| **Errors** |  |  |
| [`ValidationError`](#validationerror) | Validation error class | `Error` |

### validate

Validate the output of a TaskFn.

```typescript
validate(validator)
```

### fromSafeParse

Create a validator from a `safeParse` function (zod/io-ts/valibot style).

```typescript
fromSafeParse(User.safeParse)
```

### fromPredicate

Create a validator from a type guard.

```typescript
fromPredicate((input): input is User => isUser(input))
```

### ValidationError

Error thrown when validation fails. Includes `issues`.

```typescript
new ValidationError("Validation failed", issues)
```

### Guarantees

- `validate` throws `ValidationError` on validation failure.
- `fromSafeParse` and `fromPredicate` preserve original error payloads as issues.

### Gotchas

- `validate` runs after the TaskFn resolves, not before.
- Predicate validators must be total; false results throw.

## Common patterns

Use these patterns for most usage.

### Validate API payloads with Zod

```typescript
import { Task } from "@gantryland/task";
import { validate, fromSafeParse } from "@gantryland/task-validate";
import { pipe } from "@gantryland/task-combinators";
import { z } from "zod";

const User = z.object({ id: z.string(), name: z.string() });

const task = new Task(
  pipe(
    (signal) => fetch("/api/user", { signal }).then((r) => r.json()),
    validate(fromSafeParse(User.safeParse))
  )
);
```

### Handle validation errors

```typescript
import { ValidationError } from "@gantryland/task-validate";

try {
  await task.run();
} catch (err) {
  if (err instanceof ValidationError) {
    console.error("schema errors", err.issues);
  }
}
```

### Use a predicate validator

```typescript
import { Task } from "@gantryland/task";
import { fromPredicate, validate } from "@gantryland/task-validate";
import { pipe } from "@gantryland/task-combinators";

type User = { id: string; name: string };

const isUser = (input: unknown): input is User => {
  return !!input && typeof (input as User).id === "string";
};

const task = new Task(
  pipe(
    (signal) => fetch("/api/user", { signal }).then((r) => r.json()),
    validate(fromPredicate(isUser, { reason: "invalid user" }))
  )
);
```

### Combine with retries and timeouts

```typescript
import { Task } from "@gantryland/task";
import { validate, fromSafeParse } from "@gantryland/task-validate";
import { pipe, retry, timeout } from "@gantryland/task-combinators";

const task = new Task(
  pipe(
    (signal) => fetch("/api/user", { signal }).then((r) => r.json()),
    retry(2),
    timeout(4000),
    validate(fromSafeParse(User.safeParse))
  )
);
```

## Integrations

Compose with other Gantryland utilities. This section shows common pairings.

### React usage with task-hooks

```tsx
import { Task } from "@gantryland/task";
import { useTask, useTaskOnce } from "@gantryland/task-hooks";
import { validate, fromSafeParse } from "@gantryland/task-validate";
import { pipe } from "@gantryland/task-combinators";

const [task] = useTask(
  () =>
    new Task(
      pipe(
        (signal) => fetch("/api/user", { signal }).then((r) => r.json()),
        validate(fromSafeParse(User.safeParse))
      )
    ),
  { mode: "factory" }
);

useTaskOnce(task);
```

## Related packages

- [@gantryland/task](../task/) - Core Task abstraction
- [@gantryland/task-combinators](../task-combinators/) - Composable TaskFn operators
- [@gantryland/task-hooks](../task-hooks/) - React bindings
- [@gantryland/task-logger](../task-logger/) - Logging utilities

## Tests

```bash
npm test
npx vitest packages/task-validate/test
```
