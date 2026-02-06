---
"@gantryland/task-react": minor
---

- Add `@gantryland/task-react`, a minimal React adapter package for `Task` interop.
- Export `useTaskState(task)` for direct state subscription and `useTask(task)` for state plus `run/cancel/reset` controls.
- Keep the adapter policy-free: no retries, caching, or scheduling behavior.
