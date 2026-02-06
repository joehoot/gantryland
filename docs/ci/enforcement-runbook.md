# Required Check Enforcement Runbook

This runbook is CI-provider-agnostic. Use it to enforce and verify required checks for `main`.

## Inputs

- Default branch name: `main`
- Required gate source: `docs/ci/quality-gates.md`
- CI implementation location: your active provider config (reference implementation: `.github/workflows/ci.yml`)

## Enforcement steps

1. Ensure your CI provider runs every command listed in `docs/ci/quality-gates.md` on pull requests targeting `main`.
2. Configure branch protection for `main` so merges are blocked unless all required checks pass.
3. Pin Node.js major version to match `package.json` `engines.node`.
4. Keep check names stable and map each required command to a stable status check.
5. Disable bypass paths for normal merges (for example, no unchecked direct pushes to `main`).

## Verification procedure

Use two pull requests to validate enforcement behavior:

### PR A (negative test)

- Create a temporary change that causes one required check to fail (for example, force `npm run api:check` mismatch).
- Confirm CI reports a failing required check.
- Confirm merge to `main` is blocked.
- Revert the temporary failing change.

### PR B (positive test)

- Create a clean docs-only change.
- Confirm every required check passes.
- Confirm merge is allowed only after required checks are green.

## Evidence checklist

Capture these artifacts in your operational notes or issue tracker:

- CI pipeline URL or run ID for PR A (failed gate).
- Proof of merge block for PR A.
- CI pipeline URL or run ID for PR B (all gates passing).
- Proof of merge allowance for PR B.
- Screenshot/export of branch-protection required-check settings.

## Ongoing maintenance

- Re-run this verification after changing CI providers, branch rules, or quality-gate commands.
- When `docs/ci/quality-gates.md` changes, update required-check settings in the active provider in the same change window.
