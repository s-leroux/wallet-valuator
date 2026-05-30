# Binance Reports

This directory contains sample transaction reports from Binance.

## Contents

- `binance-report-v1-sample.csv`: Sample **v1** (legacy) transaction report from Binance.
  Column layout: `ID,Date,Type,Label,Sent Amount,...`
  As of April 2026, this format is considered deprecated.
- `binance-report-v2-sample.csv`: Sample **v2** transaction report from Binance.
  Column layout: `User ID,Time,Account,Operation,Coin,Change,Remark`
  Generated from a real transaction report obtained in April 2026 at
  https://www.binance.com/en/my/download-center?type=asset-transaction-history
  using the following command:
  ```bash
  awk -f tools/binance-transactions.awk < binance-transactions.csv > fixtures/Binance/binance-report-v2-sample.csv
  ```
