# Package Authoring Guide (LLM Instructions)

Use this guide to design, implement, and document Gantryland packages. The reference tone and rigor are `packages/task/index.ts`, `packages/task-combinators/index.ts`, `JSDOC_AUTHORING.md`, and `README_AUTHORING.md`.

## Goals
- Optimize for developer experience, ergonomics, and comprehension.
- Preserve core behavior while improving clarity and consistency.
- Keep APIs small, composable, and predictable.

## Core Principles
- Behavior first: define observable behavior before implementation.
- Cancellation is explicit: document AbortSignal usage and AbortError handling.
- Determinism over cleverness: same inputs should yield the same outcomes.
- Consistency across packages: naming, error handling, and semantics align.

## Package Design Checklist
1. **API surface**: minimal exports, names aligned with existing packages.
2. **TaskFn contract**: always `(signal?: AbortSignal, ...args) => Promise<T>`.
3. **Abort semantics**: never swallow AbortError unless explicitly documented.
4. **Return values**: state when a Promise resolves to `undefined`.
5. **Latest-wins**: if applicable, state supersession behavior.
6. **Synchronous vs async**: be explicit for fallbacks and hooks.
7. **Composability**: interop with `pipe` and other combinators.

## Implementation Guidelines
- Prefer simple, readable control flow over abstraction.
- Keep internal helpers private and documented only if non-obvious.
- Do not introduce stateful side effects unless required.
- Use types to enforce ergonomics; avoid `unknown` leakage in public APIs.
- Ensure AbortSignal cleanup (remove listeners, clear timers).

## Error and Cancellation Rules
- AbortError is a first-class cancellation signal.
- Do not convert AbortError to another error unless documented.
- If a helper normalizes errors (e.g., AbortError -> TimeoutError), document it clearly.
- Preserve existing data on error unless the API explicitly resets it.

## Documentation Requirements
- JSDoc must follow `JSDOC_AUTHORING.md`.
- README must follow `README_AUTHORING.md`.
- JSDoc, README, and tests must agree on semantics.

## Tests
- Cover success, failure, and abort paths.
- Include edge cases: retries, timeouts, and supersession behavior.
- Prefer deterministic tests; use fake timers when needed.

## Naming and Terminology
- Use `Task`, `TaskFn`, `TaskState`, `AbortError`, `TimeoutError` consistently.
- Choose verbs that reflect behavior (e.g., `timeoutAbort` vs `timeout`).
- Avoid synonyms that imply different semantics.

## README Expectations
- Quick start shows the primary workflow.
- At a glance shows the smallest useful usage.
- Run semantics are explicit when behavior is non-trivial.
- Examples compile and use current exports.

## Final Review Checklist
- API behavior documented in JSDoc and README.
- Abort behavior explicitly stated.
- All examples compile.
- Tests cover major behaviors.
- No duplicate or conflicting docs.
