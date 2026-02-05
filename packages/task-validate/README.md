# Task Validate

Validation combinators for Task. Designed to be schema-library agnostic.

Works in browser and Node.js with no dependencies.

## Quick start

```typescript
import { Task } from "@gantryland/task";
import { validate, fromSafeParse } from "@gantryland/task-validate";
import { pipe } from "@gantryland/task-combinators";
import { z } from "zod";

const User = z.object({ id: z.string(), name: z.string() });

const task = new Task(
  pipe(
    () => fetch("/api/user").then((r) => r.json()),
    validate(fromSafeParse(User.safeParse))
  )
);
```

## API

### validate

Validate the output of a TaskFn.

```typescript
validate(validator)
```

### fromSafeParse

Create a validator from a `safeParse` function.

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

## Notes

- `validate` returns a TaskFn that throws `ValidationError` on failure.
- `fromSafeParse` supports zod/valibot/io-ts style APIs.

## Tests

```bash
npm test

npx vitest packages/task-validate/test
```
