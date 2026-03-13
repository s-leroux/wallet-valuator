# Guidelines for the wallet-valuator Project

This file contains instructions for Codex agents working in this repository. These guidelines complement `README.md` and `CONTRIBUTING.md`.

## Development Environment

- Agents must assume they are already running **inside the Development Container**.
  The presence of the `/app` directory containing this project’s files is usually
  sufficient to confirm that. Do not attempt to build or start containers from
  inside the container.
- The dev container is defined by `docker/Dockerfile` and is managed **from the host**
  using the `Makefile`:
  - Build the container image with `make docker-image` (host only).
  - Launch an interactive shell with `make docker-shell` (host only).
  - Optionally, start an IDE attached to an existing container with
    `make open-ide IDE=Cursor DEV_CONTAINER=$CONTAINER_ID` (host only).
- Inside the container:
  - Use `npm` and `npx` for all commands (see `package.json`).
  - Run compilation, linting, and tests only with `npm`/`npx` (for example,
    `npm install`, `npm run lint-in-container`, etc.).
  - Do **not** invoke host `make` targets from within the container.

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
