## Overview

Wallet Valuator is a TypeScript project that handles cryptocurrency accounting
and portfolio valuation.  It includes both a reusable library and a command-line
interface.

Wallet Valuator began as a small TypeScript library to explore on‑chain data.
The original goal was to let developers navigate the blockchain in code as
easily as they would through a block explorer such as GnosisScan. Only the
`Address` and `Transaction` classes were implemented at that time.

The project pivoted when it became necessary to prepare a French tax declaration
for multiple wallets.  Accounting requirements forced several design changes:

- navigation features became secondary to the ability to aggregate transactions
  across chains and centralized exchanges (CEXs)
- tokens stored on different blockchains now map to logical **crypto assets** so
  that a single asset (for example USDC) can be reported regardless of the
  chain it resides on
- the library gained a command‑line entry point at `cli/blockchain-cli.mts` for
  processing wallets and generating reports

Today Wallet Valuator is both a library and a CLI application focused on
crypto‑asset tracking and accounting for French regulations.  The interactive
navigation layer still exists, but accounting is the main focus.

## Project Status

🚧 **Under Active Development (06-2025)** 🚧

# Stage 0

Install docker and npm (any version) on the host computer.
After that we will work in a specific container.

# Stage 1: Create and start the container:

```
sh$ npm run build-container
sh$ npm run shell

node@52939f3b198e:~$ pwd
/home
node@52939f3b198e:~$ ls -l
total 12
-rw-rw-r-- 1 node node  841 Oct  1 07:58 DOCKERFILE
-rw-rw-r-- 1 node node 1071 Oct  1 07:56 LICENSE
-rw-rw-r-- 1 node node 1136 Oct  1 08:15 package.json
node@52939f3b198e:~$ whoami
node
node@52939f3b198e:~$ exit
exit

sh$
```

# Start 2: Run the node application

```
sh$ npm start
# or
sh$ npm run shell
node@2b9634cf5c20:~$ exec yarn start-in-container
```

# Stage 3: Run Mocha

```
sh$ npm test
# or
sh$ npm run shell
node@2b9634cf5c20:~$ exec yarn test-in-container
```

# Stage 4: Run ESLint

```
sh$ npm run lint
# or
sh$ npm run shell
node@2b9634cf5c20:~$ exec yarn lint-in-container
```

## Important Notice

This project is being actively developed to meet the 2025 French tax declaration deadline.
The current focus is on core functionality and backend stability.
Comprehensive documentation and user interface improvements will be added in subsequent updates.

## License

See [LICENSE](LICENSE) file for details.
