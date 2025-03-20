#!/bin/bash

# Use the first argument as GNOSIS_ACCOUNT, or fallback to the environment variable
GNOSIS_ACCOUNT="${1:-$GNOSIS_ACCOUNT}"

# Ensure GNOSIS_ACCOUNT is set
if [[ -z "$GNOSIS_ACCOUNT" ]]; then
    echo "Error: GNOSIS_ACCOUNT is not set. Provide it as an argument or set the environment variable."
    exit 1
fi

# Ensure GNOSISSCAN_API_KEY is set
if [[ -z "$GNOSISSCAN_API_KEY" ]]; then
    echo "Error: GNOSISSCAN_API_KEY is not set."
    exit 1
fi

# Construct URLs
ERC20TokenTransferEvents=$(tr -d ' \n\r' <<<"
https://api.gnosisscan.io/api
   ?module=account
   &action=tokentx
   &address=${GNOSIS_ACCOUNT}
   &page=1
   &offset=300
   &startblock=0
   &endblock=99999999
   &sort=asc
   &apikey=${GNOSISSCAN_API_KEY}
")

InternalTransactions=$(tr -d ' \n\r' <<<"
https://api.gnosisscan.io/api
   ?module=account
   &action=txlistinternal
   &address=${GNOSIS_ACCOUNT}
   &startblock=0
   &endblock=99999999
   &page=1
   &offset=300
   &sort=asc
   &apikey=${GNOSISSCAN_API_KEY}
")

NormalTransactions=$(tr -d ' \n\r' <<<"
https://api.gnosisscan.io/api
   ?module=account
   &action=txlist
   &address=${GNOSIS_ACCOUNT}
   &startblock=0
   &endblock=99999999
   &page=1
   &offset=300
   &sort=asc
   &apikey=${GNOSISSCAN_API_KEY}
")

# Enable verbose mode for debugging
set -v

# Fetch data and save as JSON
mkdir -p "${GNOSIS_ACCOUNT}"
curl -sS "$ERC20TokenTransferEvents" | jq > "${GNOSIS_ACCOUNT}"/ERC20TokenTransferEvents.json
curl -sS "$InternalTransactions" | jq > "${GNOSIS_ACCOUNT}"/InternalTransactions.json
curl -sS "$NormalTransactions" | jq > "${GNOSIS_ACCOUNT}"/NormalTransactions.json
