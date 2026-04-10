# Fixtures Directory

This directory contains test data used by the project's test suite to validate functionality against real or realistic data samples.

## Contents

- `fake-report.csv`: A realistic transaction report used to test the CSV parser functionality
- `Binance/`: Contains data and API response samples from the Binance centralized exchange
- `Curve/`: Contains data and API response samples from the curve.finance project

- `./usdc-usd-max.csv`: USDC-USD OHLCV price data from Yahoo Finance (2018-10-08 to 2026-04-04 descending).
- `./dai-usd-max.csv`: DAI-USD OHLCV price data from Yahoo Finance (2021-03-01 to 2026-03-04 descending).
- `./xdai-usd-max.csv`: alias for `./dai-usd-max.csv`.
- `./sol-eur-max.csv`: SOL-EUR average price data (2020-04-11 to 2025-01-20 ascending).
- `./sol-gbp-max.csv`: SOL-GBP average price data (2020-04-11 to 2025-01-20 ascending).
- `./sol-usd-max.csv`: SOL-USD average price data (2020-04-11 to 2025-01-17 ascending).

- `./ERC20TokenTransferEvents.json`: GnosisScan-style ERC-20 token transfer (`tokentx`) API response sample (2021-02-21 to 2021-11-08).
- `./InternalTransactions.json`: GnosisScan-style internal transaction (`txlistinternal`) API response sample (2021-03-12 to 2024-11-10).
- `./GnosisScan/NormalTransactions.json`: GnosisScan-style normal transaction (`txlist`) API response sample (2021-03-03 to 2022-05-30`).

These fixtures enable comprehensive testing of the application's ability to handle real-world data formats and API responses, as well as powering mock API implementations for testing higher-level functionalities.
