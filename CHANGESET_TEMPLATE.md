# Changeset Template

Use this template when running `npm run release:changeset`.

Checklist:
- Capture the user-visible changes since the last release.
- Choose the smallest correct bump (patch/minor/major).
- Include all affected packages.

Template:

Title:
- Short, present-tense summary.

Packages:
- List each `@gantryland/*` package that changed.

Bump type:
- patch | minor | major

Changelog notes:
- 1-3 bullets describing what changed and why it matters.

Example changeset body:

---
"@gantryland/task": patch
"@gantryland/task-cache": patch
---

- Documentation-only updates.
