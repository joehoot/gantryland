# Authoring Guides

These guides define Gantryland package standards for source code, JSDoc, package docs, and tests.

## Guides

- [`docs/authoring/source-code.md`](source-code.md) - Source-code authoring guide for package APIs and runtime behavior.
- [`docs/authoring/jsdoc.md`](jsdoc.md) - JSDoc structure and behavior clarity requirements.
- [`docs/authoring/package-docs.md`](package-docs.md) - Package documentation structure and content standards.
- [`docs/authoring/tests.md`](tests.md) - Deterministic testing patterns and coverage expectations.

## Scope boundaries

- `source-code.md` defines implementation and runtime behavior rules only.
- `jsdoc.md` defines API comment structure and behavior wording.
- `package-docs.md` defines package documentation structure and examples.
- `tests.md` defines behavioral test coverage and deterministic testing style.

## Recommended usage order

1. Start with `source-code.md` for source behavior and API shape.
2. Use `jsdoc.md` and `package-docs.md` while documenting the package.
3. Use `tests.md` to verify behavior and edge-case coverage.
