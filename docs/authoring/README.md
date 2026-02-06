# Authoring Standard

Use this file as the single authoring standard for package source code, docs, and tests.

## 5-minute checklist

- Keep behavior deterministic and composable.
- Keep cancellation behavior explicit.
- Keep docs/examples aligned with runtime behavior.
- Run `npm run release:check`.

## Rules

- Keep APIs small and behavior-first.
- Keep terminology consistent (`Task`, `TaskFn`, `AbortError`, `TimeoutError`).
- Prefer straightforward control flow over abstraction.
- Clean up `AbortSignal` listeners and timers on all paths.
- Prevent double-settle in race-prone code.
- Test observable behavior, including success/error/abort paths.
- Keep docs concise, explicit, and compilable.

## Pre-merge check

Run:

```bash
npm run release:check
```
