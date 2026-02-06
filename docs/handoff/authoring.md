# Handoff Authoring Guide

Use this guide when asking an LLM to create or update a handoff document.

## Required inputs

- Current branch and base branch.
- Latest commit hash and message.
- Files changed in scope (paths only).
- Commands already run with outcomes (pass/fail and key counts).
- Immediate next actions for the next person/session.

## Writing rules

- Keep it short and operational (about 10-25 lines).
- Use exact commands, file paths, and commit hashes.
- Prefer verified facts over narrative.
- Use stable sections: `Current state`, `What changed`, `What is next`, `Constraints`.
- Match script names exactly to `package.json`.

## Safety rules

- Never include secrets, tokens, credentials, or local machine-only details.
- Never invent command/test/build results.
- Mark unknown items clearly instead of guessing.
- Avoid stale context from older sessions unless re-verified.

## Quick template

```md
# Quick Handoff

## Current state
- Branch/base:
- Latest commit:
- Validation status:

## What changed
- Key files:
- Script/workflow updates:

## What is next
1. ...
2. ...

## Constraints
- ...
```

## Pre-publish checklist

- Paths in the handoff exist in the repo.
- Commit details match `git log -1`.
- Script names match `package.json`.
- Next actions are directly executable by a new session.
