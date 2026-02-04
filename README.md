# gantryland

Minimal task utilities published under the @gantryland scope.

## Packages

- @gantryland/task
- @gantryland/task-cache
- @gantryland/task-combinators
- @gantryland/task-hooks

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
