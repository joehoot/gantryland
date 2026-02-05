# README Authoring Guide

This file describes how to author package README files in this repo. Use `packages/task/README.md` as the gold standard for structure, tone, and depth.

## Goals

- Make docs professional, approachable, and practical.
- Optimize for developer ergonomics and scanning.
- Document real APIs that exist in the package.
- Provide examples that run as written.

## Process

1. Inspect the package contents
   - Read the package entry points and public exports.
   - Check `package.json` for name, entry points, and side-effects.
   - Verify tests/examples if present.
2. Identify the core concept
   - What is the smallest mental model that explains the package?
   - What are the primary use cases?
3. Choose the right sections
   - Start from the template below and remove sections that do not apply.
4. Write examples that are accurate
   - Only use exported APIs.
   - Keep examples small and focused.
   - Prefer `typescript` for code blocks and `tsx` for React.
5. Cross-link related packages
   - Link to other `packages/*` where integration is common.
6. Final pass
   - Tighten wording.
   - Ensure headings match the Contents list.
   - Remove fluff, keep clarity.

## Required sections

Start from these sections, but omit any that do not apply to the package. Keep the order for sections you include:

1. Title and intro paragraph
2. Installation
3. Contents (table of contents)
4. Quick start
5. Core concepts
6. API (constructor + methods/functions, with per-method docs)
7. Common patterns or Practical examples
8. Related packages
9. Tests

## Recommended sections (use when relevant)

- Design goals
- When to use / When not to use
- Lifecycle or data flow
- Guarantees / Gotchas
- Integrations (for cross-package usage)

## Style and tone

- Concise, direct, and neutral.
- Prefer short sentences and bullets.
- Avoid marketing language.
- Use ASCII only unless the file already uses Unicode.

## Example structure (template)

```markdown
# @gantryland/<package>

One-sentence summary of what the package is and the problem it solves.

- 3-5 value bullets focused on developer ergonomics.

## Installation

```bash
npm install @gantryland/<package>
```

## Contents

- [Quick start](#quick-start)
- [Core concepts](#core-concepts)
- [API](#api)
- [Common patterns](#common-patterns)
- [Related packages](#related-packages)
- [Tests](#tests)

## Quick start

```typescript
// Minimal working example
```

One sentence that explains the quick start.

## Core concepts

### <Concept>

Short definition.

## API

### Constructor (if applicable)

```typescript
new Thing(options)
```

### API at a glance (table)

| Member | Purpose | Returns |
| --- | --- | --- |
| ... | ... | ... |

### Methods

#### thing.method

```typescript
thing.method(): ReturnType
```

Short description.

```typescript
// Small example
```

## Common patterns

### Pattern title

```typescript
// Example
```

## Related packages

- [@gantryland/other](../other/) - One-line purpose

## Tests

```bash
npm test
npx vitest packages/<package>/test
```
```

## Accuracy checklist

- All APIs and imports exist in the package.
- Examples compile as written.
- Headings align with Contents anchors.
- Related packages are correct and relevant.
