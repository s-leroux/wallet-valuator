---
name: fixed-point-migration-order
overview: Create a least-resistance migration processing order (DAG) for BigNumber-based value classes toward fixed-point `Fixed`, with a robust step-by-step method to keep tests and compilation reliable even when parts are mid-migration.
todos:
  - id: build-baseline-dag
    content: "Confirm BigNumber-backed value classes and their code-level dependencies from: `src/bignumber.mts`, `src/price.mts`, `src/cryptoasset.mts`, `src/valuation.mts`, `src/quantity.mts`, and oracle/transaction files."
    status: completed
  - id: define-migration-order
    content: "Use DAG order for least resistance: `Price` -> `Value` -> `Amount` -> `Quantity` -> `Valuation pipeline` -> `Oracles` -> `Transaction fees` -> optional `displayable` cleanup."
    status: pending
  - id: migrate-price-step1-tests-green
    content: "Migrate `Price` (`src/price.mts`) step 1: ensure current focused Mocha coverage runs and is passing; record the baseline `git rev-parse HEAD` and the exact `npx mocha` command used."
    status: completed
  - id: migrate-price-step2-rationalize
    content: "Migrate `Price` step 2: rationalize `Price` implementation (what `Fixed` represents, how scale is chosen) and document impacted methods (`constructor`, `to()`, `mul()`), including any rename/intent cleanup."
    status: completed
  - id: migrate-price-step3-big-number-to-fixed
    content: "Migrate `Price` step 3: change `Price.rate` storage from `BigNumber` to `Fixed` and update boundaries/conversions needed by the current compilation slice."
    status: completed
  - id: migrate-price-step4-tests-after
    content: "Migrate `Price` step 4: rerun the same focused Mocha suite(s) and adjacent suites that exercise `Amount.valueAt(price)`; update tests to assert against `Fixed` where needed."
    status: completed
  - id: migrate-value-step1-tests-green
    content: "Migrate `Value` (`src/valuation.mts`, class `Value`) step 1: ensure current focused Mocha coverage runs and is passing for `valuation.spec`; record baseline SHA + exact `npx mocha` invocation."
    status: completed
  - id: migrate-value-step2-rationalize
    content: "Migrate `Value` step 2: rationalize `Value` arithmetic semantics (`plus`, `minus`, `scaledBy`, `relativeTo`, `negated`) and document scale/truncation expectations under fixed-point."
    status: pending
  - id: migrate-value-step3-big-number-to-fixed
    content: "Migrate `Value` step 3: change `Value.value` from `BigNumber` to `Fixed` and update constructors/helpers used by the current compilation slice."
    status: pending
  - id: migrate-value-step4-tests-after
    content: "Migrate `Value` step 4: rerun `valuation.spec` plus any dependent suites that use `Value.from()`/arithmetic; fix/adjust tests to use `Fixed`."
    status: pending
  - id: migrate-amount-step1-tests-green
    content: "Migrate `Amount` (`src/cryptoasset.mts`, class `Amount`) step 1: ensure current focused Mocha coverage runs and is passing for `cryptoasset.spec`; record baseline SHA + exact `npx mocha` invocation."
    status: pending
  - id: migrate-amount-step2-rationalize
    content: "Migrate `Amount` step 2: rationalize `Amount` implementation, especially `valueAt(price)`, and document the numeric domain/scaling relationship between `Amount.value` and `Price.rate`."
    status: pending
  - id: migrate-amount-step3-big-number-to-fixed
    content: "Migrate `Amount` step 3: change `Amount.value` from `BigNumber` to `Fixed` and update `valueAt(price)` to multiply in the fixed-point domain required by the compilation slice."
    status: pending
  - id: migrate-amount-step4-tests-after
    content: "Migrate `Amount` step 4: rerun `cryptoasset.spec` and `valuation.spec` (at minimum, where `amount.valueAt(price)` is exercised); update tests to assert on `Fixed`."
    status: pending
  - id: migrate-quantity-step1-tests-green
    content: "Migrate `Quantity` contract (`src/quantity.mts`) step 1: ensure current Mocha coverage for suites importing `Quantity` is passing; record baseline SHA + exact `npx mocha` invocation."
    status: pending
  - id: migrate-quantity-step2-rationalize
    content: "Migrate `Quantity` step 2: rationalize the `Quantity` interface to reflect fixed-point intent (types + return values) and document the meaning of `scaledBy()` and `relativeTo()` under fixed-point arithmetic."
    status: pending
  - id: migrate-quantity-step3-big-number-to-fixed
    content: "Migrate `Quantity` step 3: change `Quantity.value` (and related signatures) to use `Fixed`/`FixedSource`, then update `Amount` and `Value` to satisfy the contract in the current slice."
    status: pending
  - id: migrate-quantity-step4-tests-after
    content: "Migrate `Quantity` step 4: rerun `cryptoasset.spec`, `valuation.spec`, and any suite(s) that compile against `Quantity`; adjust tests to use `Fixed` where they build quantities."
    status: pending
  - id: migrate-valuation-pipeline-step1-tests-green
    content: "Migrate the `Valuation pipeline` (`src/valuation.mts`: `PointInTimeValuation`, `SnapshotValuation`, `PortfolioValuation`) step 1: ensure `valuation.spec` is passing; record baseline SHA + exact `npx mocha` invocation."
    status: pending
  - id: migrate-valuation-pipeline-step2-rationalize
    content: "Migrate the `Valuation pipeline` step 2: rationalize ratio computation sections (notably `share = cachOut.relativeTo(...)` and `cashIn.scaledBy(share)`) and document fixed-point scale/truncation expectations."
    status: pending
  - id: migrate-valuation-pipeline-step3-big-number-to-fixed
    content: "Migrate the `Valuation pipeline` step 3: ensure all internal valuation math uses `Fixed` operations consistently (after `Value`/`Amount` are migrated); update any leftover `BigNumber` usage."
    status: pending
  - id: migrate-valuation-pipeline-step4-tests-after
    content: "Migrate the `Valuation pipeline` step 4: rerun `valuation.spec` plus any snapshot-related suite(s) that fail; adjust tests expected strings/rounding if they change."
    status: pending
  - id: migrate-oracles-step1-tests-green
    content: "Migrate `Oracles` (`src/services/oracles/*.mts`, incl. `ohlcoracle`, `datasourceoracle`, `realtokenoracle`) step 1: run focused oracle tests that will be affected; record baseline SHA + exact `npx mocha` invocation(s)."
    status: pending
  - id: migrate-oracles-step2-rationalize
    content: "Migrate `Oracles` step 2: rationalize the numeric boundary at `Price` construction (what remains `BigNumber` internally vs what becomes `Fixed` in `Price.rate`) and document the chosen direction."
    status: pending
  - id: migrate-oracles-step3-big-number-to-fixed
    content: "Migrate `Oracles` step 3: update oracle generics and any conversions so they produce `Price` values with `Fixed` rates in the current compilation slice."
    status: pending
  - id: migrate-oracles-step4-tests-after
    content: "Migrate `Oracles` step 4: rerun oracle test suites and `valuation.spec`; update assertions that depend on `rate.toFixed(...)` formatting."
    status: pending
  - id: migrate-transaction-fees-step1-tests-green
    content: "Migrate `OnChainTransaction.fees` (`src/transaction.mts`) step 1: run `transaction.spec` and ensure passing; record baseline SHA + exact `npx mocha` command."
    status: pending
  - id: migrate-transaction-fees-step2-rationalize
    content: "Migrate `OnChainTransaction.fees` step 2: rationalize fee scaling math (`gasPrice`, `gasUsed`, `E18`) and document the fixed-point equivalent/units."
    status: pending
  - id: migrate-transaction-fees-step3-big-number-to-fixed
    content: "Migrate `OnChainTransaction.fees` step 3: change `fees` storage from `BigNumber` to the chosen fixed-point representation and update any conversions needed for display/CSV/export."
    status: pending
  - id: migrate-transaction-fees-step4-tests-after
    content: "Migrate `OnChainTransaction.fees` step 4: rerun `transaction.spec` and any CSV/export tests that touch transactions; update expected outputs if numeric formatting changes."
    status: pending
  - id: migrate-displayable-cleanup-step1-tests-green
    content: "Optional cleanup: migrate `displayable` BigNumber formatting path (`src/displayable.mts`) step 1: run `displayable.spec` and ensure passing; record baseline SHA."
    status: pending
  - id: migrate-displayable-cleanup-step2-rationalize
    content: "Optional cleanup: displayable step 2: rationalize and document whether the `BigNumber` formatting branch should be removed/kept temporarily once value classes are fixed-point."
    status: pending
  - id: migrate-displayable-cleanup-step3-big-number-to-fixed
    content: "Optional cleanup: displayable step 3: remove/adjust BigNumber-specific formatting so `Fixed` rendering is canonical (in the current compilation slice)."
    status: pending
  - id: migrate-displayable-cleanup-step4-tests-after
    content: "Optional cleanup: displayable step 4: rerun `displayable.spec` and then full `npm test` after enriching `tsconfig.migration.json` to full inputs."
    status: pending
  - id: partial-compilation-strategy
    content: "Implement isolation when global compilation breaks using `tsconfig.migration.json`: start with a minimal step compilation root set, compile with `tsc -p tsconfig.migration.json` (or `npx tsc -p tsconfig.migration.json`), and progressively enrich the config by adding more `src` files as each class migration succeeds; avoid adapter proliferation; always pin by git SHA and record compilation coverage mode."
    status: pending
  - id: update-tests-during-migration
    content: While migrating, adjust/extend tests so they construct/assert using `Fixed` instead of `BigNumber` in the suites touched by each per-class TODO above (update expected numeric strings/rounding if fixed-point truncation differs).
    status: pending
isProject: false
---

## Approach (evidence-first, isolation-first)

### Tooling notes captured during the “plan + commit + execute” run

- `git commit` failed when invoked as a plain `git commit ...` command because the execution wrapper injected an unsupported option:
  - observed failure: `error: unknown option 'trailer'`
  - trace showed: `git commit --trailer 'Made-with: Cursor' ...`
- Workaround that succeeded:
  - invoke git via an absolute path stored in a variable:
    - `gp=/usr/bin/git; $gp commit ...`
- When staging plan files under a gitignored directory:
  - observed: `.cursor/plans/<...>` is gitignored by repo rules
  - workaround: `git add -f .cursor/plans/<file>`
- Shell vs tool availability:
  - observed: running `rg` directly in `functions.Shell` failed with `rg: command not found`
  - workaround: use the Cursor code search tool (`functions.rg`) instead of shelling out to `rg`.

### Migration hard rule (compile + test from `build-migration/`)

During the migration phase you MUST:

- compile using `npx tsc -p tsconfig.migration.json` (this emits JS into `build-migration/`).
- pin the build to the expected git SHA using the `EXPECTED_GIT_SHA` environment variable.
- run Mocha against the emitted output: `npx mocha "build-migration/**/*.spec.mjs"`.

You MUST NOT:

- run `npx tsc` without `-p tsconfig.migration.json` (it emits to `build/`).
- run `npm test` (it targets `build/test/**`).
- run Mocha against `build/` output.

### 0) Establish the migration “graph” from actual code

- I previously scanned the codebase to find every type-level consumer of `BigNumber` (and confirmed `Fixed` lives in `src/bignumber.mts`).
- Commands used during analysis (via repo search/read):
  - `rg "\\bBigNumber\\b" /app/src` (to find BigNumber-typed value classes)
  - `rg "\\bBigNumber\\b" /app` (to ensure we didn’t miss other usages)
  - `rg "\\bFixed\\b" /app/src` (to understand the fixed-point API surface)
  - `ReadFile` on key modules: `src/bignumber.mts`, `src/price.mts`, `src/cryptoasset.mts`, `src/valuation.mts`, `src/quantity.mts`, oracle implementations.

From those results, the only real BigNumber-backed “value classes” that store `BigNumber` are:

- `Price` (`src/price.mts`) holds `rate: BigNumber`
- `Amount` + `CryptoAsset` helpers (`src/cryptoasset.mts`) hold `value: BigNumber`
- `Value` (`src/valuation.mts`) holds `value: BigNumber`
- `Quantity` interface (`src/quantity.mts`) expresses `value: BigNumber` + arithmetic signatures
- plus `OnChainTransaction.fees: BigNumber` (`src/transaction.mts`) and several oracles that construct `Price`.

### 1) Use “least resistance” = migrate boundary producers first, but keep compilation green

- `Amount.valueAt(price)` is the critical type-level dependency: it constructs `new Value(price.fiatCurrency, this.value.mul(price.rate))`.
- Therefore, the migration order is “producers first” and we must avoid exposing representation/scale mismatches to parts of the codebase we are not compiling/testing yet.

We will avoid adapter proliferation and instead rely on constrained compilation via `tsconfig.migration.json`:

- During each class step, compile and test only a limited slice that includes:
  - the migrated class
  - the minimal dependent modules needed for TypeScript to typecheck that slice
  - the relevant spec files
- After each successful step, progressively enrich `tsconfig.migration.json` by adding more `src` files as we progress, so regressions are caught earlier without requiring the whole project to compile at every intermediate stage.

### 2) Test execution + pinning

Based on your choices:

- Test runner approach: “mocha-direct” (Mocha directly; always run against emitted JS under `build-migration/`).
- Pinning strategy: “git-sha”, with additional micro-commits during work-in-progress to keep test runs quickly attributable.

So each class migration step will be:

- Micro-commits: commit right before each meaningful test run (often multiple times per step).
- If you need to bypass hook friction for rapid iteration, use `git commit --no-verify` (there is no `git commit -f`).
- Run a focused Mocha subset (grep/filter) and record:
  - `git rev-parse HEAD`
  - list of test files executed and the command line.

Note on “full” migration test runs:

- Some suites hit real upstream APIs and require environment variables:
  - `ETHERSCAN_API_KEY` is required by `Etherscan` and `GnosisScan` explorer tests.
  - `COINGECKO_API_KEY` is required by `CoinGecko` oracle tests.
  - If these env vars are not set, those suites fail in the “all tests” command
    even when the fixed-point migration changes are correct.

### 3) Commands to run during step 1/4 (what we’ll execute in Agent mode after you accept this plan)

Even though I haven’t executed them yet in this conversation, the standardized commands to use per class will be:

Compilation (baseline):

- `npx tsc -p tsconfig.migration.json`

Targeted tests (Mocha with explicit file globs):

- Full migration test suite (only when needed):
  - `npx mocha "build-migration/**/*.spec.mjs"`
- Focused “by file” run (example patterns):
  - `npx mocha "build-migration/test/**/price.spec.mjs"`
  - `npx mocha "build-migration/test/**/cryptoasset.spec.mjs"`
  - `npx mocha "build-migration/test/**/valuation.spec.mjs"`
- Focused by grep (when relevant):
  - `npx mocha "build-migration/test/**/valuation.spec.mjs" --grep "SnapshotValuation"`

(We’ll pick the exact grep strings based on what each spec covers.)

### 4) Isolation when compilation breaks mid-migration

To keep confidence high when partial compilation is broken, we avoid making the whole project compile at every intermediate stage.

- Primary isolation method: step-first `tsconfig.migration.json`
  - Start with a `tsconfig.migration.json` that includes a minimal compilation root set for the current class (migrated `src` modules + the relevant `test` specs).
  - Compile using the required command:
    - `tsc -p tsconfig.migration.json`
    - or `npx tsc -p tsconfig.migration.json`
  - Run Mocha against the emitted JS from that compilation.
  - Then, after each successful step, progressively enrich `tsconfig.migration.json` by adding more `src` files (keeping the migration logic stable), so compilation coverage increases steadily without adapter proliferation.
- Fallback (rare): explicit file compilation
  - Only used if `tsconfig.migration.json` cannot be shaped well enough for the step.

We will always:

- Commit per class step (git-sha pinning), with micro-commits during the step.
- Record whether compilation was minimal or enriched (based on how many roots are currently included in `tsconfig.migration.json`).

## DAG-based processing order (least friction)

Edges derived from code usage:

- `Price` -> `Amount` via `Amount.valueAt(price)` uses `this.value.mul(price.rate)`.
- `Amount` -> `Value` via `new Value(..., computed)`.
- `Value` -> `Valuation` via `plus/minus/scaledBy/relativeTo`.
- `Oracles` -> `Price` via `oracle` implementations constructing/setting `Price` values.
- `Quantity` is a global contract that both `Amount` and `Value` implement.
- `Transaction fees` depends only on `BigNumber` today (but it still impacts compile/test once we remove BigNumber arithmetic API expectations).

Mermaid summary:

```mermaid
graph TD
  P[Price] --> A[Amount]
  A[Amount] --> V[Value]
  V[Value] --> VI[Valuation pipeline]
  P[Price] --> O[Oracles]
  VI[Valuation pipeline] --> R[Report/Display callers]
  A[Amount] --> T[Transaction fees]
  Q[Quantity interface] --> A
  Q[Quantity interface] --> V
```

### Processing order (proposed)

We’ll migrate in this order to minimize representation mismatch churn:

1. `Price` (`src/price.mts`)
2. `Value` (`src/valuation.mts` class `Value`)
3. `Amount` (`src/cryptoasset.mts` class `Amount`)
4. `Quantity` contract (`src/quantity.mts`)
5. `Valuation pipeline` (`src/valuation.mts` classes: `PointInTimeValuation`, `SnapshotValuation`, `PortfolioValuation`)
6. `Oracles` (`src/services/oracles/*`: `ohlcoracle`, `datasourceoracle`, `realtokenoracle`)
7. `OnChainTransaction.fees` (`src/transaction.mts`)
8. Optional final cleanup: `displayable` BigNumber-specific formatting path (`src/displayable.mts`)

## Per-class migration methodology (4 steps each) [mirrors frontmatter TODOs]

Below, “tests” means Mocha specs that touch the class directly.

### 1) Migrate `Price` (`src/price.mts`)

**Step 1: Check test coverage + verify passing (current baseline)**

- Run: the full migration suite `npx mocha "build-migration/**/*.spec.mjs"` (when needed) OR the focused subset:
  - `npx mocha "build-migration/test/**/price.spec.mjs"`
- Record git SHA: `git rev-parse HEAD`.

**Step 2: Rationalize implementation**

- Document what `Fixed` represents for the rate and how scale is chosen.
- Identify impacted methods:
  - constructor (currently `rate = BigNumber.from(rate)`)
  - `to()` and `mul()`

**Step 3: Migrate BigNumber -> Fixed**

- Change `Price.rate` type to `Fixed`.
- Ensure the constructor still accepts `BigNumberSource` (for low churn), converting internally to `Fixed`.
- Ensure `Price.mul()` can multiply by either the old scalar representation or convert.
- Ensure `tsconfig.migration.json` roots for this step include the complete `Price` -> `Amount` -> `Value` call chain that the spec exercises (so TypeScript sees consistent representations).

**Step 4: Re-run tests**

- Run focused:
  - `npx mocha "build-migration/test/**/price.spec.mjs"`
- Run also any directly adjacent suites likely to be affected:
  - `npx mocha "build-migration/test/**/cryptoasset.spec.mjs"`
  - `npx mocha "build-migration/test/**/valuation.spec.mjs"` (because it calls `amount.valueAt(price)`)

### 2) Migrate `Value` (`src/valuation.mts` class `Value`)

**Step 1:**

- Run focused:
  - `npx mocha "build-migration/test/**/valuation.spec.mjs"`.

**Step 2:**

- Rationalize `plus/minus/scaledBy/relativeTo/negated` semantics and how they map to `Fixed` behavior (scale consistency, truncation rules).

**Step 3:**

- Change `Value.value: Fixed`.
- Update `Value.from()` and `scaledBy/relativeTo` to accept the transitional source types needed for this step (until all callers are migrated to `Fixed`).
- Ensure `tsconfig.migration.json` roots for this step cover the `Amount.valueAt(price)` call chain exercised by `valuation.spec`.

**Step 4:**

- Re-run `valuation.spec` and any dependent suite(s) (`cryptoasset.spec`).

### 3) Migrate `Amount` (`src/cryptoasset.mts` class `Amount`)

**Step 1:**

- Run focused:
  - `npx mocha "build-migration/test/**/cryptoasset.spec.mjs"`.

**Step 2:**

- Rationalize:
  - `valueAt(price)` is the main method impacted because it bridges crypto amounts to fiat `Value`.
  - `relativeTo()` and `scaledBy()` mapping to `Fixed`.

**Step 3:**

- Change `Amount.value: Fixed`.
- Update arithmetic accordingly.
- Update `valueAt(price)` so it multiplies `Amount.value` with `Price.rate` in the correct fixed-point domain.

**Step 4:**

- Re-run:
  - `cryptoasset.spec`
  - `valuation.spec` (since it heavily uses `valueAt`)

### 4) Migrate `Quantity` contract (`src/quantity.mts`)

**Step 1:**

- Run all value-contract tests that compile against `Quantity`:
  - `valuation.spec`
  - `cryptoasset.spec`
  - (and any tests using `testQuantityInterface`)

**Step 2:**

- Rationalize the interface so it reflects fixed-point arithmetic intent.
- Identify impacted methods:
  - `scaledBy(factor)` and `relativeTo(base)` return types.

**Step 3:**

- Change `Quantity.value` type and signatures to use `Fixed` and `FixedSource`.
- Update `Amount` and `Value` to satisfy the new interface.
- Update or adjust tests’ quantity factory helper to generate the right numeric representation.

**Step 4:**

- Re-run:
  - `cryptoasset.spec`
  - `valuation.spec`
  - any other suites that import `Quantity`.

### 5) Migrate the `Valuation pipeline` (same file `src/valuation.mts`, classes after `Value`)

**Step 1:**

- Run `valuation.spec`.

**Step 2:**

- Rationalize the places where ratios are computed:
  - specifically the `share = cachOut.relativeTo(start.totalCryptoValue)` then `cashIn.scaledBy(share)`.
- Document fixed-point truncation/scale consistency expectations here because this is where rounding differences will surface first.

**Step 3:**

- Update all internal storage fields and calculations to use fixed-point `Value` operations (now already migrated).
- Fix any compile errors from lingering BigNumber usage in the pipeline.

**Step 4:**

- Re-run `valuation.spec` and any snapshot-related tests.

### 6) Migrate `Oracles` (`src/services/oracles/ohlcoracle.mts`, `datasourceoracle.mts`, `realtokenoracle.mts`)

**Step 1:**

- Run:
  - `npx mocha "build-migration/test/**/services/oracles/ohlcoracle.spec.mjs"`
  - `npx mocha "build-migration/test/**/services/oracles/datasourceoracle.spec.mjs"`
  - `npx mocha "build-migration/test/**/services/realtoken/realtokenoracle.spec.mjs"`

**Step 2:**

- Rationalize the numeric boundary:
  - Oracles currently compute rates using `BigNumber` (e.g. `BigNumber.sum(...).div(3)` and `BigNumber.from(value)`).
- Decide: do oracles keep using `BigNumber` internally and convert into `Price` at the boundary, or do they switch to fixed arithmetic entirely.
- Least resistance is usually: keep oracle computations as-is, convert into `Price` constructor (so oracles still depend on `BigNumber` only as an input type).

**Step 3:**

- Update oracle generics/types if required by `Price.rate` having moved to `Fixed`.
- Ensure any `price.rate.toFixed(4)` assertions are updated to match fixed’s `toFixed(digits)` behavior if needed.

**Step 4:**

- Re-run oracle test suites and `valuation.spec` (because valuation uses `PriceResolver`).

### 7) Migrate `OnChainTransaction.fees` (`src/transaction.mts`)

**Step 1:**

- Run:
  - `npx mocha "build-migration/test/**/transaction.spec.mjs"`

**Step 2:**

- Rationalize `fees` numeric semantics:
  - currently: `fees = BigNumber.fromInteger(gasPrice).mul(gasUsed).div(BigNumber.E18)`.
- Document the fixed-point scaling equivalent.

**Step 3:**

- Change `fees` to the fixed-point representation chosen for native-currency amounts.
- Update conversions so runtime formatting/display keeps working.

**Step 4:**

- Re-run `transaction.spec` and any CSV/export tests that touch transactions.

### 8) Optional final cleanup: `displayable` BigNumber path (`src/displayable.mts`)

**Step 1:**

- Run `displayable.spec`.

**Step 2:**

- Rationalize: decide whether to remove the `BigNumber` branch from formatting now that value classes should be on `Fixed`.

**Step 3:**

- Remove/adjust BigNumber-specific formatting, keeping `Fixed` rendering as the canonical path.

**Step 4:**

- Enrich `tsconfig.migration.json` to full inputs, run `npx tsc -p tsconfig.migration.json`, then run the full migration suite `npx mocha "build-migration/**/*.spec.mjs"`.
