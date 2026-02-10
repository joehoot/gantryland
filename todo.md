# Task React Bare-Metal Todo

- Align `packages/task-react/index.ts` with current `@gantryland/task` primitive semantics.
- Audit `useTaskState` for minimum viable behavior and remove unnecessary wrapping/indirection.
- Audit `useTask` API shape (`run`, `cancel`, `reset`) and keep only core controls needed for Task interop.
- Keep concise public JSDoc; remove only redundant/verbose commentary.
- Trim `packages/task-react/README.md` to a concise bare-metal reference that matches actual guarantees.
- Update `packages/task-react/test/task-react.test.ts` to reflect reduced guarantees and core behavior only.
- Run package-level tests for `task-react`.
- Run full repo verification with `npm run check`.
