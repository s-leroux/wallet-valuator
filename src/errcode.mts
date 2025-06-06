// prettier-ignore
export const ERRORS = {
  __proto__: null,

  // Info- and trace-level codes (1000-1999)
  "C1001": "Download retry",
  "C1002": "Retrieved price data from CoinGecko",
  "C1003": "Caching database update",
  "C1004": "Retrieved price data from DefiLlama",
  "C1005": "Switching from binary to linear search",
  "C1006": "Trace CompositeOracle.getPrice",
  "C1007": "Cache miss (CachingOracle)",
  "C1008": "Trace CoinGecko.getPrice retrying at another date",
  "C1009": "Trace CoinGecko http errors",
  "C1010": "Cache update (CachingOracle)",
  "C1011": "Not found (OHLCOracle)",
  "C1012": "Found (OHLCOracle)",
  "C1013": "Need fiat convertion to synthetise some prices (PriceResolver)",
  "C1014": "Synthetize a price (ImplicitFiatconverter)",
  "C1015": "Unable to format and no fallback (noDisplayString)",
  "C1016": "Pool not found (CurveResolver)",
  "C1017": "An error was thrown while fetching URL (provider)",

  // Warning-level codes (2000-2999)
  "C2001": "Ignore an asset because of missing data",
  "C2002": "Fail to download",
  "C2003": "Inconsistent data",
  "C2004": "Unknown filter",
  "C2005": undefined,

  // Error-level codes (3000-3999)
  "C3001": "Report missing data",
  "C3003": "Inconsistent precision",
  "C3004": "Duplicate data",
  "C3005": "Cannot open database",
  "C3006": "Unknown well-known crypto-asset",
  "C3007": "Metadata already initialized for a cryptocurrency",
  "C3008": "A transaction cannot be CASH-IN and CASH-OUT at the same time",
  "C3009": "Cannot identify the database version",
  "C3010": "Unknown transaction type",
  "C3011": "Unknown crypto-asset",
  "C3012": "Base price missing (PriceResolver)",
  "C3013": "Broken invariant (InstanceCache)",
  "C3014": "Key not found (memoizer)",

  // Debug-level codes (9000-9999)
  "C9999": "Generic debug information",
} as const;

export type ErrorCode = keyof typeof ERRORS;
