# CI Quality Gates

This document is the provider-agnostic source of truth for pull-request verification.

## Required gate commands

Run these commands in CI for every pull request targeting `main`:

```bash
npm run lint
npm run format:check
npm run typecheck
npm run build
npm run api:check
npm run test:coverage
npm run release:guard:changeset
```

`npm run api:check` compares built declaration output against committed API baselines in `docs/api`.
`npm run test:coverage` enforces repository coverage thresholds via `vitest.config.ts`.

## Required checks policy

Protect the default branch by requiring a passing status check for each quality gate above.

- Keep check names stable so branch protection rules do not drift.
- Run checks on a pinned Node.js major version aligned with `package.json` `engines.node`.
- Keep the pipeline non-interactive and deterministic (`npm ci`, no prompts, no manual approvals for gate jobs).

## CI provider location

The current reference pipeline lives at `.github/workflows/ci.yml`.
If you use a different CI provider, mirror the same gate commands and required-check policy there.

Use `docs/ci/enforcement-runbook.md` to validate provider-side required-check enforcement when that provider-side setup is scheduled.
