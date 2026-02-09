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
npm run release:version
npm run release:publish
```

For the initial `v0.4.0` bootstrap release, no changeset is required.

## Docs

- [Contributing](CONTRIBUTING.md)
- [API baselines](docs/api/README.md)
- [Support](SUPPORT.md)
- [Security](SECURITY.md)
