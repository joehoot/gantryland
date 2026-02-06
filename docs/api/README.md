# Public API Baselines

This directory stores declaration snapshots used for public API delta checks.

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
