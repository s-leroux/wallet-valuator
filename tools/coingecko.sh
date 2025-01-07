#!/bin/bash

set -e
set -o pipefail

ENDPOINT="$1"; shift
ARGS=("$@")
BASE="https://api.coingecko.com/api/"

QPARAMS="$(IFS='&'; echo "${ARGS[*]}")"
curl -sS "${BASE}${ENDPOINT}?${QPARAMS}" \
  --header "x-cg-demo-api-key:   ${COINGECKO_API_KEY}" \
  | jq
