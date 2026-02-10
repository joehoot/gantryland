# Gantryland

TypeScript monorepo of minimal async workflow libraries published as `@gantryland/*`.

## Packages

| Package | Purpose |
| --- | --- |
| [`@gantryland/task`](packages/task/) | Core async task primitive with reactive state. |
| [`@gantryland/task-react`](packages/task-react/) | React hooks for `@gantryland/task`. |
| [`@gantryland/task-cache`](packages/task-cache/) | Cache wrappers with TTL and stale-while-revalidate. |
| [`@gantryland/task-combinators`](packages/task-combinators/) | Functional combinators for task pipelines. |

## Installation

```bash
npm install
```

## Quick Start

```bash
npm run check
```

## Workspace Commands

| Command | Description |
| --- | --- |
| `npm run check` | Runs lint, format check, typecheck, build, and tests. |
| `npm run format` | Applies formatter to the workspace. |
| `npm run lint:fix` | Applies safe lint fixes. |
| `npm run test:coverage` | Runs tests with coverage reporting. |

## Release

Update versions in `packages/*/package.json`, then publish:

```bash
npm run check
npm run publish:all
```

## Documentation

- Package-level API docs live in each package `README.md`.

## License

[MIT](LICENSE)
