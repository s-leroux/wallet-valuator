# Wallet Valuator

## Overview

Wallet Valuator is a TypeScript project that handles cryptocurrency accounting
and portfolio valuation. It includes both a reusable library and a command-line
interface.

Wallet Valuator began as a small TypeScript library to explore on‑chain data.
The original goal was to let developers navigate the blockchain in code as
easily as they would through a block explorer such as GnosisScan. Only the
`Address` and `Transaction` classes were implemented at that time.

The project pivoted when it became necessary to prepare a French tax declaration
for multiple wallets. Accounting requirements forced several design changes:

- navigation features became secondary to the ability to aggregate transactions
  across chains and centralized exchanges (CEXs)
- tokens stored on different blockchains now map to logical **crypto assets** so
  that a single asset (for example USDC) can be reported regardless of the
  chain it resides on
- the library gained a command‑line entry point at `cli/report-cli.mts` (formerly
  `blockchain-cli.mts`) for
  processing wallets and generating reports

Today Wallet Valuator is both a library and a CLI application focused on
crypto‑asset tracking and accounting for French regulations. The interactive
navigation layer still exists, but accounting is the main focus.

## Project Status

🚧 **Under Active Development (03-2026)** 🚧

## Numeric representation

Decimal amounts and rates in the library use a fixed-point type **`Fixed`** (integer value + decimal scale), not raw JavaScript **`number`**, at domain boundaries. **Contributors** should read the **`Fixed`-point policy** in [`AGENTS.md`](AGENTS.md) (`FixedLike` vs `FixedSource`, string scale inference, `IntegerSource`, and arithmetic rules).

## Development environment (Dev Container)

All development is intended to happen **inside the Development Container** built
from `docker/Dockerfile`. The host system is only used to build and run that
container and to start your editor attached to it.

- The dev container includes tools such as `vim`, `node`, `npm`, `npx`, `tsc`,
  `jq`, `gemini` and others; see `docker/Dockerfile` on the host for details.
- Inside the container, when possible, use `npm` and `npx` (see [`package.json`](package.json)) for
  compilation, linting, and tests. Once dependencies are installed, you may also invoke tools from
  `/app/node_modules/.bin` directly (`tsc`, `eslint`, `mocha`, etc.); that directory is on `PATH` in the image.
- The `Makefile` and its targets are intended **only for use on the host** to
  manage the container lifecycle and run commands in the container.

Remote in‑container development from the host is straightforward with VS Code or
Cursor using the **Dev Containers** extension (`ms-vscode-remote.remote-containers`):

- Start or reuse a dev container as described below.
- From the host, you can launch your IDE already attached to a running container
  with:

  ```sh
  make open-ide IDE=Cursor DEV_CONTAINER=$CONTAINER_ID
  ```

  (replace `Cursor` if you prefer another supported IDE value — currently only the `Cursor` and `Code` editors are supported).

Once the IDE is attached, you work entirely against the `/app` directory inside
the container as if it were a local project.

# Stage 0

Install docker and npm (any version) on the host computer.
After that we will work in a specific container.

# Stage 1: Create and start the container

First, build the container image:

```sh
make docker-image
```

Then, launch an interactive shell inside the container. This is where you'll perform most development tasks:

```sh
make docker-shell
```

Once inside the container, you will need to install Node.js dependencies:

```
node@...:~$ npm install
```

Compile the TypeScript sources (writes to `build/`):

```
node@...:~$ npm run compile
```

(`npx tsc` is equivalent.)

# Stage 2: Run tests

From inside the container, after a successful compile:

```sh
node@...:~$ npm test
```

This runs Mocha against `build/test/**/*.mjs` (see [`package.json`](package.json)).

On the **host**, without opening an interactive shell, you can use `make docker-test`, which runs `npm test` in a one-off container with the repo bind-mounted. Ensure `npm install` and `npm run compile` have been run at least once so `node_modules/` and `build/` exist on the mounted workspace.

### Environment variables (tests)

`npm test` loads [`.mocharc.cjs`](.mocharc.cjs), which sets **`NODE_ENV`** to `test` when it was unset. Some library code relies on that during tests.

Several suites are **optional** or **live** (network + API keys). The helper **`when()`** in [`test/support/test.helper.mts`](test/support/test.helper.mts) treats a variable as *off* when it is **unset** or set to **`0`** or **`no`** (case-insensitive); any other value turns the gated block *on*. You still need a valid key when a live suite runs.

| Variable | Role |
| --- | --- |
| **`ETHERSCAN_API_KEY`** | **Etherscan** live tests ([`test/services/explorers/etherscan.spec.mts`](test/services/explorers/etherscan.spec.mts)): **must be set** to a real key, or the suite’s `before` hook throws and **`npm test` fails**. The same variable is used for **GnosisScan** live tests ([`gnosisscan.spec.mts`](test/services/explorers/gnosisscan.spec.mts)), but that block is wrapped in `when("ETHERSCAN_API_KEY", …)`—so it is **skipped** when the variable is off. |
| **`COINGECKO_API_KEY`** | **CoinGecko** live tests ([`coingecko.spec.mts`](test/services/oracles/coingecko.spec.mts)): skipped when off via `when("COINGECKO_API_KEY", …)`. |
| **`EXPECTED_GIT_SHA`** | **Runtime pinned build** check ([`runtime-pinned-build.helper.mts`](test/support/runtime-pinned-build.helper.mts)): compares the build’s `GIT_SHA.txt` to this value; the test is **skipped** when unset (custom name supported via `registerRuntimePinnedBuildTest(name)`). |
| **`EXAMPLES`** | **Example programs** ([`test/examples.spec.mts`](test/examples.spec.mts)): the whole describe is skipped when off via `when("EXAMPLES", …)`. |
| **`APP_ROOT_PATH`** | Root directory for resolving **`build/examples`** in example tests; defaults to **`.`** if unset (same file). |

# Stage 3: Run ESLint

From inside the container:

```sh
node@...:~$ npm run lint
```

The configured script runs ESLint with `--fix` and may modify files.

On the **host**, `make docker-lint` runs the same npm lint script in a one-off container (see the `Makefile`).

## CLI Usage

Once the project is compiled you can generate a report from a configuration file
inside the container:

```sh
node build/cli/report-cli.mjs --config mywallet.json
```

The resulting text can be copied directly into your yearly French tax return.

## Important Notice

This project is being actively developed to meet the 2026 French tax declaration deadline.
The current focus is on core functionality and backend stability.
Comprehensive documentation and user interface improvements will be added in subsequent updates.

## License

See [LICENSE](LICENSE) file for details.
