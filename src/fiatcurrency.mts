import { logger } from "./debug.mjs";
import { ValueError } from "./error.mjs";
import { InstanceCache } from "./instancecache.mjs";

const log = logger("fiatcurrency");

/**
 * Value object representing a fiat currency in ISO 4217 format.
 * Instances are cached and identity-comparable.
 */
export interface FiatCurrency {
  /** The ISO 4217 fiat currency code in uppercase (e.g., "USD", "EUR") */
  readonly code: string;
}

/**
 * Standard implementation of the FiatCurrency interface.
 * Instances are created through the FiatCurrency factory function
 * and are cached for identity comparison.
 *
 * @internal
 */
class StandardFiatCurrency {
  constructor(readonly code: string) {}

  /**
   * Returns the currency code in uppercase.
   * @returns The ISO 4217 currency code
   */
  toString(): string {
    return this.code;
  }

  /**
   * Returns the currency code in uppercase.
   * @returns The ISO 4217 currency code
   */
  valueOf(): string {
    return this.code;
  }
}

// Cache for FiatCurrency instances
const currencyCache = new InstanceCache<string, FiatCurrency>();

/**
 * Creates or retrieves a FiatCurrency instance for the given currency code.
 * The currency code is case-insensitive and must be a valid ISO 4217 trigram.
 * Instances are cached and comparable by identity.
 *
 * @param currency - The currency code (e.g., "USD", "eur")
 * @returns A FiatCurrency instance
 * @throws ValueError if the currency code is invalid
 * @example
 * const usd = FiatCurrency("USD");
 * const eur = FiatCurrency("eur"); // Case-insensitive
 * assert(usd === FiatCurrency("USD")); // Identity comparison
 */
export function FiatCurrency(currency: string): FiatCurrency {
  const normalizedCode = currency.toUpperCase();
  return currencyCache.getOrCreate(normalizedCode, () => {
    // Extra validation
    if (currency.length !== 3 || currency !== currency.toUpperCase()) {
      const error = new ValueError(
        `Currency codes should contain exactly 3 upper-case letters: "${currency}" is invalid.`
      );
      log.error("C3015", error);
      throw error;
    }
    return new StandardFiatCurrency(normalizedCode);
  });
}
