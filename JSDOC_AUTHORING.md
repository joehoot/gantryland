# JSDoc Authoring Guide (LLM Instructions)

Use this guide when writing or updating JSDoc in Gantryland source files. The goal is maximum developer ergonomics: fast comprehension, predictable behavior, and actionable examples. Keep docs aligned with actual runtime behavior.

## Core Principles
- Document behavior, not implementation.
- Be explicit about cancellation and error handling (AbortError rules).
- Prefer short, precise sentences over verbose descriptions.
- Keep examples minimal and representative of real usage.
- Match the terminology and tone used in `packages/task/index.ts` and `packages/task-combinators/index.ts`.

## Required Structure
Use this ordering for JSDoc blocks when applicable:
1. Short summary line (imperative or descriptive)
2. 1-3 lines of behavior details (bullets only if list is clearer)
3. `@template` (if generic)
4. `@param` entries in the exact function signature order
5. `@returns` (what it resolves to or yields; include undefined behavior)
6. `@example` with a focused snippet

## Behavioral Clarity Checklist
Always answer these, if relevant:
- Does it abort or respect an AbortSignal?
- Does it swallow or rethrow AbortError?
- Does it preserve prior data or overwrite state?
- Does it return `undefined` on abort/superseded runs?
- Is fallback sync or async?

If any are relevant, say so directly. Avoid vague terms like "may" when behavior is deterministic.

## Tag Guidance
- `@template`: include brief type meaning (e.g., "T - resolved data type").
- `@param`: use concise nouns; explain observable effects, not internal usage.
- `@returns`: describe the resolved value and important failure/undefined behavior.
- `@example`: 6-12 lines; realistic; avoid pseudocode.

## Example Style
- Use TypeScript examples.
- Show AbortSignal usage when cancellation matters.
- Keep example variable names aligned with existing docs (`task`, `taskFn`, `fetchUser`).
- Use `pipe` for combinators.

## Consistency Rules (from Task + Task-Combinators)
- "AbortError" is a first-class cancellation signal.
- "Latest wins" semantics should be stated when applicable.
- Avoid promising that timeouts abort underlying tasks unless the API does.
- If a combinator normalizes errors (e.g., AbortError -> TimeoutError), state it.
- For Task `run`, be explicit that non-successful outcomes resolve to `undefined`.

## Style Constraints
- ASCII only unless the file already contains Unicode.
- Avoid adding comments unless they clarify non-obvious behavior.
- No marketing tone; keep it technical and calm.
- Prefer "resolves"/"rejects" language for Promise behavior.

## Example Templates

### Function
```typescript
/**
 * Short summary.
 *
 * Additional behavior details.
 *
 * @template T - Description
 * @param arg - Description
 * @returns Description
 *
 * @example
 * ```typescript
 * const result = await fn(input);
 * ```
 */
```

### Combinator
```typescript
/**
 * Short summary.
 *
 * Behavior details, including AbortError handling.
 *
 * @template T - Input data type
 * @template U - Output data type
 * @param fn - Transform or side-effect function
 * @returns A combinator that returns a TaskFn
 *
 * @example
 * ```typescript
 * const taskFn = pipe(fetchUser, map(transform), retry(2));
 * ```
 */
```

## Alignment Checks Before Finalizing
- JSDoc matches function signature and current behavior.
- Example compiles with current exports.
- Terms match package docs (Task, TaskFn, AbortError, TimeoutError).
