#!/bin/bash

set -e
ARGS=("$@" "apikey=${GNOSISSCAN_API_KEY}")
BASE="https://api.gnosisscan.io/api"

QPARAMS="$(IFS='&'; echo "${ARGS[*]}")"
curl -sS "${BASE}?${QPARAMS}" | jq
