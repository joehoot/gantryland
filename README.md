# Gantryland

Gantryland is a TypeScript monorepo of small async workflow libraries published as `@gantryland/*`.

Install dependencies, then open the package README you need.

## Packages

- [@gantryland/task](packages/task/)
- [@gantryland/task-react](packages/task-react/)
- [@gantryland/task-cache](packages/task-cache/)
- [@gantryland/task-combinators](packages/task-combinators/)

## Setup

```bash
npm install
npm run check
```

Use `npm run format` and `npm run lint:fix` for local auto-fixes.

## Publish

```bash
npm run check
npm run publish:all
```

Run `npm run test:coverage` any time you want a coverage report.

## Docs

- [License](LICENSE)
