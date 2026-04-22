#!/usr/bin/awk -f

# Generate a sample trasanction file from a real one obtained at
# https://www.binance.com/en/my/download-center?type=asset-transaction-history
#
# The 2025 heading is:
# User ID,Time,Account,Operation,Coin,Change,Remark
#
# Usage:
# awk -f tools/binance-transactions.awk < binance-transactions.csv > fixtures/Binance/binance-transactions-2.csv

BEGIN {
    FS=",";
    OFS=",";
}

NR == 1 {
    print;next;
}

NR == 2 {
    PREV_TIME = $2;
}

{
    if (NR > 1) {
      $1 = "9c0c1..03"
      CACHE_TIME = $2;
    }
    if (CACHE_TIME && ++COUNT[$4] < 5) {
        gsub(/ - .*/, "Wallet", $7);
        $2 = PREV_TIME;
        print $0;
    }
    PREV_TIME = CACHE_TIME;
}
