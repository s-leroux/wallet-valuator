# Guidelines for the wallet-valuator Project

This file contains instructions for Codex agents working in this repository. These guidelines complement `README.md` and `CONTRIBUTING.md`.

## Development Environment

- Use the Docker container defined by `docker/Dockerfile`.
  - Build the container with `make docker-image`.
  - Launch an interactive shell with `make docker-shell`.
  - Inside the container, use `npm` and `npx` for commands.
  - Install dependencies with `npm install` after entering the container (via `make docker-shell`).
  - Compile the TypeScript sources with `make docker-compile`.
    All compilation, linting, and tests **must** run inside the container.
  - Execute tests with `make docker-test`.

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
- Ensure `make docker-test` and `make docker-lint` pass before committing.
