# Source Code Authoring Guide

Use this guide to design and implement Gantryland package source code. The reference tone and rigor are `packages/task/index.ts` and `packages/task-combinators/index.ts`.

This guide is intentionally limited to source implementation. JSDoc, package docs, and tests are covered in their dedicated guides.

## Goals
- Optimize for developer experience, ergonomics, and comprehension.
- Preserve and clarify runtime behavior.
- Keep APIs small, composable, and predictable.

## Core Principles
- Behavior first: define observable behavior before implementation.
- Cancellation is explicit: implement predictable AbortSignal behavior.
- Determinism over cleverness: same inputs should yield the same outcomes.
- Consistency across packages: naming, error handling, and semantics align.

## Package Design Checklist
1. **API surface**: minimal exports, names aligned with existing packages.
2. **TaskFn contract**: always `(signal?: AbortSignal, ...args) => Promise<T>`.
3. **Abort semantics**: never swallow AbortError unless the package behavior requires it.
4. **Return values**: state when a Promise resolves to `undefined`.
5. **Latest-wins**: if applicable, state supersession behavior.
6. **Synchronous vs async**: be explicit for fallbacks and hooks.
7. **Composability**: interop with `pipe` and other combinators.

## Implementation Guidelines
- Prefer simple, readable control flow over abstraction.
- Keep internal helpers private unless they are part of the API.
- Do not introduce stateful side effects unless required.
- Use types to enforce ergonomics; avoid `unknown` leakage in public APIs.
- Ensure AbortSignal cleanup (remove listeners, clear timers).
- Guard against double-settle when multiple completion paths exist.

## Error and Cancellation Rules
- AbortError is a first-class cancellation signal.
- Do not convert AbortError to another error unless required by package semantics.
- If a helper normalizes errors (e.g., AbortError -> TimeoutError), keep behavior consistent across all code paths.
- Preserve existing data on error unless the API explicitly resets it.

## Naming and Terminology
- Use `Task`, `TaskFn`, `TaskState`, `AbortError`, `TimeoutError` consistently.
- Choose verbs that reflect behavior (e.g., `timeoutAbort` vs `timeout`).
- Avoid synonyms that imply different semantics.

## Final Review Checklist
- Public API is minimal and composable.
- AbortSignal lifecycle is cleaned up in every path.
- Error normalization is intentional and consistent.
- Return values and state transitions are deterministic.
- Start/abort/resolve races have a single completion path.

## Post-change Audit
- Re-check AbortSignal lifecycle (remove listeners once a run starts).
- Ensure cancellation cannot double-settle a promise.
- Verify queued aborts remove entries and do not block subsequent work.
- Check start/abort races for a single completion path.
