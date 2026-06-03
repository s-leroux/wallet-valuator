export const PACKAGE_NAME = "wallet-valuator" as const;
export const PACKAGE_VERSION = "2.1.0" as const;

export const PACKAGE_CHANGELOG = {
  __proto__: null,

  "2.1.0": {
    features: [
      "Many fixes to the Binance v2 report parser",
      "More well-known crypto assets",
      "Alternate text output and CSV formatting",
    ],
  },
  "2.0.0": {
    features: ["Introduce versioning information"],
  },

  "1.x.x": {
    features: ["2025 development version"],
  },
} as const;
