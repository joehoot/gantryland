# Task Combinators Bare-Metal Todo

- Audit `packages/task-combinators/index.ts` export surface and remove non-core combinators that do not serve the package's core async-composition purpose.
- Keep function signatures plain async (`(...args) => Promise<T>`) and align cancellation/error behavior with `@gantryland/task` semantics.
- Simplify internal helpers (`AbortError` detection, error normalization, timing/retry utilities) and remove unnecessary branching/indirection.
- Keep concise public JSDoc for retained exports; remove only verbose/redundant commentary.
- Update `packages/task-combinators/test/task-combinators.test.ts` to match the reduced guarantees and retained API only.
- Trim `packages/task-combinators/README.md` to a concise, accurate bare-metal reference for the final export set.
- Run package-level verification for `task-combinators`.
- Run full repo verification with `npm run check`.
