# Gantryland

Gantryland is a suite of modern, composable tools for async workflows. Packages are published under the `@gantryland` scope and focus on minimal, dependency-free primitives for tasks, caching, scheduling, validation, and interop.

- Small APIs that compose cleanly.
- Works in browser and Node.js.
- Designed for ergonomic developer experience.

## Contents

- [Packages](#packages)
- [Development](#development)
- [Pre Publishing](#pre-publishing)
- [Release process](#release-process)

## Packages

- [@gantryland/task](packages/task/) - Core Task abstraction with reactive state and cancellation.
- [@gantryland/task-cache](packages/task-cache/) - Cache combinators and in-memory cache primitives.
- [@gantryland/task-combinators](packages/task-combinators/) - TaskFn operators for composition, retries, and timeouts.
- [@gantryland/task-hooks](packages/task-hooks/) - React hooks for Task state and lifecycle.
- [@gantryland/task-logger](packages/task-logger/) - Logging utilities for Task execution and cache events.
- [@gantryland/task-observable](packages/task-observable/) - Minimal observable interop for Task state and results.
- [@gantryland/task-router](packages/task-router/) - Route pattern helpers and Task wrappers for params.
- [@gantryland/task-scheduler](packages/task-scheduler/) - Polling, debounce, throttle, and queue combinators.
- [@gantryland/task-storage](packages/task-storage/) - Persistent cache stores for browser and Node.js.
- [@gantryland/task-validate](packages/task-validate/) - Validation combinators for schema-agnostic parsing.

## Development

```bash
npm install
npm run build
```

## Pre Publishing

```bash
npm run release:ready
```

If `release:ready` fails, fix the issue and rerun it. The changeset remains valid unless the scope of the release changes.

Each package is configured with `publishConfig.access=public` for scoped npm publishing.

## Release process

```bash
npm run release:changeset
npm run release:changelog
npm run release:check
npm run release:ready
npm publish --workspaces
```

If `release:ready` fails after generating versions/changelogs, keep those changes, fix the code, and rerun.

See `CONTRIBUTING.md` for release guidance.
