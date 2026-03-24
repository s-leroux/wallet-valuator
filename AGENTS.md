# Guidelines for the wallet-valuator Project

This file contains instructions for Codex agents working in this repository. These guidelines complement `README.md` and `CONTRIBUTING.md`.

## Development Environment

- Agents must assume they are already running **inside the Development Container**.
  All library and application work is intended to happen **inside the Development Container** (project tree at **`/app`**, image built from `docker/Dockerfile`).
  The presence of the `/app` directory containing this project’s files is usually
  sufficient to confirm that. Do not attempt to build or start containers from
  inside the container.
- The **development container** is defined by `docker/Dockerfile` and is managed **from the host**
  using the `Makefile`:
  - Build the container image with `make docker-image` (host only).
  - Launch an interactive shell with `make docker-shell` (host only).
  - Optionally, start an IDE attached to an existing container with
    `make open-ide IDE=Cursor DEV_CONTAINER=$CONTAINER_ID` (host only).
- Inside the **development container**:
  - Use `npm` and `npx` for all commands (see `package.json`).
  - Run compilation, linting, and tests only with `npm`/`npx` (for example,
    `npm install`, `npm run lint-in-container`, etc.).
  - Do **not** invoke host `make` targets from within the container.

### Host vs Container

- On the **host**, the **`Makefile`** is an **orchestrator** used notably to rebuild the development container image, start a container and open a shell in it, attach an IDE to a running container, or run other host-driven workflows. **Agents will rarely or never need those targets**; they normally operate in an environment that is already the development container.
- In the **development container**, run tooling with **`npm`**, **`npx`**, and the **`scripts`** in [`package.json`](package.json). After `npm install`, you may also call binaries from **`/app/node_modules/.bin`** directly (that directory is on **`PATH`** in the image, so names like `tsc`, `eslint`, and `mocha` work when dependencies are present).

### Commands Agents Use (in development container)

- Install / refresh dependencies: **`npm install`**
- Compile: `npm run compile` (`tsc`) or `npx tsc [OPTIONS...]` or `tsc [OPTIONS...]`
- Tests: `npm test` (Mocha against `build/`; compile first). For fine-grained control, use `npx mocha [OPTIONS...]` or `mocha [OPTIONS...]` (example: `mocha --grep "Fixed"`)
- **Test environment variables:** `NODE_ENV` defaults to `test` via `.mocharc.cjs` when unset. Optional or live suites use env vars documented under [Environment variables (tests)](README.md#environment-variables-tests) in `README.md`. Note: the **Etherscan** live suite **requires** `ETHERSCAN_API_KEY`; if it is missing, `npm test` fails in that suite’s `before` hook (unlike other live blocks that skip when the variable is off).
- Lint (applies fixes): `npm run lint` (see `package.json` — the script uses ESLint with `--fix`).
  For fine-grained control, use `npx eslint [OPTIONS...]` or `eslint [OPTIONS...]` (example: `eslint --fix "src/**/*.ts"`)

See [`package.json`](package.json)for the up-to-date list of commands.

## Coding Style

- The project uses TypeScript in strict mode.
- Use `const` by default and `let` only when reassignment is required.
- Prefer arrow functions unless a classic function is necessary.
- Use `===`/`!==` for comparisons.
- When dealing with optional values, prefer `undefined`; use `null` only for explicit absence of a value.
- When returning `Record<K, V>` objects, create them with `Object.create(null)` to avoid prototype pollution.
- Mixed property declarations (constructor parameters and explicit fields) are allowed when injecting dependencies while keeping data properties explicit.

## Fixed-point decimals (`Fixed`)

Wallet Valuator uses **`Fixed`** (`src/bignumber.mts`) as the **canonical internal representation** for decimal quantities: a signed integer **unscaled value** (the `value` field) and a non-negative integer **scale** (number of decimal places), with the quantity `value × 10^−scale`.
The maximum scale is controlled by the `MAX_FIXED_SCALE` constant. The minimum scale is `0` (integer number with no decimal places).

### Layers: `FixedLike`, `Fixed`, `FixedSource`

- **`FixedLike`** — `{ value: bigint; scale: bigint }` where `value` is the **unscaled value**. Any API that operates on fixed-point values internally should take **`FixedLike`** as the argument type when possible so callers may pass plain objects or **`Fixed`** instances alike.
- **`Fixed`** — the concrete class; use it when **`FixedLike` is not enough** (e.g. you need a specific return type, factories, or instance methods).
- **`FixedSource`** — **`bigint | string | FixedLike`**. Use this at **boundaries** (constructors, parsers, `fixedFromSource`, public “amount/rate” parameters) where input may still be “external”:
  - **`bigint`** — interpreted as an **integer** (scale `0`).
  - **`string`** — a **base-10 decimal** literal, optionally with scientific notation (`e`/`E`). The **scale is inferred from the text**: fractional digits count, including trailing zeros (e.g. `"1.00"` → scale `2`, `"1.00000"` → scale `5`). Leading/trailing whitespace is ignored.
  - **`FixedLike`** / **`Fixed`** — copied as-is (same value and scale).

### JavaScript `number` and `IntegerSource`

A raw **`number` must never be used as the sole, implicit source of a decimal `Fixed`** (floats are not a trustworthy decimal carrier).

- To build a `Fixed` from numeric inputs with an **explicit scale**, use **`Fixed.create(unscaledValue, scale)`** (and related paths): both parameters are typed as **`IntegerSource`** (`bigint | string | number`). At **runtime**, **`scale` must be a non-negative integer** (as `bigint` after coercion). The project uses **`IntegerSource`** so call sites may pass small literals conveniently; **`bigint` is preferred** for scale when clarity matters.
- **`Fixed.fromInteger(v)`** accepts **`IntegerSource`** for **whole integers** only (result scale `0`). It is not a general “decimal from float” API.
- **`Fixed.fromNumber(v, scale)`** (finite doubles only) quantizes at **`10^−scale`** by **truncating toward zero** (same sense as reducing scale with **`withDecimals`** and as integer division in **`div`**), not by rounding like **`Number.prototype.toFixed`**. It adapts via `v.toString()` and `Fixed.fromString(..., scale)`, so scientific notation from `number` formatting is supported.

### Comparisons (`compare`, `equals`, …)

Ordering and equality **align operands to the larger of the two scales** by conceptually padding the lower-scale operand with trailing **zeros** (implemented via scaling the lower operand’s **unscaled value**). Two zeros compare equal regardless of scale.

### Arithmetic (summary of `Fixed` in `src/bignumber.mts`)

These rules match the comments on the methods; they are **not** the same as the comparison rule above (multiplication uses **sum of scales**, not “max scale”):

- **`plus` / `minus`** — result at the **higher** scale of the two operands (same alignment idea as comparison, then add/subtract).
- **`mul`** — by default, result scale is the **sum** of the operand scales (the result’s **unscaled value** is the product of the operands’ **unscaled values**). An optional **`requestedScale`** may **reduce** the result scale via **truncation** toward zero (it cannot request a scale larger than that product scale).
- **`div`** — the result scale is **always explicit** (`targetScale`); the quotient is **quantized** with **integer division** (truncation toward zero). There is no default “natural” output scale.
- **`static sum`** — iterative **`plus`**; the result ends at the **highest** scale among the operands.

Domain types (e.g. **`Price`**, **`Value`**, **`Amount`**) should expose **`FixedSource`** (not bare `number`) at their public edges where a decimal is intended; internal fields remain **`Fixed`**.

## Commit and Pre-commit Expectations

- Include **test coverage** for new behavior or fixes when the change is not adequately covered already (see [`CONTRIBUTING.md`](CONTRIBUTING.md)).
- Before committing, with dependencies installed **in the container**, ensure **`npm run compile`** and **`npm test`** succeed.
- Run **`npm run lint`** when your edits should satisfy ESLint; the configured script runs with **`--fix`** and may modify files. For fine-grained control, use `npx eslint [OPTIONS...]` or `eslint [OPTIONS...]` (example: `eslint --fix "src/**/*.ts"`).
