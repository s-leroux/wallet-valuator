# Binance Reports

This directory contains sample transaction reports from Binance.

## Contents

- `binance-transactions.csv`: Legacy transaction report from Binance.
  Generation details are missing. As of April 2026, this file format is considered deprecated.
- `binance-transactions-2.csv`: A sample transaction report from Binance.
  Generated from a real transaction report obtained in April 2026 at
  https://www.binance.com/en/my/download-center?type=asset-transaction-history
  using the following command:
  ```bash
  awk -f tools/binance-transactions.awk < binance-transactions.csv > fixtures/Binance/binance-transactions-2.csv
  ```
