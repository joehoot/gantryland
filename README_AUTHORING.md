# README Authoring Guide (LLM Instructions)

Use this guide to write or update package `README.md` files in Gantryland. The reference standard is `packages/task/README.md`. Aim for enterprise-grade clarity, fast onboarding, and precise behavior descriptions.

## Goals
- Make the README a complete, reliable entry point for new users.
- Optimize for developer comprehension and ergonomics.
- Keep docs aligned with runtime behavior and JSDoc.
- Use consistent terminology across packages.

## Required Structure
Follow this order unless the package truly requires a different flow:
1. **Title + one-paragraph overview**
2. **Bullet highlights** (4-6 concise bullets)
3. **Installation**
4. **Contents** (table of contents list)
5. **Quick start** (1 focused example)
6. **At a glance** (minimal usage snapshot)
7. **Design goals**
8. **When to use**
9. **When not to use**
10. **Core concepts** (key types or terms)
11. **Flow** (if stateful or sequential)
12. **Run semantics / Behavior** (only if behavior is non-trivial)
13. **API** (including “at a glance” table if applicable)
14. **Common patterns** (2-5 patterns)
15. **Integrations** (if part of ecosystem)
16. **Related packages**
17. **Tests**

If a section is irrelevant, omit it rather than forcing it.

## Writing Rules
- Be explicit about AbortError and cancellation.
- State “latest wins” or supersession behavior when it exists.
- Prefer short sentences and deterministic language (“does”, “always”).
- Avoid marketing language or vague claims.
- Use plain English and direct verbs.
- Avoid redundant sections; if “Behavior” and “Run semantics” overlap, keep only one.

## Example Rules
- Use TypeScript snippets.
- Keep Quick start <= 25 lines.
- Every example should compile against current exports.
- Prefer real-world patterns: `fetch`, `pipe`, `Task`, `TaskFn`.
- Show AbortSignal usage if cancellation is part of the API.

## Content Guidelines (by section)

### Overview
- Single paragraph: what the package is and why it exists.
- Mention identity/state semantics if applicable.

### Highlights
- 4-6 bullets; each 1 line.
- Focus on behavior, not implementation.

### Quick start
- One example showing the primary workflow.
- Show both setup and use.

### At a glance
- Minimal snapshot of the core API usage.
- Use `type` annotations when helpful.

### Core concepts
- Define key types or terms (e.g., `TaskFn`, `TaskState`).
- Provide a short type snippet.

### Flow / Run semantics
- Use a small ASCII flow diagram if useful.
- Explicitly state what happens on success, error, abort, or superseded runs.
- Call out pre-start vs in-flight abort behavior when scheduling or queueing.

### API
- Include a high-level “API at a glance” table if there are multiple exports.
- Follow with short method descriptions and minimal examples.
- Prefer `task.method` names to anchor links.

### Common patterns
- 2-5 sections; each with a short example.
- Prefer the patterns most users will need first.

### Integrations
- Show pairings with other Gantryland packages if relevant.

### Tests
- Provide `npm test` and a direct `npx vitest` target if available.

## Consistency Requirements (Task Reference)
Mirror the style used in `packages/task/README.md`:
- “At a glance” section title and format.
- “Design goals” bullet cadence.
- “When to use / When not to use” phrasing style.
- `Run semantics` bullets when behavior is nuanced.

## Checklist Before Finalizing
- README matches current API and JSDoc behavior.
- All examples compile and reflect real exports.
- AbortError behavior is explicitly stated if applicable.
- Dedupe and AbortSignal ownership are documented when applicable.
- Contents anchors are accurate and updated after edits.
- No duplicated or outdated sections.
