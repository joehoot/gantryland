# Gantryland

Gantryland is a TypeScript monorepo of small async workflow libraries published as `@gantryland/*`.

If you are new here: run setup, then open the package README you need.

## Packages

- [@gantryland/task](packages/task/)
- [@gantryland/task-react](packages/task-react/)
- [@gantryland/task-cache](packages/task-cache/)
- [@gantryland/task-combinators](packages/task-combinators/)

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
- [Release process](docs/releasing/process.md)
- [Release provenance](docs/releasing/provenance.md)
- [API baselines](docs/api/README.md)
- [CI gates](docs/ci/quality-gates.md)
- [Support](SUPPORT.md)
- [Security](SECURITY.md)
