# CI Quality Gates

Provider-agnostic pull-request verification policy.

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

Protect the default branch by requiring a passing CI verification status check.

- Use a pinned Node.js major aligned with `package.json` `engines.node`.
- Keep the pipeline deterministic (`npm ci`, no prompts, no manual approvals).

## CI provider location

Reference implementation: `.github/workflows/ci.yml`.
If you use another provider, mirror the same commands and policy.
