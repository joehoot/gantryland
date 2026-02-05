# Gantryland

Gantryland is a suite of modern software development tools published under the `@gantryland` scope. It focuses on composable, dependency-free utilities for async workflows, stateful tasks, caching, scheduling, validation, and lightweight interop.

## Packages

- @gantryland/task - Core Task abstraction with reactive state and cancellation.
- @gantryland/task-cache - Cache combinators and in-memory cache primitives.
- @gantryland/task-combinators - TaskFn operators for composition, retries, and timeouts.
- @gantryland/task-hooks - React hooks for Task state and lifecycle.
- @gantryland/task-logger - Logging utilities for Task execution and cache events.
- @gantryland/task-observable - Minimal observable interop for Task state and results.
- @gantryland/task-router - Route pattern helpers and Task wrappers for params.
- @gantryland/task-scheduler - Polling, debounce, throttle, and queue combinators.
- @gantryland/task-storage - Persistent cache stores for browser and Node.js.
- @gantryland/task-validate - Validation combinators for schema-agnostic parsing.

## Development

```bash
npm install
npm run build
```

## Publishing

```bash
npm publish -ws
```

Each package is configured with `publishConfig.access=public` for scoped npm publishing.

## Release process (manual)

```bash
npx changeset
npx changeset version
npm run build
npx changeset publish
```

See `CONTRIBUTING.md` for release guidance.
