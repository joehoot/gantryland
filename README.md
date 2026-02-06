# Gantryland

Gantryland is a suite of modern, composable tools for async workflows. Packages are published under the `@gantryland` scope and focus on minimal, dependency-free primitives for tasks, caching, scheduling, validation, and interop.

- Small APIs that compose cleanly.
- Works in browser and Node.js.
- Designed for ergonomic developer experience.

## Contents

- [Packages](#packages)
- [Authoring guides](#authoring-guides)
- [Release guides](#release-guides)
- [Adoption guides](#adoption-guides)
- [API guides](#api-guides)
- [CI guides](#ci-guides)
- [Handoff guides](#handoff-guides)
- [Community and security](#community-and-security)
- [Development](#development)
- [Pre-publishing](#pre-publishing)
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

## Authoring guides

- [Authoring index](docs/authoring/README.md)
- [Source code authoring](docs/authoring/source-code.md)
- [JSDoc authoring](docs/authoring/jsdoc.md)
- [Package docs authoring](docs/authoring/package-docs.md)
- [Test authoring](docs/authoring/tests.md)

## Release guides

- [Release index](docs/releasing/README.md)
- [Release process](docs/releasing/process.md)
- [Release provenance policy](docs/releasing/provenance.md)
- [0.3.0 audit tracker](docs/releasing/0.3.0-audit.md)

## Adoption guides

- [Consumer confidence guide](docs/adoption/consumer-confidence.md)

## API guides

- [Public API baselines](docs/api/README.md)

## CI guides

- [CI quality gates](docs/ci/quality-gates.md)

## Handoff guides

- [Handoff index](docs/handoff/README.md)
- [Quick handoff](docs/handoff/quick-handoff.md)
- [Handoff authoring](docs/handoff/authoring.md)

## Community and security

- [Contributing](CONTRIBUTING.md)
- [Support](SUPPORT.md)
- [Security policy](SECURITY.md)
- [Code of conduct](CODE_OF_CONDUCT.md)

## Development

```bash
npm install
npm run lint
npm run format:check
npm run typecheck
npm run build
npm test
```

Use `npm run format` and `npm run lint:fix` to apply local autoformat and safe lint fixes.

## Pre-publishing

```bash
npm run release:ready
```

If `release:ready` fails, fix the issue and rerun it. The changeset remains valid unless the scope of the release changes.

## Release process

```bash
npm run release:changeset
npm run release:status
npm run release:changelog
npm run release:ready
npm run release:publish
```

If `release:ready` fails after generating versions/changelogs, keep those changes, fix the code, and rerun.

See `docs/releasing/process.md` and `CONTRIBUTING.md` for release guidance.
