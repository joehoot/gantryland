# @gantryland/task-validate

Validation combinators for Task. Designed to be schema-library agnostic and small enough to drop into any TaskFn pipeline.

Works in browser and Node.js with no dependencies.

## Installation

```bash
npm install @gantryland/task-validate
```

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

## API

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

## Practical examples

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

### React usage with task-hooks

```tsx
import { Task } from "@gantryland/task";
import { useTask, useTaskOnce } from "@gantryland/task-hooks";
import { validate, fromSafeParse } from "@gantryland/task-validate";
import { pipe } from "@gantryland/task-combinators";

const [task, state] = useTask(
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

## Notes

- `validate` returns a TaskFn that throws `ValidationError` on failure.
- `fromSafeParse` supports zod/valibot/io-ts style APIs.

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
