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

## Development environment (Dev Container)

All development is intended to happen **inside the Development Container** built
from `docker/Dockerfile`. The host system is only used to build and run that
container and to start your editor attached to it.

- The dev container includes tools such as `vim`, `node`, `npm`, `npx`, `tsc`,
  `jq`, `gemini` and others; see `docker/Dockerfile` on the host for details.
- Inside the container, use `npm` and `npx` (see `package.json`) for all
  compilation, linting and test commands.
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

And then you can compile the TypeScript sources:

```
node@...:~$ npx tsc
# or using make from the host
# make docker-compile
```

# Stage 2: Run Mocha

To run the tests:

```sh
make docker-test
```

# Stage 3: Run ESLint

To run the linter, you must first enter the container shell using `make docker-shell`, then execute the npm command:

```sh
make docker-shell
# Inside the container:
node@...:~$ npm run lint-in-container
```

## CLI Usage

Once the project is compiled you can generate a report from a configuration file
inside the container:

```sh
node build/cli/report-cli.mjs --config mywallet.json
```

The resulting text can be copied directly into your yearly French tax return.

## Important Notice

This project is being actively developed to meet the 2025 French tax declaration deadline.
The current focus is on core functionality and backend stability.
Comprehensive documentation and user interface improvements will be added in subsequent updates.

## License

See [LICENSE](LICENSE) file for details.
