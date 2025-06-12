# Guidelines for the wallet-valuator Project

This file contains instructions for Codex agents working in this repository. These guidelines complement `README.md` and `CONTRIBUTING.md`.

## Development Environment
- Use the Docker container defined by `DOCKERFILE`.
  - Build the container with `npm run build-container`.
  - Launch an interactive shell with `npm run shell`.
  - Inside the container, use `npm` and `npx` for commands.
  - Install dependencies with `npm install` after entering the container.
  - Compile the TypeScript sources with `npx tsc`.
All compilation, linting, and tests **must** run inside the container.
  - Execute tests with `npm run test-in-container`.
  - Run the linter with `npm run lint-in-container`.

## Coding Style
- The project uses TypeScript in strict mode.
- Use `const` by default and `let` only when reassignment is required.
- Prefer arrow functions unless a classic function is necessary.
- Use `===`/`!==` for comparisons.
- When dealing with optional values, prefer `undefined`; use `null` only for explicit absence of a value.
- When returning `Record<K, V>` objects, create them with `Object.create(null)` to avoid prototype pollution.
- Mixed property declarations (constructor parameters and explicit fields) are allowed when injecting dependencies while keeping data properties explicit.

## Commit Requirements
- Provide test coverage for new features or bug fixes.
- Ensure `npm run test-in-container` and `npm run lint-in-container` pass before committing.

