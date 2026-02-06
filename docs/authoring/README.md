# Authoring Standard

Use this file as the single authoring standard for package source code, docs, and tests.

## Core rules

- Keep APIs small, composable, and behavior-first.
- Keep cancellation semantics explicit and consistent (`AbortError`, latest-wins behavior).
- Prefer deterministic behavior and deterministic tests.
- Keep docs aligned with runtime behavior.
- Use existing Gantryland terminology consistently (`Task`, `TaskFn`, `TaskState`, `AbortError`, `TimeoutError`).

## Source code

- Prefer straightforward control flow over abstraction.
- Keep internal helpers private unless intentionally exported.
- Clean up `AbortSignal` listeners and timers on all paths.
- Prevent double-settle in race-prone code.

## JSDoc and package docs

- Document behavior, not implementation.
- Be explicit about success/error/abort outcomes.
- Keep examples minimal, real, and compilable.
- Avoid marketing language and ambiguous wording.

## Tests

- Test observable behavior, not internals.
- Cover success, error, and abort paths when relevant.
- Use deterministic control (deferred promises/fake timers as needed).
- Keep test names outcome-focused and readable.

## Pre-merge check

Run:

```bash
npm run release:check
```
