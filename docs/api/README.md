# Public API Baselines

This directory stores declaration snapshots used for public API delta checks.

## Tracked baselines

- `docs/api/task.d.ts`
- `docs/api/task-react.d.ts`
- `docs/api/task-combinators.d.ts`
- `docs/api/task-cache.d.ts`

## Commands

```bash
npm run build
npm run api:check
```

If API changes are intentional, refresh baselines:

```bash
npm run build
npm run api:update
```

Commit updated `docs/api/*.d.ts` files with the corresponding code change.
