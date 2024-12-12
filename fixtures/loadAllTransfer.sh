#!/bin/bash

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

set -v
curl -sS "$ERC20TokenTransferEvents" | jq > ERC20TokenTransferEvents.json
curl -sS "$InternalTransactions" | jq > InternalTransactions.json
curl -sS "$NormalTransactions" | jq > NormalTransactions.json
