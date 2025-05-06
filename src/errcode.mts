// prettier-ignore
export const ERRORS = {
  __proto__: null,

  "C1001": "Download retry", // first info
  "C1002": "Find price data",
  "C2001": "Ignore an asset because of missing data", // first warning
  "C2002": "Fail to download",
  "C2003": "Inconsistent data",
  "C2004": "Unknown filter",
  "C2005": undefined,
  "C3001": "Report missing data", // first error
  "C3003": "Inconsistent precision",
  "C3004": "Duplicate data",
  "C3005": "Cannot open database",
  "C3006": "Unknown well-known crypto-asset",
  "C9999": "Report generic tracing information",
} as const;

export type ErrorCode = keyof typeof ERRORS;
