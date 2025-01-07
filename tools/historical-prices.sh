#!/bin/bash

DATE="$1"

for currency in ethereum bitcoin usd-coin realtoken-ecosystem-governance solana binancecoin; do
  FNAME="./tmp/${DATE}-${currency}.json"
  while ! ./tools/coingecko.sh "v3/coins/${currency}/history" date="${DATE}" localization=false > cg.json; do
    echo Sleeping
    sleep 15;
  done
  jq < cg.json > "${FNAME}"
done
