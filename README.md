# Gantryland

Gantryland is a TypeScript monorepo of small async workflow libraries published as `@gantryland/*`.

## Packages

- [@gantryland/task](packages/task/)
- [@gantryland/task-cache](packages/task-cache/)
- [@gantryland/task-combinators](packages/task-combinators/)
- [@gantryland/task-hooks](packages/task-hooks/)
- [@gantryland/task-logger](packages/task-logger/)
- [@gantryland/task-observable](packages/task-observable/)
- [@gantryland/task-router](packages/task-router/)
- [@gantryland/task-scheduler](packages/task-scheduler/)
- [@gantryland/task-storage](packages/task-storage/)
- [@gantryland/task-validate](packages/task-validate/)

## Setup

```bash
npm install
npm run release:check
```

Use `npm run format` and `npm run lint:fix` for local auto-fixes.

## Release

```bash
npm run release:changeset
npm run release:status
npm run release:changelog
npm run release:ready
npm run release:publish
```

## Docs

- [Contributing](CONTRIBUTING.md)
- [Authoring standard](docs/authoring/README.md)
- [Release process](docs/releasing/process.md)
- [Release provenance](docs/releasing/provenance.md)
- [API baselines](docs/api/README.md)
- [CI gates](docs/ci/quality-gates.md)
- [Support](SUPPORT.md)
- [Security](SECURITY.md)
