# Enterprise Adoption Playbooks

This guide provides architecture context, package-combination recommendations, reproducible benchmark commands, and security posture notes.

## Architecture overview

Gantryland centers on `@gantryland/task` as the async execution primitive. Most other packages are additive layers around it.

```text
@gantryland/task (core state + cancellation)
  |-- @gantryland/task-cache
  |     `-- @gantryland/task-storage
  |-- @gantryland/task-combinators
  |-- @gantryland/task-scheduler
  |-- @gantryland/task-router
  |-- @gantryland/task-observable
  |-- @gantryland/task-validate
  |-- @gantryland/task-hooks (React >=18)
  `-- @gantryland/task-logger (also uses task-cache)
```

## Recommended package playbooks

### 1) API client orchestration (browser or Node)

- Use `@gantryland/task` for request lifecycle + cancellation.
- Add `@gantryland/task-combinators` for retries/timeouts.
- Add `@gantryland/task-validate` at API boundaries.

### 2) Cached data-fetching layer

- Use `@gantryland/task-cache` for memoization and stale/refresh behavior.
- Add `@gantryland/task-storage` for persistence across process/session boundaries.
- Add `@gantryland/task-logger` for cache event and run telemetry.

### 3) React UI integration

- Use `@gantryland/task-hooks` with `@gantryland/task` for component-level orchestration.
- Add `@gantryland/task-cache` for shared query-like behavior.
- Add `@gantryland/task-observable` when integrating external reactive layers.

### 4) Scheduled and route-driven workflows

- Use `@gantryland/task-scheduler` for poll/debounce/throttle/queue execution models.
- Use `@gantryland/task-router` for route-parameter extraction and matching.
- Add `@gantryland/task-combinators` for timeout/retry behavior per route action.

## Benchmark guidance (reproducible)

Use these commands from a clean checkout for comparable results:

```bash
npm ci
npm run build

/usr/bin/time -l npm run typecheck
/usr/bin/time -l npm run build
/usr/bin/time -l npm run test:coverage
/usr/bin/time -l npx vitest run packages/task/test/task.test.ts packages/task-cache/test/task-cache.test.ts packages/task-combinators/test/task-combinators.test.ts
```

Benchmarking notes:

- Run each command at least 3 times and compare median elapsed time.
- Keep Node.js major pinned (Node 20+) when comparing runs.
- Record CPU model, RAM, Node version, and commit SHA with every benchmark report.

## Security posture notes

Dependency policy:

- Keep runtime dependencies minimal; prefer zero-runtime-dependency package design when practical.
- Pin and review release-toolchain dependencies in lockfile updates.
- Treat dependency major upgrades as explicit review items in pull requests.

Audit cadence:

- Run `npm audit` at least weekly for the default branch.
- Run `npm audit` for every release candidate before publish.
- Track unresolved findings with owner + due date in release notes or issue tracker.

Security reporting and disclosure process are defined in `SECURITY.md`.
