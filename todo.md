# Task Primitive Bare-Metal Todo

- Keep `fulfill` in `packages/task/index.ts`.
- Keep concise JSDoc for public API; remove only redundant/verbose commentary.
- Remove runtime state freezing / immutability enforcement machinery.
- Remove listener error isolation/logging (`try/catch` + `console.error`).
- Simplify AbortError creation to a minimal helper.
- Simplify `run` internals to reduce branching/duplication while preserving core behavior.
- Update `packages/task/test/task.test.ts` to match the reduced behavior guarantees.
- Trim `packages/task/README.md` to a concise bare-metal reference.
- Run full verification with `npm run check`.
